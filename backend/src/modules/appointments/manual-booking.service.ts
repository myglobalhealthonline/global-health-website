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
import {
  computeOrderCommission,
  isCommissionCountry,
} from "../orders/commission.service.js";
import { checkoutBranding } from "../billing/checkout-branding.js";
import { issuePasswordResetToken } from "../auth/auth.service.js";
import { recordAudit } from "../audit/audit.service.js";
import {
  applyPatientProfileUpdate,
  upsertPatientProfileByEmail,
} from "../patient-profile/patient-profile.service.js";
import { normalizeDbError } from "../shared/db-errors.js";
import {
  holdConsecutiveSlots,
  releaseSlotsToBaseGrid,
  resolveDoctorTimeZone,
  SlotAlreadyTakenError,
} from "../doctor-availability/doctor-availability.service.js";
import { completeOrderPaymentFromCheckoutSession } from "../orders/complete-order-payment.service.js";
import {
  computeSlotPrice,
  getServicePeakConfig,
} from "../pricing/peak-pricing.service.js";
import {
  isDoctorInInsuranceNetwork,
  loadValidatedInsurancePrice,
} from "../pricing/insurance-pricing.service.js";
import { encryptPhi } from "../../lib/crypto/phi-crypto.js";
import { startPrePaymentFlow } from "../automation/pre-payment-flow.service.js";
import { persistOrderPortalAccess } from "../automation/resolve-order-portal-access.service.js";
import { createUnpaidInvoiceForOrder } from "../invoices/generate-invoice.service.js";
import { promoteAppointmentConsents } from "../consents/promote-appointment-consents.js";

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

/**
 * The discount left a total that is above zero but below Stripe's minimum
 * charge for the currency, so the Checkout Session would be created with an
 * amount Stripe refuses — a booking with a dead payment link. Either discount
 * less, or go all the way to 100% (which skips Stripe and comps the booking).
 */
