import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "node:crypto";
import { PaymentStatus, UserRole } from "@prisma/client";
import type { FastifyRequest } from "fastify";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import {
  getStripeClient,
  isStripeConfigured,
} from "../../lib/stripe/client.js";
import { absoluteSiteUrl } from "../../lib/email/send-email.js";
import {
  sendManualBookingEmail,
} from "../../lib/email/templates.js";
import { issuePasswordResetToken } from "../auth/auth.service.js";
import { recordAudit } from "../audit/audit.service.js";
import { normalizeDbError } from "../shared/db-errors.js";

/**
 * Admin walk-in / phone-in booking pipeline. Single entry point that:
 *   1. Upserts a patient User + PatientProfile by email (existing
 *      helper handles dedup; we then overwrite the random placeholder
 *      hash with a freshly-generated temporary password).
 *   2. Generates a unique temp password (16 chars, URL-safe base64),
 *      bcrypt-hashes it cost 12, sets `User.mustChangePassword = true`
 *      so the login flow force-redirects on first sign-in.
 *   3. Issues a 7-day invite-style password-reset token (reuses
 *      `issuePasswordResetToken({isInvite:true})`) so the patient can
 *      skip the temp password entirely if they prefer.
 *   4. Creates an Appointment row with `manualEntry: true`.
 *   5. Creates a Stripe Checkout Session for the consultation fee.
 *      Skips silently when Stripe isn't configured — admin can still
 *      use this route to create the appointment + portal account.
 *   6. Sends one email with BOTH CTAs (payment + portal access).
 *   7. Writes APPOINTMENT_CREATED audit row with the admin id +
 *      newPatientUserId metadata.
 *
 * Returns enough data for the admin UI to render a recovery banner if
 * the patient claims the email never arrived.
 */

export class ServicePriceMissingError extends Error {
  constructor() {
    super("Service has no price configured. Set a base price before creating manual bookings.");
    this.name = "ServicePriceMissingError";
  }
}

export class ServiceNotFoundError extends Error {
  constructor() {
    super("Service not found or inactive for the chosen country.");
    this.name = "ServiceNotFoundError";
  }
}

export class DoctorNotFoundError extends Error {
  constructor() {
    super("Doctor not found.");
    this.name = "DoctorNotFoundError";
  }
}

export type CreateManualBookingInput = {
  /** Admin user id — recorded in audit metadata + as the row author.
   *  Null when the caller authenticated via ADMIN_API_TOKEN (no User
   *  row to attribute the action to); audit row still records the
   *  IP + role for traceability. */
  adminUserId: string | null;
  patient: {
    email: string;
    fullName: string;
    phone?: string | null;
    dateOfBirth?: string | null;
    nationalIdNumber?: string | null;
    taxIdNumber?: string | null;
    passportNumber?: string | null;
    addressLine1?: string | null;
    addressCity?: string | null;
    addressCountryCode?: string | null;
  };
  serviceId: string;
  doctorId?: string | null;
  /** ISO datetime string, or omit to leave the slot un-scheduled. */
  scheduledAt?: string | null;
  consultationMode: "ONLINE" | "IN_PERSON";
  clinicId?: string | null;
  locationAddress?: string | null;
  notes?: string | null;
  countryCode: string;
  /** Path to land the patient back on after Stripe success (e.g.
   *  `/ireland/en`). Cancel URL is built off the same base. */
  returnTo?: string;
  /** Caller request — forwarded to recordAudit so the IP lands in the
   *  AuditLog row. */
  request?: FastifyRequest;
};

export type CreateManualBookingResult = {
  appointmentId: string;
  patientUserId: string;
  paymentUrl: string | null;
  paymentSessionId: string | null;
  tempPassword: string;
  setPasswordUrl: string;
  emailQueued: boolean;
};

function generateTempPassword(): string {
  // 12 bytes → 16-char base64url. Plenty of entropy; short enough to
  // copy/paste by hand if the patient asks.
  return randomBytes(12).toString("base64url");
}

