import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "node:crypto";
import { CartItemKind, PaymentStatus, ServiceKind } from "@prisma/client";
import type { FastifyRequest } from "fastify";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import {
  getStripeClient,
  isStripeConfigured,
} from "../../lib/stripe/client.js";
import { absoluteSiteUrl } from "../../lib/email/send-email.js";
import { generateOrderNumber } from "../../lib/order-number.js";
import { buildPtStripeInvoiceData } from "../invoices/pt-stripe-invoice-data.js";
import { issuePasswordResetToken } from "../auth/auth.service.js";
import { recordAudit } from "../audit/audit.service.js";
import {
  applyPatientProfileUpdate,
  upsertPatientProfileByEmail,
} from "../patient-profile/patient-profile.service.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { resolveDoctorTimeZone } from "../doctor-availability/doctor-availability.service.js";
import {
  computeSlotPrice,
  getServicePeakConfig,
} from "../pricing/peak-pricing.service.js";
import { startPrePaymentFlow } from "../automation/pre-payment-flow.service.js";
import { persistOrderPortalAccess } from "../automation/resolve-order-portal-access.service.js";

/**
 * Admin walk-in / phone-in booking pipeline. The patient may or may
 * not already have a portal account:
 *   - NEW patient → we generate a 16-char URL-safe temp password,
 *     bcrypt-hash it cost 12, create the User with
 *     `mustChangePassword: true`, and return the plain temp password
 *     so the admin UI can read it back to the patient if email
 *     delivery is delayed.
 *   - EXISTING patient → we keep their password untouched (admin
 *     can't silently rotate a live login) but still issue a fresh
 *     7-day invite-style reset token so they have a one-click path
 *     in if they've forgotten their password.
 *
 * The Stripe Checkout Session is best-effort: failure doesn't roll back
 * the appointment — the admin UI surfaces the payment URL in a recovery
 * banner so the booking is recoverable by hand. Pre-payment automation
 * (WhatsApp, reservation email, reminders, cancellation) runs via Order.
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

/**
 * The doctor exists but is not bookable for the selected country —
 * either inactive, or not listed on that country's roster (neither the
 * primary `Doctor.countryId` nor an active `DoctorCountry` link). Raised
 * so the booking is rejected server-side even when the admin UI is
 * bypassed.
 */
export class DoctorNotAvailableInCountryError extends Error {
  constructor() {
    super(
      "Selected doctor is not active in the chosen country. Pick a doctor assigned to this country.",
    );
    this.name = "DoctorNotAvailableInCountryError";
  }
}

/**
 * The doctor is in the country but is not an active, approved provider
 * for the selected service (no active `ServiceDoctor` row with
 * status = 'active'). Mirrors the public consult flow's doctor filter.
 */
export class DoctorNotAssignedToServiceError extends Error {
  constructor() {
    super(
      "Selected doctor is not assigned to this service. Pick a doctor bookable for the chosen service.",
    );
    this.name = "DoctorNotAssignedToServiceError";
  }
}

/**
 * The chosen DoctorTimeSlot can't be claimed: it doesn't exist, belongs
 * to a different doctor, already in the past, or was taken (HELD/BOOKED)
 * by another booking between the picker loading and submit. Raised so the
 * admin re-picks an open slot instead of silently double-booking. Claimed
 * up-front, before any patient/order/email side-effect runs.
 */