export class DiscountTooLargeError extends Error {
  constructor(minimumCents: number, currencyCode: string) {
    super(
      `That discount leaves less than the minimum chargeable amount (${(
        minimumCents / 100
      ).toFixed(2)} ${currencyCode}). Lower the discount, or use 100% to comp the booking entirely.`,
    );
    this.name = "DiscountTooLargeError";
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

export class DoctorNotInInsuranceNetworkError extends Error {
  constructor() {
    super(
      "Selected doctor does not take this insurance for this service. Pick a doctor in the insurer's network, or book at the standard price.",
    );
    this.name = "DoctorNotInInsuranceNetworkError";
  }
}

export class InsuranceNotCoveredError extends Error {
  constructor() {
    super("Selected insurance company does not cover this service.");
    this.name = "InsuranceNotCoveredError";
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
    utenteNumber?: string | null;
    addressLine1?: string | null;
    addressCity?: string | null;
    addressState?: string | null;
    addressPostalCode?: string | null;
    addressCountryCode?: string | null;
  };
  serviceId: string;
  /** Required — the assigned doctor whose open slot is being booked. */
  doctorId: string;
  /** Required — id of the FIRST base DoctorTimeSlot to claim. The booking
   *  consumes consecutive base slots covering `durationMinutes`; the
   *  appointment's scheduledAt is derived from that slot's startAt. */
  timeSlotId: string;
  /** Consultation length in minutes. Defaults to the service's
   *  `durationMinutes`; the admin/doctor booking dialog can override it.
   *  Rounded up to the window's base grid step when consumed. */
  durationMinutes?: number | null;
  consultationMode: "ONLINE" | "IN_PERSON";
  clinicId?: string | null;
  locationAddress?: string | null;
  notes?: string | null;
  countryCode: string;
  /** Booking under an insurer. The doctor must be in that insurer's network for
   *  the service (a payout set for it), and the negotiated insurance price is
   *  charged instead of the base/peak price. Null = ordinary standard-price
   *  booking. Unlike the patient flow, an admin doing a manual booking IS the
   *  verifier — they have the card in hand — so the order is recorded as
   *  already VERIFIED and the payment link goes out immediately. */
  insuranceCompanyId?: string | null;
  /** Patient's insurance card/policy number, stored encrypted. */
  insurancePolicyNumber?: string | null;
  /** Path to land the patient back on after Stripe success (e.g.
   *  `/ireland/en`). Cancel URL is built off the same base. */
  returnTo?: string;
  /** Set when this booking is a follow-up spun off an earlier appointment —
   *  stamped onto `Appointment.followUpFromAppointmentId` so the workspace
   *  renders the "Follow-up of …" badge and the patient history stays a
   *  continuous chain. */
  followUpFromAppointmentId?: string | null;
  /** Charge exactly this instead of deriving the price from the service.
   *  Used by the doctor follow-up flow, where the follow-up costs precisely
   *  what the source consultation cost — peak/off-peak must NOT re-price it,
   *  or a follow-up dropped into an evening slot would silently cost more
   *  than the consultation it continues. Wins over base, peak, and insurance
   *  pricing. Must be > 0. */
  amountCentsOverride?: number | null;
  /** Whole-number admin discount 0..100, applied LAST — on top of whatever the
   *  base → peak → insurance → override chain resolved — so "20% off" always
   *  means 20% off what the patient would otherwise have been charged. 100
   *  comps the booking: no Stripe session, the order is completed through the
   *  same free-order path a fully-credit cart uses. Null/0 = no discount. */
  discountPercent?: number | null;
  /** Override `Appointment.consultationType`, which otherwise snapshots the
   *  service name. The follow-up flow passes `"follow-up"` so the doctor /
   *  admin list filters and the reports type breakdown classify it correctly. */
  consultationTypeOverride?: string | null;
  /** Caller request — forwarded to recordAudit so the IP lands in the
   *  AuditLog row, and used for structured logging. */
  request?: FastifyRequest;
  /** Provenance of the booking, for Stripe metadata + the audit row.
   *  Defaults to the admin console (`admin_manual`, actor role ADMIN).
   *  The partner booking API passes its own marker plus the
   *  `PartnerApiClient.id`, so every programmatically-created booking is
   *  traceable to the integration that made it — an audit trail the plain
   *  "admin did it" attribution would otherwise lose. */
  origin?: {
    source: string;
    actorRole?: string;
    partnerClientId?: string | null;
  };
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
  /** What the booking was actually charged, after any admin discount, plus the
   *  discount itself for the admin confirmation banner. `free` is true when a
   *  100% discount comped it — there is no payment link to chase. */
  amountCents: number;
  discountPercent: number;
  discountCents: number;
  free: boolean;
};

/**
 * Stripe rejects a Checkout line below its published per-currency minimum, so a
 * discount landing between zero and this floor would mint a booking whose
 * payment link is dead on arrival. Minor units, keyed by ISO currency; the
 * fallback covers any currency added to a country before this map is updated.
 */
const STRIPE_MIN_CHARGE_CENTS: Record<string, number> = {
  EUR: 50,
  GBP: 30,
  USD: 50,
  CHF: 50,
  CZK: 1500,
  PLN: 200,
  RON: 200,
  HUF: 17_500,
  SEK: 300,
  DKK: 250,
  NOK: 300,
  BGN: 100,
};

function minimumChargeCents(currencyCode: string): number {
  return STRIPE_MIN_CHARGE_CENTS[currencyCode.trim().toUpperCase()] ?? 50;
}

/** Clamp to a whole 0..100. Anything unusable (NaN, negative, > 100) becomes
 *  "no discount" rather than a surprise price — the route's Zod schema is the
 *  real guard; this keeps direct service callers safe. */
function normalizeDiscountPercent(raw: number | null | undefined): number {
  if (raw == null || !Number.isFinite(raw)) return 0;
  const pct = Math.round(raw);
  if (pct <= 0 || pct > 100) return 0;
  return pct;
}

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
  // An explicit override carries its own price, so a service whose base price
  // was cleared since the source consultation was booked can still be followed
  // up on. Without one we require a real base price to charge.
  const amountOverride =
    input.amountCentsOverride != null && input.amountCentsOverride > 0
      ? input.amountCentsOverride
      : null;
  if (amountOverride == null && (service.basePriceCents == null || service.basePriceCents <= 0)) {
    throw new ServicePriceMissingError();
  }
  // Base price; overridden below with the slot's peak/off-peak price so a
  // manual booking is charged exactly what the public picker would show.
  let amountCents = amountOverride ?? (service.basePriceCents as number);

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

  // Booking under an insurer: the doctor must be in that insurer's network for
  // this service (the admin set them a payout for it). Doctors without one never
  // take that insurer's patients, so the form hides them — this is the
  // server-side guard behind that.
  // Both insurance checks run BEFORE the slot is held: a throw after the hold
  // would strand the slot as HELD with no appointment to release it from.
  // Network membership and coverage/pricing are independent — either can fail.
  const insuranceCompanyId = input.insuranceCompanyId?.trim() || null;
  let insurancePriceCents: number | null = null;
  if (insuranceCompanyId) {
    const inNetwork = await isDoctorInInsuranceNetwork(
      service.id,
      input.doctorId,
      insuranceCompanyId,
    );
    if (!inNetwork) throw new DoctorNotInInsuranceNetworkError();

    insurancePriceCents = await loadValidatedInsurancePrice(service.id, insuranceCompanyId);
    if (insurancePriceCents == null) throw new InsuranceNotCoveredError();
  }
  const encryptedPolicy =
    insuranceCompanyId && input.insurancePolicyNumber?.trim()
      ? encryptPhi(input.insurancePolicyNumber.trim())
      : null;

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

  // Reserve the consultation's real length BEFORE any patient/order/email
  // side-effect, so a stale/taken slot fails the whole booking cleanly.
  // Base grid + consume: the picked slot is the FIRST base slot; we hold the
  // consecutive base slots covering the consultation's duration (admin's
  // override, else the service's duration) as ONE collapsed HELD row. The
  // payment webhook later flips that row HELD → BOOKED. Any race-loser or a
  // hand-crafted payload pointing at a foreign/past/taken slot fails here.
  const bookingDuration = input.durationMinutes ?? service.durationMinutes;
  let claimedSlot: { doctorId: string; startAt: Date; endAt: Date };
  try {
    claimedSlot = await prisma.$transaction(async (tx) => {
      const held = await holdConsecutiveSlots(
        tx,
        input.timeSlotId,
        bookingDuration,
      );
      // The slot must belong to the doctor this booking assigned.
      if (held.doctorId !== input.doctorId) {
        throw new SlotNotAvailableError();
      }
      return held;
    });
  } catch (err) {
    if (err instanceof SlotAlreadyTakenError) throw new SlotNotAvailableError();
    throw err;
  }
  // scheduledAt is the slot's UTC instant — no more free-text wall-clock.
  const scheduledAt = claimedSlot.startAt;

  // Apply peak / off-peak pricing for the picked slot so the manual price
  // matches the public picker + checkout summary. Falls through to the base
  // price when the service has no enabled peak config.
  const peakConfig = amountOverride == null ? await getServicePeakConfig(service.id) : null;
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

  // Insurance wins over peak: a negotiated insurance price is a flat per-service
  // rate independent of time-of-day. Resolved server-side above (never trusted
  // from the form) — same authority the public cart uses.
  // An explicit override outranks both: it is itself a price already charged
  // once (the source consultation's), so re-deriving would defeat the point.
  if (insurancePriceCents != null && amountOverride == null) {
    amountCents = insurancePriceCents;
  }

  // Admin discretionary discount — applied LAST, on the resolved price, so the
  // percentage always reads against what the patient would otherwise pay.
  // The slot is already HELD at this point, so a rejected discount has to hand
  // it back before throwing or the time is stranded until the HELD sweep runs.
  const discountPercent = normalizeDiscountPercent(input.discountPercent);
  const grossAmountCents = amountCents;
  const discountCents =
    discountPercent > 0 ? Math.round((grossAmountCents * discountPercent) / 100) : 0;
  amountCents = grossAmountCents - discountCents;
  const currencyCode = service.currencyCode ?? "EUR";
  const minChargeCents = minimumChargeCents(currencyCode);
  // Only the discount is policed here — a service priced below the minimum on
  // its own is a pricing problem, not this booking's, and rejecting it would
  // blame the wrong field.
  if (discountCents > 0 && amountCents > 0 && amountCents < minChargeCents) {
    await releaseSlotsToBaseGrid([input.timeSlotId]).catch(() => {});
    throw new DiscountTooLargeError(minChargeCents, currencyCode);
  }
  // Nothing left to charge (100% off, or an insurer covering the service in
  // full): skip Stripe and complete the order through the same path a
  // fully-credit cart uses, rather than minting a €0 session Stripe rejects.
  const isFree = amountCents === 0;

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
      ...(input.patient.utenteNumber !== undefined
        ? { utenteNumber: input.patient.utenteNumber?.trim() || null }
        : {}),
      ...(input.patient.addressLine1 !== undefined
        ? { addressLine1: input.patient.addressLine1?.trim() || null }
        : {}),
      ...(input.patient.addressCity !== undefined
        ? { addressCity: input.patient.addressCity?.trim() || null }
        : {}),
      ...(input.patient.addressState !== undefined
        ? { addressState: input.patient.addressState?.trim() || null }
        : {}),
      ...(input.patient.addressPostalCode !== undefined
        ? { addressPostalCode: input.patient.addressPostalCode?.trim() || null }
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
        consultationType: input.consultationTypeOverride?.trim() || service.name,
        followUpFromAppointmentId: input.followUpFromAppointmentId ?? null,
        fullName,
        email,
        phone: input.patient.phone?.trim() || null,
        dateOfBirth: dob,
        notes: input.notes?.trim() || null,
        // Same address snapshot the self-service booking flow writes, so a
        // manually-booked consultation carries the address its prescriptions
        // and certificates are rendered from.
        addressLine1: input.patient.addressLine1?.trim() || null,
        addressCity: input.patient.addressCity?.trim() || null,
        addressState: input.patient.addressState?.trim() || null,
        addressPostalCode: input.patient.addressPostalCode?.trim() || null,
        addressCountryCode:
          input.patient.addressCountryCode?.trim().toLowerCase() || null,
        consentAccepted: true,
        // Without a scope the consent promotion job skips this appointment and
        // the medical-access guard denies the booking doctor (DOCTOR_NO_VALID_ACCESS_PATH).
        medicalAccessConsentScope: "DIRECT",
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
        // Insurance snapshot for the clinical record — amountCents above is
        // already the negotiated insurance price. Policy stays encrypted.
        insuranceCompanyId,
        insurancePolicyNumber: encryptedPolicy,
      },
    });
  } catch (error) {
    throw normalizeDbError(error, "Could not create manual appointment");
  }

  // Manual-booking patients may never log in (promotion normally runs on
  // login/verify), so promote booking consents into PatientConsent now.
  promoteAppointmentConsents(userId, email).catch((err) => {
    console.error("[manual-booking] consent promotion failed", err);
  });

  const orderNumber = await generateOrderNumber();

  // Commission markets: freeze the doctor payout + our commission at sale time,
  // exactly as the self-service checkout does. An admin booking must produce the
  // same fiscal document a web booking would.
  //
  // Deliberately NOT gated on a payout being configured: an admin taking a card
  // over the phone cannot be blocked mid-call by a missing config row. A payout-
  // less line falls through to "commission = full price" and raises a critical
  // ops alert from computeOrderCommission, which is the reviewable outcome.
  const isCommissionOrder = await isCommissionCountry(input.countryCode);
  const commission = isCommissionOrder
    ? await computeOrderCommission(
        [
          {
            id: "line",
            serviceId: service.id,
            doctorId: input.doctorId,
            insuranceCompanyId,
            quantity: 1,
            unitPriceCents: amountCents,
          },
        ],
        0,
        { countryCode: input.countryCode },
      )
    : null;

  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId,
      email,
      fullName,
      phone: input.patient.phone?.trim() || null,
      countryCode: input.countryCode.toLowerCase(),
      currencyCode,
      subtotalCents: amountCents,
      totalCents: amountCents,
      commissionTotalCents: commission?.commissionTotalCents ?? null,
      doctorPayoutTotalCents: commission?.doctorPayoutTotalCents ?? null,
      // Audit only — the totals and the line price above are ALREADY net of
      // the discount (same convention as OrderItem.corporateDiscountCents).
      discountPercent: discountPercent > 0 ? discountPercent : null,
      discountCents: discountCents > 0 ? discountCents : null,
      // An admin doing a manual booking IS the verifier — they take the card
      // details directly from the patient — so the order is recorded as already
      // VERIFIED and goes straight to a payment link, rather than parking in
      // PENDING like a self-service insurance booking.
      insuranceCompanyId,
      insuranceVerificationStatus: insuranceCompanyId ? "VERIFIED" : null,
      appointmentIds: [appointmentId],
      // Dual-write into the relational join table alongside the legacy
      // array (Suggestion 8, code review 2026-07-05) — real FK integrity
      // going forward.
      orderAppointments: { create: { appointmentId } },
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
          patientAddressLine1: input.patient.addressLine1?.trim() || null,
          patientAddressCity: input.patient.addressCity?.trim() || null,
          patientAddressState: input.patient.addressState?.trim() || null,
          patientAddressPostalCode: input.patient.addressPostalCode?.trim() || null,
          patientAddressCountryCode:
            input.patient.addressCountryCode?.trim().toLowerCase() || null,
          patientConsentAcceptedAt: new Date(),
          // unitPriceCents above is already the insurance price for these lines;
          // these record the insurer + encrypted policy + resolved price.
          insuranceCompanyId,
          insurancePolicyNumber: encryptedPolicy,
          insurancePriceCents: insurancePriceCents,
          // Commission-market snapshot (see the block above the order create).
          doctorPayoutCents: commission?.lines[0]?.doctorPayoutCents ?? null,
          commissionCents: commission?.lines[0]?.commissionCents ?? null,
        },
      },
    },
  });

  // Stripe is best-effort. Failures log via the request's pino logger when
  // available and surface to the admin UI via null `paymentUrl` — admin then
  // has the recovery banner to act on by hand.
  // Portal access (set-password URL + temp password) is persisted BEFORE the
  // payment branch: a comped booking completes inline below and immediately
  // queues the paid-order automations, which read these columns off the order.
  let portalAccessSaved = false;
  try {
    await persistOrderPortalAccess(order.id, {
      setPasswordUrl,
      tempPassword: created ? tempPassword : null,
    });
    portalAccessSaved = true;
  } catch (err) {
    input.request?.log.warn(
      { err, appointmentId, orderId: order.id },
      "[manual-booking] Portal access persist failed",
    );
  }

  let paymentUrl: string | null = null;
  let paymentSessionId: string | null = null;
  if (isFree) {
    // Comped booking (100% off, or an insurer covering the service in full).
    // There is nothing to charge, so run the same completion the €0 cart path
    // uses: marks the order PAID, flips the appointment + its HELD slot, and
    // queues the paid-order automations (confirmation, meeting link, invoice).
    try {
      await completeOrderPaymentFromCheckoutSession(
        order.id,
        {
          id: `free_${order.id}`,
          payment_intent: null,
          invoice: null,
          client_reference_id: order.id,
          metadata: {
            kind: "order",
            orderId: order.id,
            appointmentId,
            countryCode: input.countryCode,
            source: input.origin?.source ?? "admin_manual",
          },
        },
        { stripeEventId: `free_${order.id}`, eventType: "free_order" },
        input.request?.log,
      );
    } catch (err) {
      input.request?.log.error(
        { err, appointmentId, orderId: order.id },
        "[manual-booking] Free-booking completion failed — order left unpaid",
      );
    }
  } else if (isStripeConfigured(input.countryCode)) {
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
              // PRIV-001: never send clinical free-text (input.notes) to Stripe —
              // this label shows on the customer's receipt. Public service name only.
              product_data: {
                name: service.name,
              },
            },
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        // Commission markets: suppress Stripe's own invoice — it would document
        // the full amount charged and contradict our commission-only receipt.
        invoice_creation: isCommissionOrder
          ? { enabled: false }
          : (await buildPtStripeInvoiceData(input.countryCode, email, service.name)) ?? {
              enabled: true,
            },
        // Global Health branding: page language pinned to the booking's market
        // plus the trust line above the pay button.
        ...(await checkoutBranding(input.countryCode)),
        metadata: {
          kind: "order",
          orderId: order.id,
          appointmentId,
          countryCode: input.countryCode,
          source: input.origin?.source ?? "admin_manual",
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
  if (isFree) {
    // Nothing to chase: the completion above already queued the paid-order
    // automations, so the pre-payment flow (payment link, reminders, and the
    // cancel sweep that voids unpaid bookings) must NOT start on top of them.
    emailQueued = portalAccessSaved;
  } else {
    try {
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
  }

  // Issue the unpaid invoice document for this manual/AI booking and email it to
  // the patient (skips Portugal / prefixless countries internally). Fire-and-
  // forget — an invoice/email failure must never roll back the booking. Its
  // existence is later how the payment path knows to transition it to a RECEIPT.
  // A comped booking is already PAID, so its receipt comes from the paid-order
  // path instead — issuing an unpaid invoice here would contradict it.
  if (!isFree) {
    void createUnpaidInvoiceForOrder(order.id).catch((err) => {
      input.request?.log.warn(
        { err, orderId: order.id },
        "[manual-booking] Unpaid invoice issue failed",
      );
    });
  }

  recordAudit({
    actorUserId: input.adminUserId ?? null,
    actorRole: input.origin?.actorRole ?? "ADMIN",
    action: "APPOINTMENT_CREATED",
    entityType: "Appointment",
    entityId: appointmentId,
    metadata: {
      source: input.origin?.source ?? "admin_manual",
      adminAuth: input.adminUserId ? "session" : "token",
      ...(input.origin?.partnerClientId
        ? { partnerClientId: input.origin.partnerClientId }
        : {}),
      patientUserId: userId,
      patientAccountCreated: created,
      serviceId: service.id,
      doctorId: input.doctorId ?? null,
      consultationMode: input.consultationMode,
      orderId: order.id,
      stripeSessionId: paymentSessionId,
      // Discount trail: who discounted, by how much, off what price.
      ...(discountPercent > 0
        ? {
            discountPercent,
            discountCents,
            grossAmountCents,
            chargedAmountCents: amountCents,
            comped: isFree,
          }
        : {}),
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
    amountCents,
    discountPercent,
    discountCents,
    free: isFree,
  };
}