export async function createManualBooking(
  input: CreateManualBookingInput,
): Promise<CreateManualBookingResult> {
  const email = input.patient.email.trim().toLowerCase();
  const fullName = input.patient.fullName.trim();
  if (!email || !fullName) {
    throw new Error("Patient email + full name are required");
  }

  // Validate service + doctor up-front so we fail fast before mutating.
  const service = await prisma.service.findFirst({
    where: {
      id: input.serviceId,
      isActive: true,
      country: { code: input.countryCode.toLowerCase(), isActive: true },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      basePriceCents: true,
      currencyCode: true,
    },
  });
  if (!service) {
    throw new ServiceNotFoundError();
  }
  const amountCents = service.basePriceCents;
  if (amountCents == null || amountCents <= 0) {
    throw new ServicePriceMissingError();
  }

  let doctorName: string | null = null;
  if (input.doctorId) {
    const doc = await prisma.doctor.findUnique({
      where: { id: input.doctorId },
      select: { fullName: true, title: true },
    });
    if (!doc) throw new DoctorNotFoundError();
    doctorName =
      [doc.title, doc.fullName].filter(Boolean).join(" ").trim() || doc.fullName;
  }

  // 1) Upsert patient User + PatientProfile via the existing helper.
  // We don't `import` upsertPatientProfileByEmail directly because we
  // need finer control over the password hash on the User row — so we
  // inline a tighter version here that yields the user id for step 2.
  let userId: string;
  try {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true },
    });
    if (existing) {
      if (existing.role !== UserRole.PATIENT) {
        throw new Error(
          "An account with that email already exists with a non-patient role",
        );
      }
      userId = existing.id;
    } else {
      // Create with a throwaway placeholder; we overwrite below.
      const placeholder = await bcrypt.hash(
        randomBytes(32).toString("hex"),
        12,
      );
      const dob =
        input.patient.dateOfBirth && input.patient.dateOfBirth.length > 0
          ? new Date(`${input.patient.dateOfBirth.slice(0, 10)}T00:00:00.000Z`)
          : null;
      const created = await prisma.user.create({
        data: {
          email,
          fullName,
          phone: input.patient.phone?.trim() || null,
          dateOfBirth: dob,
          role: UserRole.PATIENT,
          passwordHash: placeholder,
          mustChangePassword: true,
        },
        select: { id: true },
      });
      userId = created.id;
    }
  } catch (error) {
    throw normalizeDbError(error, "Could not create patient account");
  }

  // 2) Generate temp password + overwrite the placeholder.
  const tempPassword = generateTempPassword();
  const tempHash = await bcrypt.hash(tempPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: tempHash,
      mustChangePassword: true,
      // Surface the admin-supplied fullName / phone / DOB in case the
      // user existed already without them.
      fullName,
      ...(input.patient.phone !== undefined
        ? { phone: input.patient.phone?.trim() || null }
        : {}),
    },
  });

  // Sync the patient profile + identity fields.
  try {
    await prisma.patientProfile.upsert({
      where: { email },
      create: {
        email,
        userId,
        fullName,
        phone: input.patient.phone?.trim() || null,
        dateOfBirth:
          input.patient.dateOfBirth && input.patient.dateOfBirth.length > 0
            ? new Date(`${input.patient.dateOfBirth.slice(0, 10)}T00:00:00.000Z`)
            : null,
        nationalIdNumber: input.patient.nationalIdNumber?.trim() || null,
        taxIdNumber: input.patient.taxIdNumber?.trim() || null,
        passportNumber: input.patient.passportNumber?.trim() || null,
        addressLine1: input.patient.addressLine1?.trim() || null,
        addressCity: input.patient.addressCity?.trim() || null,
        addressCountryCode:
          input.patient.addressCountryCode?.trim().toLowerCase() || null,
      },
      update: {
        userId,
        fullName,
        ...(input.patient.phone !== undefined
          ? { phone: input.patient.phone?.trim() || null }
          : {}),
        ...(input.patient.nationalIdNumber !== undefined
          ? { nationalIdNumber: input.patient.nationalIdNumber?.trim() || null }
          : {}),
        ...(input.patient.taxIdNumber !== undefined
          ? { taxIdNumber: input.patient.taxIdNumber?.trim() || null }
          : {}),
        ...(input.patient.passportNumber !== undefined
          ? { passportNumber: input.patient.passportNumber?.trim() || null }
          : {}),
        ...(input.patient.addressLine1 !== undefined
          ? { addressLine1: input.patient.addressLine1?.trim() || null }
          : {}),
        ...(input.patient.addressCity !== undefined
          ? { addressCity: input.patient.addressCity?.trim() || null }
          : {}),
        ...(input.patient.addressCountryCode !== undefined
          ? {
              addressCountryCode:
                input.patient.addressCountryCode?.trim().toLowerCase() || null,
            }
          : {}),
      },
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not save patient profile");
  }

  // 3) Issue invite-style set-password token (7-day TTL, auto-signs in).
  const inviteToken = await issuePasswordResetToken(userId, {
    ttlMinutes: 7 * 24 * 60,
    isInvite: true,
  });
  const setPasswordUrl = absoluteSiteUrl(
    `/reset-password?token=${encodeURIComponent(inviteToken)}&invite=1`,
  );

  // 4) Create appointment row.
  const appointmentId = randomUUID();
  const scheduledAt =
    input.scheduledAt && input.scheduledAt.length > 0
      ? new Date(input.scheduledAt)
      : null;
  // For IN_PERSON we need at least a clinic OR a location address — same
  // guard the admin schedule route uses.
  if (input.consultationMode === "IN_PERSON") {
    if (!input.clinicId && !input.locationAddress?.trim()) {
      throw new Error(
        "In-person appointments need a clinic or a location address.",
      );
    }
  }
  try {
    await prisma.appointment.create({
      data: {
        id: appointmentId,
        userId,
        countryCode: input.countryCode,
        consultationType: service.name,
        fullName,
        email,
        phone: input.patient.phone?.trim() || null,
        dateOfBirth:
          input.patient.dateOfBirth && input.patient.dateOfBirth.length > 0
            ? new Date(`${input.patient.dateOfBirth.slice(0, 10)}T00:00:00.000Z`)
            : null,
        notes: input.notes?.trim() || null,
        consentAccepted: true,
        status: "REQUEST_RECEIVED",
        serviceId: service.id,
        doctorId: input.doctorId || null,
        scheduledAt,
        consultationMode: input.consultationMode,
        clinicId: input.consultationMode === "IN_PERSON" ? input.clinicId || null : null,
        locationAddress:
          input.consultationMode === "IN_PERSON"
            ? input.locationAddress?.trim() || null
            : null,
        amountCents,
        currencyCode: service.currencyCode,
        paymentStatus: PaymentStatus.UNPAID,
        manualEntry: true,
      },
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not create manual appointment");
  }

  // 5) Stripe Checkout — best-effort. If Stripe isn't configured we
  // still create the appointment + portal account and the email; admin
  // can manually invoice in that case.
  let paymentUrl: string | null = null;
  let paymentSessionId: string | null = null;
  if (isStripeConfigured()) {
    try {
      const stripe = getStripeClient();
      const baseUrl =
        env.PUBLIC_SITE_URL?.replace(/\/+$/, "") ?? "http://localhost:3000";
      const returnBase = input.returnTo ?? "/account/bookings";
      const successUrl = `${baseUrl}${returnBase}?booking=${appointmentId}&payment=ok`;
      const cancelUrl = `${baseUrl}${returnBase}?booking=${appointmentId}&payment=cancelled`;
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        customer_email: email,
        client_reference_id: appointmentId,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: (service.currencyCode ?? "EUR").toLowerCase(),
              unit_amount: amountCents,
              product_data: {
                name: service.name,
                description: input.notes?.slice(0, 280) ?? undefined,
              },
            },
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          appointmentId,
          countryCode: input.countryCode,
          source: "admin_manual",
        },
      });
      paymentUrl = session.url ?? null;
      paymentSessionId = session.id ?? null;
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          stripeSessionId: paymentSessionId,
          paymentStatus: PaymentStatus.PENDING,
        },
      });
    } catch (err) {
      // Don't roll back the whole booking — admin sees this as "no
      // payment URL was created; create manually" in the response.
      console.warn("[manual-booking] Stripe session creation failed", err);
    }
  }

  // 6) Email — fire and forget; failure logs but doesn't roll back.
  let emailQueued = false;
  try {
    await sendManualBookingEmail({
      to: email,
      patientName: fullName,
      doctorName,
      serviceName: service.name,
      scheduledAt,
      paymentUrl: paymentUrl ?? absoluteSiteUrl(`/account/bookings`),
      setPasswordUrl,
      tempPassword,
    });
    emailQueued = true;
  } catch (err) {
    console.warn("[manual-booking] email send failed", err);
  }

  // 7) Audit.
  recordAudit({
    actorUserId: input.adminUserId ?? null,
    actorRole: "ADMIN",
    action: "APPOINTMENT_CREATED",
    entityType: "Appointment",
    entityId: appointmentId,
    metadata: {
      source: "admin_manual",
      // Surface whether this was a session-cookie admin or a
      // token-fallback admin so audit readers can tell them apart
      // even when actorUserId is null.
      adminAuth: input.adminUserId ? "session" : "token",
      newPatientUserId: userId,
      serviceId: service.id,
      doctorId: input.doctorId ?? null,
      consultationMode: input.consultationMode,
      stripeSessionId: paymentSessionId,
    },
    request: input.request,
  }).catch(() => {});

  return {
    appointmentId,
    patientUserId: userId,
    paymentUrl,
    paymentSessionId,
    tempPassword,
    setPasswordUrl,
    emailQueued,
  };
}