export class SlotNotAvailableError extends Error {
  constructor() {
    super(
      "That time slot is no longer available. Refresh and pick another open slot.",
    );
    this.name = "SlotNotAvailableError";
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
  /** Required — the assigned doctor whose open slot is being booked. */
  doctorId: string;
  /** Required — id of the doctor's OPEN DoctorTimeSlot to claim. The
   *  appointment's scheduledAt is derived from the slot's startAt; the
   *  admin no longer types a free-text time. */
  timeSlotId: string;
  consultationMode: "ONLINE" | "IN_PERSON";
  clinicId?: string | null;
  locationAddress?: string | null;
  notes?: string | null;
  countryCode: string;
  /** Path to land the patient back on after Stripe success (e.g.
   *  `/ireland/en`). Cancel URL is built off the same base. */
  returnTo?: string;
  /** Caller request — forwarded to recordAudit so the IP lands in the
   *  AuditLog row, and used for structured logging. */
  request?: FastifyRequest;
};

export type CreateManualBookingResult = {
  appointmentId: string;
  orderId: string;
  patientUserId: string;
  paymentUrl: string | null;
  paymentSessionId: string | null;
  /** Plain temp password. Null when the patient already had an
   *  account — we don't rotate live credentials silently. */
  tempPassword: string | null;
  setPasswordUrl: string;
  emailQueued: boolean;
};

/** 12 bytes → 16-char base64url. Plenty of entropy + short enough to
 *  copy/paste by hand if the patient asks for it on the phone. */
function generateTempPassword(): string {
  return randomBytes(12).toString("base64url");
}

function parseDateOfBirth(raw: string | null | undefined): Date | null {
  if (!raw || raw.length === 0) return null;
  return new Date(`${raw.slice(0, 10)}T00:00:00.000Z`);
}

function consultationCartKind(serviceKind: ServiceKind): CartItemKind {
  return serviceKind === ServiceKind.SPECIALIST
    ? CartItemKind.SPECIALIST_CONSULTATION
    : CartItemKind.GENERAL_CONSULTATION;
}

export async function createManualBooking(
  input: CreateManualBookingInput,
): Promise<CreateManualBookingResult> {
  const email = input.patient.email.trim().toLowerCase();
  const fullName = input.patient.fullName.trim();
  if (!email || !fullName) {
    throw new Error("Patient email + full name are required");
  }
  if (!input.doctorId) {
    throw new DoctorNotFoundError();
  }
  if (!input.timeSlotId) {
    throw new SlotNotAvailableError();
  }

  const service = await prisma.service.findFirst({
    where: {
      id: input.serviceId,
      isActive: true,
      country: { code: input.countryCode.toLowerCase(), isActive: true },
    },
    select: {
      id: true,
      name: true,
      kind: true,
      basePriceCents: true,
      currencyCode: true,
      durationMinutes: true,
      countryId: true,
      country: {
        select: { bookingSetting: { select: { timezone: true } } },
      },
    },
  });
  if (!service) {
    throw new ServiceNotFoundError();
  }
  if (service.basePriceCents == null || service.basePriceCents <= 0) {
    throw new ServicePriceMissingError();
  }
  // Base price; overridden below with the slot's peak/off-peak price so a
  // manual booking is charged exactly what the public picker would show.
  let amountCents = service.basePriceCents;

  // Clinic timezone for the country (falls back to UTC). The appointment
  // time now comes from the picked slot (already UTC), so this is only
  // snapshotted onto the order's CartItem as the patient timezone.
  const clinicTimeZone = service.country?.bookingSetting?.timezone ?? "UTC";

  if (input.doctorId) {
    // Validate the doctor is actually bookable for THIS country + service.
    // Enforced here (not just in the UI) so a manipulated payload can't
    // assign an unrelated / inactive / unapproved doctor. Mirrors the
    // public consult flow's filter: active doctor + on the country roster
    // + active 'active'-status ServiceDoctor row.
    const doc = await prisma.doctor.findUnique({
      where: { id: input.doctorId },
      select: {
        fullName: true,
        active: true,
        countryId: true,
        additionalCountries: {
          where: { countryId: service.countryId, active: true },
          select: { id: true },
        },
        assignedServices: {
          where: { serviceId: service.id, isActive: true, status: "active" },
          select: { id: true },
        },
      },
    });
    if (!doc) throw new DoctorNotFoundError();

    const inCountry =
      doc.countryId === service.countryId || doc.additionalCountries.length > 0;
    if (!doc.active || !inCountry) {
      throw new DoctorNotAvailableInCountryError();
    }
    if (doc.assignedServices.length === 0) {
      throw new DoctorNotAssignedToServiceError();
    }
  }

  // Reject IN_PERSON without a venue up-front (route Zod also enforces
  // this, but the service is callable directly by tests + future
  // automation).
  if (input.consultationMode === "IN_PERSON") {
    if (!input.clinicId && !input.locationAddress?.trim()) {
      throw new Error(
        "In-person appointments need a clinic or a location address.",
      );
    }
  }

  // Claim the chosen slot BEFORE any patient/order/email side-effect, so a
  // stale or taken slot fails the whole booking cleanly. Atomic, mirrors the
  // public cart claim: only an OPEN, future slot owned by this doctor flips
  // to HELD; the payment webhook later flips HELD → BOOKED. A race-loser or
  // a hand-crafted payload pointing at a foreign/past slot updates 0 rows.
  const slotClaim = await prisma.doctorTimeSlot.updateMany({
    where: {
      id: input.timeSlotId,
      doctorId: input.doctorId,
      status: "OPEN",
      startAt: { gt: new Date() },
    },
    data: { status: "HELD" },
  });
  if (slotClaim.count === 0) {
    throw new SlotNotAvailableError();
  }
  const slot = await prisma.doctorTimeSlot.findUnique({
    where: { id: input.timeSlotId },
    select: { startAt: true },
  });
  if (!slot) {
    throw new SlotNotAvailableError();
  }
  // scheduledAt is the slot's UTC instant — no more free-text wall-clock.
  const scheduledAt = slot.startAt;

  // Apply peak / off-peak pricing for the picked slot so the manual price
  // matches the public picker + checkout summary. Falls through to the base
  // price when the service has no enabled peak config.
  const peakConfig = await getServicePeakConfig(service.id);
  if (peakConfig?.enabled) {
    const tz = await resolveDoctorTimeZone(input.doctorId);
    const priced = computeSlotPrice({
      config: peakConfig,
      basePriceCents: amountCents,
      fallbackCurrency: service.currencyCode ?? "EUR",
      slotStartUtc: scheduledAt,
      clinicTimezone: tz,
    });
    amountCents = priced.unitPriceCents;
  }

  // Generate the temp credential up-front so a brand-new User is
  // created with the real bcrypt hash on the first write — no
  // throwaway placeholder, no double-hash.
  const tempPassword = generateTempPassword();
  const tempHash = await bcrypt.hash(tempPassword, 12);

  const dob = parseDateOfBirth(input.patient.dateOfBirth ?? null);

  // Upsert the patient User + minimal PatientProfile fields via the
  // shared helper. `created: true` means we minted a brand-new
  // account (and applied the temp hash); `false` means we matched an
  // existing patient — their password is left untouched.
  const { userId, created } = await upsertPatientProfileByEmail(
    {
      email,
      fullName,
      phone: input.patient.phone ?? null,
      dateOfBirth: dob,
    },
    {
      passwordHashOverride: tempHash,
      mustChangePassword: true,
    },
  );

  if (!userId) {
    // The helper returns null when the existing account is non-PATIENT
    // (doctor/admin). We refuse to book on top of those — the email
    // namespace is shared but the portals aren't.
    throw new Error(
      "An account with that email already exists with a non-patient role",
    );
  }

  // Write the identity + address fields the booking form collected.
  // applyPatientProfileUpdate handles the country-aware fields
  // (nationalIdNumber / taxIdNumber / passportNumber / address) via
  // the same validation path the patient self-edit uses.
  await applyPatientProfileUpdate(
    email,
    {
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
    { fallbackFullName: fullName, fallbackPhone: input.patient.phone ?? null },
  );

  const inviteToken = await issuePasswordResetToken(userId, {
    ttlMinutes: 7 * 24 * 60,
    isInvite: true,
  });
  const setPasswordUrl = absoluteSiteUrl(
    `/reset-password?token=${encodeURIComponent(inviteToken)}&invite=1`,
  );

  const appointmentId = randomUUID();
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
        dateOfBirth: dob,
        notes: input.notes?.trim() || null,
        consentAccepted: true,
        status: "REQUEST_RECEIVED",
        serviceId: service.id,
        doctorId: input.doctorId,
        scheduledAt,
        // Link the claimed slot now; the payment webhook later flips it
        // HELD → BOOKED. 1:1 with DoctorTimeSlot via Appointment.timeSlotId.
        timeSlotId: input.timeSlotId,
        consultationMode: input.consultationMode,
        clinicId:
          input.consultationMode === "IN_PERSON" ? input.clinicId || null : null,
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

  const orderNumber = await generateOrderNumber();
  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId,
      email,
      fullName,
      phone: input.patient.phone?.trim() || null,
      countryCode: input.countryCode.toLowerCase(),
      currencyCode: service.currencyCode ?? "EUR",
      subtotalCents: amountCents,
      totalCents: amountCents,
      appointmentIds: [appointmentId],
      items: {
        create: {
          kind: consultationCartKind(service.kind),
          serviceId: service.id,
          name: service.name,
          unitPriceCents: amountCents,
          quantity: 1,
          lineTotalCents: amountCents,
          doctorId: input.doctorId,
          timeSlotId: input.timeSlotId,
          appointmentId,
          patientFullName: fullName,
          patientEmail: email,
          patientPhone: input.patient.phone?.trim() || null,
          patientDateOfBirth: dob,
          patientNotes: input.notes?.trim() || null,
          patientTimezone: clinicTimeZone,
          patientAddressCountryCode:
            input.patient.addressCountryCode?.trim().toLowerCase() || null,
          patientConsentAcceptedAt: new Date(),
        },
      },
    },
  });

  // Stripe is best-effort. Failures log via the request's pino logger when
  // available and surface to the admin UI via null `paymentUrl` — admin then
  // has the recovery banner to act on by hand.
  let paymentUrl: string | null = null;
  let paymentSessionId: string | null = null;
  if (isStripeConfigured(input.countryCode)) {
    try {
      const stripe = getStripeClient(input.countryCode);
      const baseUrl =
        env.PUBLIC_SITE_URL?.replace(/\/+$/, "") ?? "http://localhost:3000";
      const returnBase = input.returnTo ?? "/account/bookings";
      const successUrl = `${baseUrl}${returnBase}?orderId=${order.id}&payment=ok&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${baseUrl}${returnBase}?orderId=${order.id}&payment=cancelled`;
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        customer_email: email,
        client_reference_id: order.id,
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
        invoice_creation:
          (await buildPtStripeInvoiceData(input.countryCode, email, service.name)) ?? {
            enabled: true,
          },
        metadata: {
          kind: "order",
          orderId: order.id,
          appointmentId,
          countryCode: input.countryCode,
          source: "admin_manual",
        },
      });
      paymentUrl = session.url ?? null;
      paymentSessionId = session.id ?? null;
      await prisma.order.update({
        where: { id: order.id },
        data: { stripeSessionId: paymentSessionId, paymentStatus: PaymentStatus.PENDING, stripeCheckoutUrl: paymentUrl },
      });
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          stripeSessionId: paymentSessionId,
          paymentStatus: PaymentStatus.PENDING,
        },
      });
    } catch (err) {
      input.request?.log.warn(
        { err, appointmentId },
        "[manual-booking] Stripe session creation failed",
      );
    }
  }

  let emailQueued = false;
  try {
    await persistOrderPortalAccess(order.id, {
      setPasswordUrl,
      tempPassword: created ? tempPassword : null,
    });
    await startPrePaymentFlow(order.id, paymentUrl, {
      portal: {
        setPasswordUrl,
        tempPassword: created ? tempPassword : null,
      },
    });
    emailQueued = true;
  } catch (err) {
    input.request?.log.warn(
      { err, appointmentId, orderId: order.id },
      "[manual-booking] Pre-payment automation failed",
    );
  }

  recordAudit({
    actorUserId: input.adminUserId ?? null,
    actorRole: "ADMIN",
    action: "APPOINTMENT_CREATED",
    entityType: "Appointment",
    entityId: appointmentId,
    metadata: {
      source: "admin_manual",
      adminAuth: input.adminUserId ? "session" : "token",
      patientUserId: userId,
      patientAccountCreated: created,
      serviceId: service.id,
      doctorId: input.doctorId ?? null,
      consultationMode: input.consultationMode,
      orderId: order.id,
      stripeSessionId: paymentSessionId,
    },
    request: input.request,
  }).catch(() => {});

  return {
    appointmentId,
    orderId: order.id,
    patientUserId: userId,
    paymentUrl,
    paymentSessionId,
    tempPassword: created ? tempPassword : null,
    setPasswordUrl,
    emailQueued,
  };
}
