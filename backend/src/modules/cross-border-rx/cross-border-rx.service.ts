import type { FastifyRequest } from "fastify";
import { createHash, randomBytes } from "node:crypto";
import { CartItemKind, PaymentStatus, type Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { generateOrderNumber } from "../../lib/order-number.js";
import {
  computeOrderCommission,
  isCommissionCountry,
} from "../orders/commission.service.js";
import { getStripeClient, isStripeConfigured } from "../../lib/stripe/client.js";
import { buildPtStripeInvoiceData } from "../invoices/pt-stripe-invoice-data.js";
import { checkoutBranding } from "../billing/checkout-branding.js";
import { ensureConsultationDraft } from "../consultations/ensure-consultation-draft.js";
import { assertValidStatusTransition } from "../appointments/appointment-status-transitions.js";
import { notifyDoctor, notifyUser, notifyAdmins } from "../notifications/notify.service.js";
import { sendEmail } from "../../lib/email/send-email.js";
import { wrapHtml } from "../../lib/email/templates.js";
import { orderPayShortLink } from "../orders/order-payment-url.service.js";
import { resolveGpSameDayService } from "../gp-booking/gp-config.service.js";
import { decryptPhi, encryptPhi } from "../../lib/crypto/phi-crypto.js";
import { patientTaxIdLabel } from "../generated-documents/generated-documents-fields.js";
import {
  notifyPatientCrossBorderConsent,
  notifyPatientCrossBorderPayment,
  notifyPatientCrossBorderAccepted,
  notifyRequestingDoctorFinalised,
  notifyStaffCrossBorderRequest,
  notifySourceDoctorMoreInfoRequested,
  notifyTargetDoctorMoreInfoAnswered,
} from "./cross-border-rx-notifications.service.js";
import { createMedicalNote } from "../medical-notes/medical-notes.service.js";
import {
  copyDisclosedDocuments,
  copyDisclosedPatientContext,
} from "./cross-border-rx-disclosure.service.js";
import type { PaymentLog } from "../orders/complete-order-payment.service.js";

/**
 * Patient consent token: the raw token lives ONLY in the emailed consent link;
 * the DB stores its SHA-256 hash (same S-009 rule as ShareLink /
 * MedicalAccessRequest). 14-day TTL.
 */
const CONSENT_TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000;
function hashConsentToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
function buildConsentUrl(rawToken: string): string {
  const base = env.PUBLIC_SITE_URL?.replace(/\/+$/, "") ?? "http://localhost:3000";
  return `${base}/cross-border-consent?token=${encodeURIComponent(rawToken)}`;
}

/**
 * Cross-jurisdiction prescription requests ("Request prescription outside
 * jurisdiction").
 *
 * Doctor A (the treating doctor, licensed in one country) raises a request for
 * a prescription that must be issued in another country. The patient pays an
 * admin-priced fee; on payment an asynchronous consultation is minted for the
 * admin-authorised prescribing doctor there (Doctor B), who accepts (issues the
 * script), asks for more information, or refuses (offering the patient a
 * full-consultation upgrade).
 *
 * The fee + payout live on the prescribing doctor (`Doctor.crossBorderRx*`):
 * admin enables a doctor as a cross-border prescriber and sets the patient
 * price + doctor payout, in the doctor's country currency. The payout is
 * snapshotted onto the request at creation so the payout statement can value
 * the async consult. No price ever crosses into the doctor portal (same rule as
 * the manual-booking pipeline).
 */

// ── Errors ───────────────────────────────────────────────────────────────────

export class CrossBorderRxNotPermittedError extends Error {
  constructor() {
    super("You are not permitted to request cross-jurisdiction prescriptions.");
    this.name = "CrossBorderRxNotPermittedError";
  }
}
export class CrossBorderRxSourceNotFoundError extends Error {
  constructor() {
    super("Source appointment not found.");
    this.name = "CrossBorderRxSourceNotFoundError";
  }
}
export class CrossBorderRxTargetNotAvailableError extends Error {
  constructor() {
    super(
      "No prescribing doctor is available for that country. Ask an administrator to set one up.",
    );
    this.name = "CrossBorderRxTargetNotAvailableError";
  }
}
export class CrossBorderRxServicePriceMissingError extends Error {
  constructor() {
    super("The cross-jurisdiction prescription service has no price set. Ask an administrator.");
    this.name = "CrossBorderRxServicePriceMissingError";
  }
}
export class CrossBorderRxStripeNotConfiguredError extends Error {
  constructor() {
    super("Payments are not configured for the target country.");
    this.name = "CrossBorderRxStripeNotConfiguredError";
  }
}
export class CrossBorderRxRequestNotFoundError extends Error {
  constructor() {
    super("Request not found.");
    this.name = "CrossBorderRxRequestNotFoundError";
  }
}
export class CrossBorderRxNotActionableError extends Error {
  constructor() {
    super("This request can no longer be actioned.");
    this.name = "CrossBorderRxNotActionableError";
  }
}
export class CrossBorderRxMessageRequiredError extends Error {
  constructor() {
    super("A message is required to request more information.");
    this.name = "CrossBorderRxMessageRequiredError";
  }
}
export class CrossBorderRxConsentInvalidError extends Error {
  constructor() {
    super("This consent link is invalid.");
    this.name = "CrossBorderRxConsentInvalidError";
  }
}
export class CrossBorderRxConsentExpiredError extends Error {
  constructor() {
    super("This consent link has expired. Ask your doctor to send a new one.");
    this.name = "CrossBorderRxConsentExpiredError";
  }
}
export class CrossBorderRxIdentityRequiredError extends Error {
  constructor(label: string) {
    super(`Enter your ${label} or your passport number so the prescription can identify you.`);
    this.name = "CrossBorderRxIdentityRequiredError";
  }
}
export class CrossBorderRxMoreInfoNotFoundError extends Error {
  constructor() {
    super("There is no pending question for this appointment.");
    this.name = "CrossBorderRxMoreInfoNotFoundError";
  }
}
export class CrossBorderRxMoreInfoAlreadyAnsweredError extends Error {
  constructor() {
    super("This question has already been answered.");
    this.name = "CrossBorderRxMoreInfoAlreadyAnsweredError";
  }
}
export class CrossBorderRxAnswerRequiredError extends Error {
  constructor() {
    super("An answer is required.");
    this.name = "CrossBorderRxAnswerRequiredError";
  }
}

// ── Target options (Doctor A's picker) ───────────────────────────────────────

export type CrossBorderRxTargetCountry = {
  countryCode: string;
  countryName: string;
  doctors: { id: string; fullName: string; title: string }[];
};

/**
 * Countries the patient can be referred to for a cross-jurisdiction
 * prescription: those with at least one active, cross-border-enabled prescriber
 * doctor that has a price set. Grouped by the prescriber's primary country. The
 * source appointment's own country is excluded — the whole point is issuing
 * OUTSIDE the treating doctor's jurisdiction. No price is returned to the portal.
 */
export async function listCrossBorderRxTargets(
  sourceAppointmentId: string,
  doctorId: string,
): Promise<{ targets: CrossBorderRxTargetCountry[] }> {
  try {
    const source = await prisma.appointment.findFirst({
      where: { id: sourceAppointmentId, doctorId },
      select: { id: true, countryCode: true },
    });
    if (!source) throw new CrossBorderRxSourceNotFoundError();

    // One row per (prescriber, country) that is fully configured — BOTH price
    // (> 0) and payout set — for an enabled, active doctor in an active country.
    // A multi-country prescriber therefore surfaces under EACH country they have
    // a complete config for, and not under those they don't.
    const configs = await prisma.doctorCrossBorderRxCountry.findMany({
      where: {
        priceCents: { gt: 0 },
        payoutCents: { not: null },
        doctor: { crossBorderRxEnabled: true, active: true },
        country: { isActive: true },
      },
      orderBy: [{ country: { name: "asc" } }, { doctor: { fullName: "asc" } }],
      select: {
        country: { select: { code: true, name: true } },
        doctor: { select: { id: true, fullName: true, title: true } },
      },
    });

    const sourceCountry = source.countryCode.toLowerCase();
    const byCountry = new Map<string, CrossBorderRxTargetCountry>();
    for (const c of configs) {
      const code = c.country.code.toLowerCase();
      if (code === sourceCountry) continue; // must be a DIFFERENT jurisdiction
      let entry = byCountry.get(code);
      if (!entry) {
        entry = { countryCode: c.country.code, countryName: c.country.name, doctors: [] };
        byCountry.set(code, entry);
      }
      entry.doctors.push({ id: c.doctor.id, fullName: c.doctor.fullName, title: c.doctor.title });
    }

    return { targets: Array.from(byCountry.values()) };
  } catch (error) {
    if (error instanceof CrossBorderRxSourceNotFoundError) {
      throw error;
    }
    throw normalizeDbError(error, "Cross-border prescription options are unavailable");
  }
}

// ── Create request + async-fee payment link ──────────────────────────────────

export type CreateCrossBorderRxInput = {
  sourceAppointmentId: string;
  /** Doctor A — the requesting/treating doctor. */
  sourceDoctorId: string;
  /** Doctor A's portal User id (notifications / audit). */
  actorUserId: string | null;
  targetCountryCode: string;
  targetDoctorId: string;
  /** Optional — the consultation SOAP is disclosed to Doctor B instead. */
  clinicalSummary?: string | null;
  request?: FastifyRequest;
};

export type CreateCrossBorderRxResult = {
  requestId: string;
  /** Consent link emailed to the patient (also shown to Doctor A to share). */
  consentUrl: string | null;
};

type SourceSoap = {
  chiefComplaint: string | null;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  noteFormat: "SOAP" | "FREEFORM";
  note: string | null;
} | null;

async function readSourceSoap(sourceAppointmentId: string): Promise<SourceSoap> {
  return prisma.consultation.findUnique({
    where: { appointmentId: sourceAppointmentId },
    select: {
      chiefComplaint: true,
      subjective: true,
      objective: true,
      assessment: true,
      plan: true,
      noteFormat: true,
      note: true,
    },
  });
}

function soapHasContent(soap: SourceSoap): boolean {
  if (!soap) return false;
  return Boolean(
    soap.chiefComplaint?.trim() ||
      soap.subjective?.trim() ||
      soap.objective?.trim() ||
      soap.assessment?.trim() ||
      soap.plan?.trim() ||
      soap.note?.trim(),
  );
}

/**
 * Re-take the SOAP snapshot at the moment the patient consents.
 *
 * The snapshot has to be immutable once disclosed — but consent happens AFTER
 * the request is raised, and the treating doctor routinely writes the consult
 * note in between. Freezing the note at request time meant a request raised
 * mid-consult disclosed nothing at all. Taking it at consent time is both the
 * correct GDPR reading (the patient consents to the record as it stands when
 * they agree) and the fix for the empty-record case; from here it is frozen.
 *
 * Only overwrites when the fresh read actually has content, so a source note
 * that was later blanked can never erase an already-captured snapshot.
 */
async function refreshSoapSnapshot(requestId: string, sourceAppointmentId: string): Promise<void> {
  try {
    const soap = await readSourceSoap(sourceAppointmentId);
    if (!soapHasContent(soap)) return;
    await prisma.crossBorderPrescriptionRequest.update({
      where: { id: requestId },
      data: {
        sourceChiefComplaint: soap?.chiefComplaint ?? null,
        sourceSubjective: soap?.subjective ?? null,
        sourceObjective: soap?.objective ?? null,
        sourceAssessment: soap?.assessment ?? null,
        sourcePlan: soap?.plan ?? null,
        sourceNoteFormat: soap?.noteFormat ?? "SOAP",
        sourceNote: soap?.note ?? null,
      },
    });
  } catch {
    // Snapshot refresh is an improvement on what is already stored — never
    // block the patient's consent on it.
  }
}

export async function createCrossBorderRxRequest(
  input: CreateCrossBorderRxInput,
): Promise<CreateCrossBorderRxResult> {
  const source = await prisma.appointment.findFirst({
    where: { id: input.sourceAppointmentId, doctorId: input.sourceDoctorId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      userId: true,
      countryCode: true,
      whatsappConsent: true,
    },
  });
  if (!source) throw new CrossBorderRxSourceNotFoundError();

  // Resolve the (prescriber, target country) config: the doctor must be enabled
  // + active, and have a COMPLETE row for the requested country (price > 0 AND
  // payout set). One query enforces all of it — a crafted payload can't reach a
  // doctor/country pairing an admin hasn't fully set up.
  const config = await prisma.doctorCrossBorderRxCountry.findFirst({
    where: {
      doctorId: input.targetDoctorId,
      priceCents: { gt: 0 },
      payoutCents: { not: null },
      doctor: { crossBorderRxEnabled: true, active: true },
      country: { code: { equals: input.targetCountryCode, mode: "insensitive" }, isActive: true },
    },
    select: {
      priceCents: true,
      payoutCents: true,
      doctor: { select: { id: true, fullName: true } },
      country: { select: { code: true, name: true } },
    },
  });
  if (!config || config.priceCents == null || config.priceCents <= 0) {
    throw new CrossBorderRxTargetNotAvailableError();
  }
  const doctor = { id: config.doctor.id, fullName: config.doctor.fullName, country: config.country };
  const targetCountryCode = config.country.code;
  // Must be a DIFFERENT jurisdiction than the treating doctor's.
  if (source.countryCode.toLowerCase() === targetCountryCode.toLowerCase()) {
    throw new CrossBorderRxTargetNotAvailableError();
  }
  // Fail fast if the target market can't take payment — the patient will need
  // it after consenting, so surfacing it now saves a dead-end consent link.
  if (!isStripeConfigured(targetCountryCode)) {
    throw new CrossBorderRxStripeNotConfiguredError();
  }

  // Snapshot the source consultation's SOAP note. Re-taken when the patient
  // actually consents (see `refreshSoapSnapshot`) — a request raised before the
  // treating doctor has written up the consult would otherwise disclose an
  // empty record, which is how Doctor B ends up prescribing blind.
  const soap = await readSourceSoap(source.id);

  const sourceDoctor = await prisma.doctor.findUnique({
    where: { id: input.sourceDoctorId },
    select: { fullName: true },
  });

  const rawToken = randomBytes(32).toString("base64url");
  const consentTokenHash = hashConsentToken(rawToken);
  const consentTokenExpiresAt = new Date(Date.now() + CONSENT_TOKEN_TTL_MS);

  const created = await prisma.crossBorderPrescriptionRequest.create({
    data: {
      sourceAppointmentId: source.id,
      sourceDoctorId: input.sourceDoctorId,
      patientEmail: source.email,
      patientFullName: source.fullName,
      targetCountryCode,
      targetDoctorId: doctor.id,
      payoutCents: config.payoutCents ?? null,
      // Optional now — the consultation SOAP is disclosed to Doctor B, so the
      // treating doctor no longer has to re-type a summary. Stored as "" when
      // omitted (the column is NOT NULL); the inbox hides an empty reason.
      clinicalSummary: input.clinicalSummary?.trim() ?? "",
      sourceChiefComplaint: soap?.chiefComplaint ?? null,
      sourceSubjective: soap?.subjective ?? null,
      sourceObjective: soap?.objective ?? null,
      sourceAssessment: soap?.assessment ?? null,
      sourcePlan: soap?.plan ?? null,
      sourceNoteFormat: soap?.noteFormat ?? "SOAP",
      sourceNote: soap?.note ?? null,
      consentTokenHash,
      consentTokenExpiresAt,
      status: "PENDING_CONSENT",
    },
    select: { id: true },
  });

  // No Order / Stripe session yet: the patient must first consent to disclosing
  // their consultation record to the prescribing doctor. The checkout is minted
  // only when they agree (submitCrossBorderRxConsent → AGREE).
  const consentUrl = buildConsentUrl(rawToken);
  // Email + WhatsApp with the consent link (agree → pay; decline → book GP).
  void notifyPatientCrossBorderConsent({
    fullName: source.fullName,
    email: source.email,
    phone: source.phone ?? null,
    countryCode: targetCountryCode,
    whatsappConsent: source.whatsappConsent,
    consentUrl,
    sourceDoctorName: sourceDoctor?.fullName ?? "your doctor",
    targetDoctorName: doctor.fullName,
    targetCountryName: doctor.country.name,
  }).catch(() => {});
  if (source.userId) {
    void notifyUser(source.userId, "CROSS_BORDER_RX_UPDATED", {
      title: "Action needed: prescription request",
      body: "Your doctor started a cross-border prescription request. Review what will be shared and choose how to proceed.",
      href: consentUrl,
    }).catch(() => {});
  }

  return { requestId: created.id, consentUrl };
}

/**
 * Mint the async-fee Order + Stripe Checkout for a consented request and
 * deliver the payment link. Idempotent: a request that already has an Order
 * returns its existing payment link instead of creating a second one.
 * Re-resolves the prescriber's CURRENT price at checkout time.
 */
async function createAsyncFeeCheckoutForRequest(
  requestId: string,
): Promise<string | null> {
  const request = await prisma.crossBorderPrescriptionRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      orderId: true,
      targetDoctorId: true,
      targetCountryCode: true,
      patientEmail: true,
      patientFullName: true,
      sourceAppointmentId: true,
    },
  });
  if (!request) throw new CrossBorderRxRequestNotFoundError();

  // Already has an order → return its live payment link (idempotent revisit).
  if (request.orderId) {
    const existing = await prisma.order.findUnique({
      where: { id: request.orderId },
      select: { stripeCheckoutUrl: true },
    });
    return existing?.stripeCheckoutUrl ?? (await orderPayShortLink(request.orderId));
  }

  // Re-resolve the per-country config for THIS request's target country, so the
  // patient is charged the current price in that country's currency.
  const config = await prisma.doctorCrossBorderRxCountry.findFirst({
    where: {
      doctorId: request.targetDoctorId,
      priceCents: { gt: 0 },
      payoutCents: { not: null },
      doctor: { crossBorderRxEnabled: true, active: true },
      country: { code: { equals: request.targetCountryCode, mode: "insensitive" } },
    },
    select: {
      priceCents: true,
      // The prescriber's payout. Already required non-null by the where clause
      // above; read it so commission markets can carve it out of the fee.
      payoutCents: true,
      doctor: { select: { fullName: true } },
      country: { select: { code: true, currency: { select: { code: true } } } },
    },
  });
  if (!config || config.priceCents == null || config.priceCents <= 0) {
    throw new CrossBorderRxTargetNotAvailableError();
  }
  const targetCountryCode = config.country.code;
  if (!isStripeConfigured(targetCountryCode)) {
    throw new CrossBorderRxStripeNotConfiguredError();
  }
  const priceCents = config.priceCents;
  const currency = config.country.currency.code;
  const serviceName = `Cross-border prescription — ${config.doctor.fullName}`;

  const source = await prisma.appointment.findUnique({
    where: { id: request.sourceAppointmentId },
    select: { phone: true, whatsappConsent: true, userId: true },
  });

  const orderNumber = await generateOrderNumber();

  // Commission markets: the prescriber's payout lives on the per-country
  // cross-border config, not on a (service, doctor) pair — this order line
  // carries neither id — so hand it to the commission engine directly.
  const commission = (await isCommissionCountry(targetCountryCode))
    ? await computeOrderCommission(
        [
          {
            id: "line",
            quantity: 1,
            unitPriceCents: priceCents,
            payoutOverrideCents: config.payoutCents ?? 0,
          },
        ],
        0,
        { countryCode: targetCountryCode },
      )
    : null;

  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId: source?.userId ?? null,
      email: request.patientEmail,
      fullName: request.patientFullName,
      phone: source?.phone ?? null,
      countryCode: targetCountryCode,
      currencyCode: currency,
      subtotalCents: priceCents,
      shippingCents: 0,
      totalCents: priceCents,
      commissionTotalCents: commission?.commissionTotalCents ?? null,
      doctorPayoutTotalCents: commission?.doctorPayoutTotalCents ?? null,
      items: {
        create: [
          {
            // Non-consultation line — must NOT trigger the standard appointment
            // mint (that only fires for GENERAL/SPECIALIST). The async
            // appointment is minted in onCrossBorderRxFeePaid.
            kind: CartItemKind.PRESCRIPTION_SERVICE,
            name: serviceName,
            unitPriceCents: priceCents,
            quantity: 1,
            lineTotalCents: priceCents,
            patientFullName: request.patientFullName,
            patientEmail: request.patientEmail,
            patientPhone: source?.phone ?? null,
            doctorPayoutCents: commission?.lines[0]?.doctorPayoutCents ?? null,
            commissionCents: commission?.lines[0]?.commissionCents ?? null,
          },
        ],
      },
    },
    select: { id: true },
  });
  await prisma.crossBorderPrescriptionRequest.update({
    where: { id: request.id },
    data: { orderId: order.id },
  });

  const stripe = getStripeClient(targetCountryCode);
  const baseUrl = env.PUBLIC_SITE_URL?.replace(/\/+$/, "") ?? "http://localhost:3000";
  const successUrl = `${baseUrl}/checkout/success?orderId=${order.id}&payment=ok&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl}/checkout/cancelled?orderId=${order.id}&payment=cancelled`;
  const invoiceCreation =
    (await buildPtStripeInvoiceData(targetCountryCode, request.patientEmail, serviceName)) ?? {
      enabled: true,
    };

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: request.patientEmail,
    client_reference_id: order.id,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: priceCents,
          product_data: { name: serviceName },
        },
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    invoice_creation: invoiceCreation,
    // Global Health branding — language pinned to the country the prescription
    // is being issued in, not the patient's browser.
    ...(await checkoutBranding(targetCountryCode)),
    metadata: { kind: "order", orderId: order.id, countryCode: targetCountryCode },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: {
      stripeSessionId: session.id,
      paymentStatus: PaymentStatus.PENDING,
      stripeCheckoutUrl: session.url ?? null,
    },
  });

  void notifyPatientCrossBorderPayment({
    orderId: order.id,
    orderNumber,
    fullName: request.patientFullName,
    email: request.patientEmail,
    phone: source?.phone ?? null,
    countryCode: targetCountryCode,
    whatsappConsent: source?.whatsappConsent ?? false,
  }).catch(() => {});

  return session.url ?? (await orderPayShortLink(order.id));
}

// ── Patient consent (public, token-based) ────────────────────────────────────

export type CrossBorderRxDeliveryDetails = {
  pharmacyName: string | null;
  /** Health/tax id valid in the TARGET country (PPS for IE, NIF for PT, ...). */
  healthIdNumber: string | null;
  /** Passport number — the alternative to `healthIdNumber` for target
   *  countries that require one of the two (Brazil: CPF or passport). */
  passportNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  addressCity: string | null;
  addressPostalCode: string | null;
  addressCountryCode: string | null;
};

export type CrossBorderRxConsentView = {
  status: string;
  patientFullName: string;
  sourceDoctorName: string | null;
  targetDoctorName: string;
  targetCountryName: string;
  targetCountryCode: string;
  /** What the target country calls the health/tax id ("PPS", "NIF", ...) —
   *  resolved server-side so the form label can't drift from the PDF label. */
  healthIdLabel: string;
  /** Brazil (and any future market requiring one of health id / passport)
   *  needs ONE of healthIdNumber / passportNumber before the patient can pay. */
  identityRequiresOneOf: boolean;
  /** The async prescription fee, in the target country's currency — shown
   *  alongside the GP consult price so the patient can compare before choosing. */
  prescriptionFeeCents: number | null;
  prescriptionFeeCurrency: string | null;
  /** The full GP consultation's catalogue price in the target country. */
  gpConsultPriceCents: number | null;
  gpConsultCurrency: string | null;
  /** Pre-filled patient details for the payment-step form (pharmacy + address).
   *  Everything else the request already knows; the patient only edits these. */
  prefill: CrossBorderRxDeliveryDetails & { phone: string | null };
  /** Present when the patient already consented — resume payment. */
  paymentUrl: string | null;
  /** Present when the patient declined — book a full GP consult instead. */
  gpBookingUrl: string | null;
  /** Whether `revertCrossBorderRxConsent` may be called from this state —
   *  true while the async fee is unpaid (PENDING_PAYMENT) or after a decline
   *  (CONSENT_DECLINED); false once a doctor is already actioning the request. */
  canChangeDecision: boolean;
};

export type CrossBorderRxConsentDecision = "AGREE" | "DECLINE";

export type CrossBorderRxConsentDecisionResult = {
  status: string;
  paymentUrl: string | null;
  gpBookingUrl: string | null;
};

async function loadRequestByConsentToken(token: string) {
  const consentTokenHash = hashConsentToken(token);
  const request = await prisma.crossBorderPrescriptionRequest.findUnique({
    where: { consentTokenHash },
    select: {
      id: true,
      status: true,
      patientFullName: true,
      patientEmail: true,
      sourceDoctorId: true,
      sourceAppointmentId: true,
      targetDoctorId: true,
      targetCountryCode: true,
      orderId: true,
      consentTokenExpiresAt: true,
      pharmacyName: true,
      patientHealthIdNumber: true,
      patientPassportNumber: true,
      patientAddressLine1: true,
      patientAddressLine2: true,
      patientAddressCity: true,
      patientAddressPostalCode: true,
      patientAddressCountryCode: true,
    },
  });
  if (!request) throw new CrossBorderRxConsentInvalidError();
  if (
    !request.consentTokenExpiresAt ||
    request.consentTokenExpiresAt.getTime() < Date.now()
  ) {
    throw new CrossBorderRxConsentExpiredError();
  }
  return request;
}

async function resolveConsentParties(request: {
  sourceDoctorId: string;
  targetDoctorId: string;
  targetCountryCode: string;
}): Promise<{ sourceDoctorName: string | null; targetDoctorName: string; targetCountryName: string }> {
  const [sourceDoctor, targetDoctor, country] = await Promise.all([
    prisma.doctor.findUnique({
      where: { id: request.sourceDoctorId },
      select: { fullName: true },
    }),
    prisma.doctor.findUnique({
      where: { id: request.targetDoctorId },
      select: { fullName: true },
    }),
    prisma.country.findFirst({
      where: { code: { equals: request.targetCountryCode, mode: "insensitive" } },
      select: { name: true },
    }),
  ]);
  return {
    sourceDoctorName: sourceDoctor?.fullName ?? null,
    targetDoctorName: targetDoctor?.fullName ?? "the prescribing doctor",
    targetCountryName: country?.name ?? request.targetCountryCode.toUpperCase(),
  };
}

/** Public: disclosure view for the patient consent page. */
export async function getCrossBorderRxConsentView(
  token: string,
): Promise<CrossBorderRxConsentView> {
  const request = await loadRequestByConsentToken(token);
  const parties = await resolveConsentParties(request);

  let paymentUrl: string | null = null;
  let gpBookingUrl: string | null = null;
  if (request.status === "PENDING_PAYMENT" && request.orderId) {
    const order = await prisma.order.findUnique({
      where: { id: request.orderId },
      select: { stripeCheckoutUrl: true },
    });
    paymentUrl = order?.stripeCheckoutUrl ?? (await orderPayShortLink(request.orderId));
  } else if (request.status === "CONSENT_DECLINED") {
    gpBookingUrl = await buildGpBookingUrl(request.targetDoctorId, request.targetCountryCode);
  }

  // Prices shown on the choice screen so the patient can compare before
  // deciding — best-effort, never blocks the page if either lookup fails.
  const [feeConfig, gpService] = await Promise.all([
    prisma.doctorCrossBorderRxCountry.findFirst({
      where: {
        doctorId: request.targetDoctorId,
        priceCents: { gt: 0 },
        country: { code: { equals: request.targetCountryCode, mode: "insensitive" } },
      },
      select: { priceCents: true, country: { select: { currency: { select: { code: true } } } } },
    }),
    resolveGpSameDayService(request.targetCountryCode).catch(() => null),
  ]);
  const identityRequiresOneOf = request.targetCountryCode.trim().toLowerCase() === "br";

  // Pre-fill the payment-step form: prefer anything the patient already entered
  // on this request, else fall back to the source appointment + patient chart.
  const [srcAppt, profile] = await Promise.all([
    prisma.appointment.findUnique({
      where: { id: request.sourceAppointmentId },
      select: {
        phone: true,
        addressLine1: true,
        addressLine2: true,
        addressCity: true,
        addressPostalCode: true,
        addressCountryCode: true,
      },
    }),
    prisma.patientProfile.findUnique({
      where: { email: request.patientEmail.toLowerCase() },
      select: {
        phone: true,
        addressLine1: true,
        addressLine2: true,
        addressCity: true,
        addressPostalCode: true,
        addressCountryCode: true,
        preferredPharmacy: true,
        taxIdNumber: true,
        passportNumber: true,
      },
    }),
  ]);
  const pick = <T>(...vals: (T | null | undefined)[]): T | null =>
    vals.find((v) => v !== null && v !== undefined && v !== "") ?? null;

  // Only offer the chart's tax id as a prefill when it already belongs to the
  // target country — a Brazilian CPF must not land in an Irish PPS field.
  const chartIdIsLocal =
    profile?.addressCountryCode?.trim().toLowerCase() ===
    request.targetCountryCode.trim().toLowerCase();

  return {
    status: request.status,
    patientFullName: request.patientFullName,
    sourceDoctorName: parties.sourceDoctorName,
    targetDoctorName: parties.targetDoctorName,
    targetCountryName: parties.targetCountryName,
    targetCountryCode: request.targetCountryCode,
    healthIdLabel: patientTaxIdLabel(request.targetCountryCode),
    identityRequiresOneOf,
    prescriptionFeeCents: feeConfig?.priceCents ?? null,
    prescriptionFeeCurrency: feeConfig?.country.currency.code ?? null,
    gpConsultPriceCents: gpService?.basePriceCents ?? null,
    gpConsultCurrency: gpService?.currencyCode ?? null,
    prefill: {
      phone: pick(srcAppt?.phone, profile?.phone),
      pharmacyName: pick(request.pharmacyName, profile?.preferredPharmacy),
      healthIdNumber: pick(
        decryptPhi(request.patientHealthIdNumber),
        chartIdIsLocal ? decryptPhi(profile?.taxIdNumber ?? null) : null,
      ),
      passportNumber: pick(
        decryptPhi(request.patientPassportNumber),
        chartIdIsLocal ? decryptPhi(profile?.passportNumber ?? null) : null,
      ),
      addressLine1: pick(request.patientAddressLine1, srcAppt?.addressLine1, profile?.addressLine1),
      addressLine2: pick(request.patientAddressLine2, srcAppt?.addressLine2, profile?.addressLine2),
      addressCity: pick(request.patientAddressCity, srcAppt?.addressCity, profile?.addressCity),
      addressPostalCode: pick(
        request.patientAddressPostalCode,
        srcAppt?.addressPostalCode,
        profile?.addressPostalCode,
      ),
      addressCountryCode: pick(
        request.patientAddressCountryCode,
        srcAppt?.addressCountryCode,
        profile?.addressCountryCode,
      ),
    },
    paymentUrl,
    gpBookingUrl,
    canChangeDecision: request.status === "PENDING_PAYMENT" || request.status === "CONSENT_DECLINED",
  };
}

/** Public: patient agrees (→ payment) or declines (→ GP booking). */
export async function submitCrossBorderRxConsent(
  token: string,
  decision: CrossBorderRxConsentDecision,
  details?: Partial<CrossBorderRxDeliveryDetails>,
): Promise<CrossBorderRxConsentDecisionResult> {
  const request = await loadRequestByConsentToken(token);

  // Brazil needs ONE identity value to print on the prescription — CPF
  // (healthIdNumber) or, failing that, a passport number.
  if (
    decision === "AGREE" &&
    request.targetCountryCode.trim().toLowerCase() === "br" &&
    !details?.healthIdNumber?.trim() &&
    !details?.passportNumber?.trim()
  ) {
    throw new CrossBorderRxIdentityRequiredError(patientTaxIdLabel(request.targetCountryCode));
  }

  const deliveryData = details
    ? {
        pharmacyName: details.pharmacyName?.trim() || null,
        // Government id → encrypted at rest like every other stored id.
        patientHealthIdNumber: encryptPhi(details.healthIdNumber?.trim() || null),
        patientPassportNumber: encryptPhi(details.passportNumber?.trim() || null),
        patientAddressLine1: details.addressLine1?.trim() || null,
        patientAddressLine2: details.addressLine2?.trim() || null,
        patientAddressCity: details.addressCity?.trim() || null,
        patientAddressPostalCode: details.addressPostalCode?.trim() || null,
        patientAddressCountryCode: details.addressCountryCode?.trim() || null,
      }
    : null;

  // Idempotent resume: the link stays usable so a patient who closed the tab
  // can return. Re-issuing the same decision returns the same next step.
  if (request.status !== "PENDING_CONSENT") {
    if (decision === "AGREE" && request.status === "PENDING_PAYMENT") {
      if (deliveryData) {
        await prisma.crossBorderPrescriptionRequest.update({
          where: { id: request.id },
          data: deliveryData,
        });
      }
      const paymentUrl = await createAsyncFeeCheckoutForRequest(request.id);
      return { status: request.status, paymentUrl, gpBookingUrl: null };
    }
    if (decision === "DECLINE" && request.status === "CONSENT_DECLINED") {
      const gpBookingUrl = await buildGpBookingUrl(
        request.targetDoctorId,
        request.targetCountryCode,
      );
      return { status: request.status, paymentUrl: null, gpBookingUrl };
    }
    throw new CrossBorderRxNotActionableError();
  }

  if (decision === "AGREE") {
    // Re-take the SOAP snapshot first: the treating doctor may have written or
    // finished the consult note since raising the request, and what the patient
    // is consenting to is the record as it stands now. Frozen from here on.
    await refreshSoapSnapshot(request.id, request.sourceAppointmentId);
    // Record disclosure consent + the patient's pharmacy/address, then mint the
    // payment link. The SOAP snapshot becomes visible to Doctor B from here
    // (gated on status past PENDING_CONSENT).
    await prisma.crossBorderPrescriptionRequest.update({
      where: { id: request.id },
      data: { status: "PENDING_PAYMENT", soapConsentAt: new Date(), ...(deliveryData ?? {}) },
    });
    const paymentUrl = await createAsyncFeeCheckoutForRequest(request.id);
    return { status: "PENDING_PAYMENT", paymentUrl, gpBookingUrl: null };
  }

  // DECLINE → no disclosure, no async prescription. Offer a full GP consult
  // with the same doctor in their country (patient books a slot + fills form).
  await prisma.crossBorderPrescriptionRequest.update({
    where: { id: request.id },
    data: { status: "CONSENT_DECLINED", decidedAt: new Date() },
  });
  const gpBookingUrl = await buildGpBookingUrl(
    request.targetDoctorId,
    request.targetCountryCode,
  );
  return { status: "CONSENT_DECLINED", paymentUrl: null, gpBookingUrl };
}

/**
 * Public: patient changes their mind after AGREE (unpaid) or DECLINE, and
 * wants to see the original two-option choice screen again. Only allowed
 * while the async fee is still unpaid (PENDING_PAYMENT) or after a decline
 * (CONSENT_DECLINED) — once a doctor is already actioning the request
 * (AWAITING_DOCTOR onward) the decision is final.
 */
export async function revertCrossBorderRxConsent(token: string): Promise<{ status: string }> {
  const request = await loadRequestByConsentToken(token);
  if (request.status !== "PENDING_PAYMENT" && request.status !== "CONSENT_DECLINED") {
    throw new CrossBorderRxNotActionableError();
  }
  await prisma.crossBorderPrescriptionRequest.update({
    where: { id: request.id },
    data: { status: "PENDING_CONSENT", decidedAt: null, soapConsentAt: null },
  });
  return { status: "PENDING_CONSENT" };
}

/**
 * Deep link into the public booking funnel for a full GP (GENERAL) consultation
 * with the prescribing doctor in their country. Pre-selects the country's
 * GENERAL service + the doctor so the funnel lands on slot selection, then the
 * booking form. Degrades gracefully: drops whichever of service/doctor can't be
 * resolved, and as a last resort links the country's booking page. Only returns
 * null if the target country itself can't be resolved (should never happen).
 */
async function buildGpBookingUrl(
  targetDoctorId: string,
  targetCountryCode: string,
): Promise<string | null> {
  const [doctor, country, gpService] = await Promise.all([
    prisma.doctor.findUnique({ where: { id: targetDoctorId }, select: { slug: true } }),
    prisma.country.findFirst({
      where: { code: { equals: targetCountryCode, mode: "insensitive" } },
      select: { code: true, defaultLocale: true },
    }),
    resolveGpSameDayService(targetCountryCode).catch(() => null),
  ]);
  if (!country) return null;
  const base = env.PUBLIC_SITE_URL?.replace(/\/+$/, "") ?? "http://localhost:3000";
  const lang = country.defaultLocale.toLowerCase();
  const code = country.code.toLowerCase();
  const params = new URLSearchParams();
  if (gpService?.slug) params.set("service", gpService.slug);
  if (doctor?.slug) params.set("doctor", doctor.slug);
  const qs = params.toString();
  return `${base}/${code}/${lang}/book${qs ? `?${qs}` : ""}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── On async-fee payment: mint the async appointment + notify Doctor B ────────

/**
 * Called from the paid-order path (webhook + sync fallback). Idempotent:
 * guarded by the request status and the unique asyncAppointmentId, so
 * redelivery / the webhook-vs-sync race can't double-mint.
 */
export async function onCrossBorderRxFeePaid(
  orderId: string,
  log?: PaymentLog,
): Promise<void> {
  const request = await prisma.crossBorderPrescriptionRequest.findFirst({
    where: { orderId },
    select: {
      id: true,
      status: true,
      asyncAppointmentId: true,
      targetDoctorId: true,
      targetServiceId: true,
      targetCountryCode: true,
      patientEmail: true,
      patientFullName: true,
      sourceAppointmentId: true,
      sourceDoctorId: true,
      pharmacyName: true,
      patientHealthIdNumber: true,
      patientAddressLine1: true,
      patientAddressLine2: true,
      patientAddressCity: true,
      patientAddressPostalCode: true,
      patientAddressCountryCode: true,
    },
  });
  if (!request) return; // not a cross-border order
  if (request.status !== "PENDING_PAYMENT" || request.asyncAppointmentId) return; // already settled

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { orderNumber: true, currencyCode: true, totalCents: true, phone: true, userId: true },
  });

  const appt = await prisma.appointment.create({
    data: {
      userId: order?.userId ?? null,
      countryCode: request.targetCountryCode,
      consultationType: "cross-border-prescription",
      fullName: request.patientFullName,
      email: request.patientEmail,
      phone: order?.phone ?? null,
      consentAccepted: true,
      status: "REQUEST_RECEIVED",
      serviceId: request.targetServiceId,
      doctorId: request.targetDoctorId,
      amountCents: order?.totalCents ?? null,
      currencyCode: order?.currencyCode ?? null,
      paymentStatus: PaymentStatus.PAID,
      paidAt: new Date(),
      consultationMode: "ONLINE",
      // Patient-entered delivery details from the payment step.
      pharmacy: request.pharmacyName,
      // Already encrypted on the request — copied across as-is.
      patientHealthIdNumber: request.patientHealthIdNumber,
      addressLine1: request.patientAddressLine1,
      addressLine2: request.patientAddressLine2,
      addressCity: request.patientAddressCity,
      addressPostalCode: request.patientAddressPostalCode,
      addressCountryCode: request.patientAddressCountryCode,
    },
    select: { id: true },
  });

  // Dual-write into the relational join table + legacy array (same pattern as
  // complete-order-payment.service.ts) — without this the admin/patient order
  // views can't resolve the doctor/consultation for a paid cross-border order,
  // since they read through `orderAppointments`, not `CrossBorderPrescriptionRequest`.
  await prisma.orderAppointment.createMany({
    data: [{ orderId, appointmentId: appt.id }],
    skipDuplicates: true,
  });
  await prisma.order.update({
    where: { id: orderId },
    data: { appointmentIds: { push: appt.id } },
  });

  await ensureConsultationDraft(appt.id, request.targetDoctorId);

  // The patient's record travels with them. Without this the prescribing
  // doctor opens a name, an email and nothing else — the patient chart is
  // scoped to `doctorId = self`, so none of the referring doctor's history is
  // reachable from here. Both steps swallow their own failures: a paid order
  // must still produce a consultation even if S3 is having a bad day.
  await copyDisclosedPatientContext({
    sourceAppointmentId: request.sourceAppointmentId,
    targetAppointmentId: appt.id,
    log,
  });
  await copyDisclosedDocuments({
    sourceAppointmentId: request.sourceAppointmentId,
    targetAppointmentId: appt.id,
    targetDoctorId: request.targetDoctorId,
    sourceDoctorId: request.sourceDoctorId,
    log,
  });
  // Authorise the prescriber to READ the patient's record. The patient's
  // disclosure consent is the authorisation; without a live MedicalAccessGrant
  // the enforce-mode guard 403s every cross-border read and the consultation
  // opens empty ("vanishes"). Best-effort — a paid order still stands.
  await grantPrescriberMedicalAccess(request.patientEmail, request.targetDoctorId, log);

  await prisma.crossBorderPrescriptionRequest.update({
    where: { id: request.id },
    data: {
      asyncAppointmentId: appt.id,
      status: "AWAITING_DOCTOR",
      paidAt: new Date(),
    },
  });

  // Portal bell for the prescribing doctor (existing), plus WhatsApp + email to
  // the doctor AND the admin team via the shared drip helpers.
  await notifyDoctor(request.targetDoctorId, "CROSS_BORDER_RX_REQUESTED", {
    appointmentId: appt.id,
    snippet: `${request.patientFullName} · cross-border prescription request`,
  }).catch((err) => log?.warn({ err, orderId }, "Cross-border Rx doctor notify failed"));

  await notifyStaffCrossBorderRequest({
    orderId,
    orderNumber: order?.orderNumber ?? orderId,
    targetDoctorId: request.targetDoctorId,
  }).catch((err) => log?.warn({ err, orderId }, "Cross-border Rx staff notify failed"));
}

/**
 * Mint a MedicalAccessGrant so the prescribing doctor (Doctor B) can read the
 * patient's record for the async consultation. The patient's disclosure consent
 * is the authorisation. Idempotent (skips if a live grant already exists) and
 * best-effort (never throws into the paid-order path). No-op when the patient
 * has no profile (then the read guard doesn't gate the record anyway) or the
 * prescriber has no login user.
 */
const CROSS_BORDER_GRANT_DAYS = 90;
async function grantPrescriberMedicalAccess(
  patientEmail: string,
  targetDoctorId: string,
  log?: PaymentLog,
): Promise<void> {
  try {
    const [patient, prescriberUser] = await Promise.all([
      prisma.patientProfile.findUnique({
        where: { email: patientEmail.toLowerCase() },
        select: { id: true, countryFolderCode: true },
      }),
      prisma.user.findFirst({
        where: { doctorId: targetDoctorId, isActive: true },
        select: { id: true },
      }),
    ]);
    if (!patient || !prescriberUser) return;

    const now = new Date();
    const existing = await prisma.medicalAccessGrant.findFirst({
      where: {
        grantedToUserId: prescriberUser.id,
        patientProfileId: patient.id,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      select: { id: true },
    });
    if (existing) return;

    const accessRequest = await prisma.medicalAccessRequest.create({
      data: {
        patientProfileId: patient.id,
        requestingDoctorId: targetDoctorId,
        requestingUserId: prescriberUser.id,
        patientOriginCountry: patient.countryFolderCode ?? null,
        requestedAccessScope: "GLOBAL_NETWORK",
        reason: "Cross-border prescription — patient consented to sharing their record.",
        status: "APPROVED",
        approvedAt: now,
      },
      select: { id: true },
    });
    await prisma.medicalAccessGrant.create({
      data: {
        accessRequestId: accessRequest.id,
        patientProfileId: patient.id,
        grantedToUserId: prescriberUser.id,
        grantedToRole: "DOCTOR",
        scope: "GLOBAL_NETWORK",
        expiresAt: new Date(now.getTime() + CROSS_BORDER_GRANT_DAYS * 24 * 60 * 60 * 1000),
      },
    });
  } catch (err) {
    log?.warn({ err }, "Cross-border Rx: failed to grant prescriber medical access");
  }
}

// ── On upgrade payment: link the full consultation back to the request ───────

/**
 * Called from the paid-order path for EVERY paid order (alongside
 * onCrossBorderRxFeePaid). When a patient who was refused takes the upgrade
 * link and books + pays for a full consultation with the same prescribing
 * doctor, this links that appointment back to the refused request and flips it
 * to UPGRADED.
 *
 * The upgrade goes through the ordinary public booking funnel (the patient
 * picks a real slot), so there is no request id to thread through it. We match
 * deterministically on (target doctor, patient email, REFUSED, not-yet-linked)
 * and only accept a consultation minted after the refusal. Idempotent: the
 * unique asyncAppointmentId/upgradeAppointmentId columns + the status guard
 * make redelivery a no-op, and a request already UPGRADED is skipped.
 */
export async function linkCrossBorderUpgradeOnPaid(
  orderId: string,
  log?: PaymentLog,
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { appointmentIds: true },
  });
  if (!order || order.appointmentIds.length === 0) return;

  const appts = await prisma.appointment.findMany({
    where: {
      id: { in: order.appointmentIds },
      // The async consult itself lives on a different (fee) order; never match it.
      consultationType: { not: "cross-border-prescription" },
    },
    select: { id: true, doctorId: true, email: true, createdAt: true },
  });

  for (const appt of appts) {
    if (!appt.doctorId) continue;
    const request = await prisma.crossBorderPrescriptionRequest.findFirst({
      where: {
        targetDoctorId: appt.doctorId,
        patientEmail: { equals: appt.email, mode: "insensitive" },
        status: "REFUSED",
        upgradeAppointmentId: null,
      },
      orderBy: [{ decidedAt: "desc" }],
      select: { id: true, decidedAt: true, sourceDoctorId: true, sourceAppointmentId: true, patientFullName: true },
    });
    if (!request) continue;
    // Only accept a consultation booked at/after the refusal.
    if (request.decidedAt && appt.createdAt < request.decidedAt) continue;

    // Atomic guard: only the first linker (upgradeAppointmentId still null) wins;
    // a redelivery / concurrent payment updates zero rows and is skipped.
    const linked = await prisma.crossBorderPrescriptionRequest.updateMany({
      where: { id: request.id, upgradeAppointmentId: null },
      data: { status: "UPGRADED", upgradeAppointmentId: appt.id },
    });
    if (linked.count === 0) continue;

    await notifySourceDoctor(request.sourceDoctorId, request.sourceAppointmentId, {
      snippet: `${request.patientFullName} · upgraded to a full consultation`,
    });
    void notifyAdmins("CROSS_BORDER_RX_UPDATED", {
      snippet: `${request.patientFullName} · cross-border request upgraded to full consultation`,
    }).catch((err) => log?.warn({ err, orderId }, "Cross-border upgrade admin notify failed"));
  }
}

// ── Doctor B inbox ───────────────────────────────────────────────────────────

export type CrossBorderRxInboxItem = {
  id: string;
  status: string;
  patientFullName: string;
  clinicalSummary: string;
  /** Disclosed source-consultation SOAP snapshot (patient consented). */
  soap: {
    chiefComplaint: string | null;
    subjective: string | null;
    objective: string | null;
    assessment: string | null;
    plan: string | null;
    noteFormat: "SOAP" | "FREEFORM";
    note: string | null;
  };
  asyncAppointmentId: string | null;
  sourceDoctorName: string | null;
  createdAt: string;
};

export async function listCrossBorderRxInbox(
  doctorId: string,
): Promise<{ items: CrossBorderRxInboxItem[] }> {
  try {
    const rows = await prisma.crossBorderPrescriptionRequest.findMany({
      where: {
        targetDoctorId: doctorId,
        status: { in: ["AWAITING_DOCTOR", "MORE_INFO"] },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 100,
      select: {
        id: true,
        status: true,
        patientFullName: true,
        clinicalSummary: true,
        sourceChiefComplaint: true,
        sourceSubjective: true,
        sourceObjective: true,
        sourceAssessment: true,
        sourcePlan: true,
        sourceNoteFormat: true,
        sourceNote: true,
        asyncAppointmentId: true,
        sourceDoctorId: true,
        createdAt: true,
      },
    });

    const sourceDoctorIds = Array.from(new Set(rows.map((r) => r.sourceDoctorId)));
    const doctors = sourceDoctorIds.length
      ? await prisma.doctor.findMany({
          where: { id: { in: sourceDoctorIds } },
          select: { id: true, fullName: true },
        })
      : [];
    const nameById = new Map(doctors.map((d) => [d.id, d.fullName]));

    return {
      items: rows.map((r) => ({
        id: r.id,
        status: r.status,
        patientFullName: r.patientFullName,
        clinicalSummary: r.clinicalSummary,
        soap: {
          chiefComplaint: r.sourceChiefComplaint,
          subjective: r.sourceSubjective,
          objective: r.sourceObjective,
          assessment: r.sourceAssessment,
          plan: r.sourcePlan,
          noteFormat: r.sourceNoteFormat,
          note: r.sourceNote,
        },
        asyncAppointmentId: r.asyncAppointmentId,
        sourceDoctorName: nameById.get(r.sourceDoctorId) ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    throw normalizeDbError(error, "Cross-border prescription inbox is unavailable");
  }
}

// ── Doctor B decision ────────────────────────────────────────────────────────

export type CrossBorderRxDecision = "ACCEPT" | "MORE_INFO" | "REFUSE";

export type DecideCrossBorderRxInput = {
  requestId: string;
  /** Doctor B — must be the request's target doctor. */
  doctorId: string;
  actorUserId: string | null;
  decision: CrossBorderRxDecision;
  /** Required for MORE_INFO; optional note otherwise. */
  message?: string | null;
};

export type DecideCrossBorderRxResult = {
  status: string;
  upgradeUrl: string | null;
};

export async function decideCrossBorderRxRequest(
  input: DecideCrossBorderRxInput,
): Promise<DecideCrossBorderRxResult> {
  const request = await prisma.crossBorderPrescriptionRequest.findFirst({
    where: { id: input.requestId, targetDoctorId: input.doctorId },
    select: {
      id: true,
      status: true,
      asyncAppointmentId: true,
      sourceDoctorId: true,
      sourceAppointmentId: true,
      patientEmail: true,
      patientFullName: true,
      targetDoctorId: true,
      targetCountryCode: true,
    },
  });
  if (!request) throw new CrossBorderRxRequestNotFoundError();
  if (request.status !== "AWAITING_DOCTOR" && request.status !== "MORE_INFO") {
    throw new CrossBorderRxNotActionableError();
  }

  const patientUserId = await resolvePatientUserId(request.patientEmail);

  if (input.decision === "ACCEPT") {
    // Accepting only commits Doctor B to prescribing and opens the workspace
    // (the frontend navigates there). The patient + Doctor A "prescription
    // sent" notifications and the appointment completion fire later, when the
    // prescription DOCUMENT is finalised — see finaliseCrossBorderRxInTransaction.
    await prisma.crossBorderPrescriptionRequest.update({
      where: { id: request.id },
      data: { status: "ACCEPTED", decidedAt: new Date() },
    });
    return { status: "ACCEPTED", upgradeUrl: null };
  }

  if (input.decision === "MORE_INFO") {
    const message = input.message?.trim();
    if (!message) throw new CrossBorderRxMessageRequiredError();
    // Route the question to the patient (via their consultation chat on the
    // async appointment) and to Doctor A (portal bell). Status stays open.
    if (request.asyncAppointmentId) {
      await prisma.consultationMessage.create({
        data: {
          appointmentId: request.asyncAppointmentId,
          authorRole: "DOCTOR",
          authorUserId: input.actorUserId,
          body: message,
        },
      });
    }
    // New round: overwrites any still-unanswered previous question.
    await prisma.crossBorderPrescriptionRequest.update({
      where: { id: request.id },
      data: {
        status: "MORE_INFO",
        moreInfoQuestion: message,
        moreInfoAnswer: null,
        moreInfoAskedAt: new Date(),
        moreInfoAnsweredAt: null,
      },
    });
    await notifySourceDoctor(request.sourceDoctorId, request.sourceAppointmentId, {
      snippet: `${request.patientFullName} · more information requested`,
    });
    // Doctor A answers in-portal, on their own appointment's consultation
    // tab — link straight there, no public token/link needed.
    await notifySourceDoctorMoreInfoRequested({
      sourceDoctorId: request.sourceDoctorId,
      patientFullName: request.patientFullName,
      question: message,
      appointmentUrl: `${env.PUBLIC_SITE_URL?.replace(/\/+$/, "") ?? "http://localhost:3000"}/doctor/appointments/${request.sourceAppointmentId}?tab=consultation`,
    });
    if (patientUserId) {
      await notifyUser(patientUserId, "CROSS_BORDER_RX_UPDATED", {
        title: "The prescribing doctor needs more information",
        body: message,
        href: "/account/bookings",
      }).catch(() => {});
    }
    return { status: "MORE_INFO", upgradeUrl: null };
  }

  // REFUSE → offer a full-consultation upgrade (full price) with Doctor B.
  const upgradeUrl = await buildUpgradeBookingUrl(request.targetDoctorId, request.targetCountryCode, request.id);
  await prisma.crossBorderPrescriptionRequest.update({
    where: { id: request.id },
    data: { status: "REFUSED", decidedAt: new Date() },
  });
  await notifySourceDoctor(request.sourceDoctorId, request.sourceAppointmentId, {
    snippet: `${request.patientFullName} · prescription declined`,
  });
  if (patientUserId) {
    await notifyUser(patientUserId, "CROSS_BORDER_RX_UPDATED", {
      title: "A full consultation is recommended",
      body: input.message?.trim()
        ? input.message.trim()
        : "The prescribing doctor recommends a full consultation before a prescription can be issued.",
      href: upgradeUrl ?? "/account/bookings",
    }).catch(() => {});
  }
  void sendCrossBorderRxRefusalEmail(
    request.patientEmail,
    request.patientFullName,
    upgradeUrl,
    input.message?.trim() ?? null,
  ).catch(() => {});

  return { status: "REFUSED", upgradeUrl };
}

// ── Doctor A: answer Doctor B's "more information" request (in-portal) ─────

export type CrossBorderRxPendingMoreInfo = {
  targetDoctorName: string;
  question: string;
  answer: string | null;
  answered: boolean;
};

/**
 * Doctor A's own appointment page reads this to show (or not show) the
 * pending-question panel. Returns null when there's nothing pending — no
 * open MORE_INFO round on a request sourced from this appointment.
 */
export async function getPendingMoreInfoForSourceAppointment(
  appointmentId: string,
  doctorId: string,
): Promise<CrossBorderRxPendingMoreInfo | null> {
  const request = await prisma.crossBorderPrescriptionRequest.findFirst({
    where: { sourceAppointmentId: appointmentId, sourceDoctorId: doctorId, status: "MORE_INFO" },
    select: { targetDoctorId: true, moreInfoQuestion: true, moreInfoAnswer: true, moreInfoAnsweredAt: true },
  });
  if (!request || !request.moreInfoQuestion) return null;
  const targetDoctor = await prisma.doctor.findUnique({
    where: { id: request.targetDoctorId },
    select: { fullName: true },
  });
  return {
    targetDoctorName: targetDoctor?.fullName ?? "the prescribing doctor",
    question: request.moreInfoQuestion,
    answer: request.moreInfoAnswer,
    answered: request.moreInfoAnsweredAt !== null,
  };
}

/**
 * Doctor A submits their answer from the appointment's consultation tab.
 * Attaches it to this appointment's MedicalNote history (permanent
 * consultation record) and notifies Doctor B (email + WhatsApp) so they know
 * to come back and decide. One answer per MORE_INFO round — a later
 * MORE_INFO decision opens a fresh round (see decideCrossBorderRxRequest).
 */
export async function answerPendingMoreInfo(
  appointmentId: string,
  doctorId: string,
  actorDoctorDisplayName: string,
  answer: string,
): Promise<{ status: "ANSWERED" }> {
  const trimmed = answer.trim();
  if (!trimmed) throw new CrossBorderRxAnswerRequiredError();

  const request = await prisma.crossBorderPrescriptionRequest.findFirst({
    where: { sourceAppointmentId: appointmentId, sourceDoctorId: doctorId, status: "MORE_INFO" },
    select: { id: true, targetDoctorId: true, patientFullName: true, moreInfoQuestion: true, moreInfoAnsweredAt: true },
  });
  if (!request || !request.moreInfoQuestion) throw new CrossBorderRxMoreInfoNotFoundError();
  if (request.moreInfoAnsweredAt) throw new CrossBorderRxMoreInfoAlreadyAnsweredError();

  const targetDoctor = await prisma.doctor.findUnique({
    where: { id: request.targetDoctorId },
    select: { fullName: true },
  });

  await prisma.crossBorderPrescriptionRequest.update({
    where: { id: request.id },
    data: { moreInfoAnswer: trimmed, moreInfoAnsweredAt: new Date() },
  });

  await createMedicalNote({
    appointmentId,
    doctorId,
    doctorDisplayName: actorDoctorDisplayName,
    content: `Reply to ${targetDoctor?.fullName ?? "the prescribing doctor"}'s request for more information (cross-border prescription):\n\nQ: ${request.moreInfoQuestion}\n\nA: ${trimmed}`,
  }).catch(() => {});

  await notifyTargetDoctorMoreInfoAnswered({
    targetDoctorId: request.targetDoctorId,
    patientFullName: request.patientFullName,
    question: request.moreInfoQuestion,
    answer: trimmed,
  });

  return { status: "ANSWERED" };
}
/**
 * The async consultation behind a cross-border prescription was already
 * terminal (cancelled, or completed by another request). Thrown from inside
 * the caller's transaction so every write in it — the document flag, the
 * request claim, the appointment completion — rolls back together.
 */
export class CrossBorderRxTerminalAppointmentError extends Error {
  constructor(appointmentStatus: string) {
    super(
      `The consultation behind this prescription is ${appointmentStatus} and can no longer be finalised.`,
    );
    this.name = "CrossBorderRxTerminalAppointmentError";
  }
}

/** Everything `notifyCrossBorderRxFinalised` needs once the writes commit. */
export type CrossBorderRxFinalisedContext = {
  sourceDoctorId: string;
  sourceAppointmentId: string;
  patientEmail: string;
  patientFullName: string;
  targetCountryCode: string;
};

/** The subset of the Prisma client this needs — a client or a transaction. */
type CrossBorderRxTx = Pick<
  Prisma.TransactionClient,
  "crossBorderPrescriptionRequest" | "appointment"
>;

/**
 * Database half of "Doctor B finalised the prescription DOCUMENT". This is the
 * true "prescription issued" moment: mark the request ACCEPTED + finalised and
 * complete the async appointment (payout + chat lock).
 *
 * Runs inside the CALLER's transaction so the caller's own writes — notably
 * `GeneratedDocument.sentToPatient` — commit or roll back with these. A
 * cancellation landing between the status read and the compare-and-swap
 * matches zero rows and throws, taking the whole transaction with it.
 *
 * Returns null when there is no open cross-border request behind this
 * appointment: either an ordinary prescription (the common case) or a
 * consultation whose request one earlier document already finalised. Both must
 * finalise the document normally — that is the documented idempotency.
 *
 * Notifications are deliberately NOT sent here; they belong after the commit.
 * See `notifyCrossBorderRxFinalised`.
 */
export async function finaliseCrossBorderRxInTransaction(
  tx: CrossBorderRxTx,
  asyncAppointmentId: string,
): Promise<CrossBorderRxFinalisedContext | null> {
  const request = await tx.crossBorderPrescriptionRequest.findFirst({
    where: {
      asyncAppointmentId,
      finalisedAt: null,
      status: { in: ["AWAITING_DOCTOR", "MORE_INFO", "ACCEPTED"] },
    },
    select: {
      id: true,
      sourceDoctorId: true,
      sourceAppointmentId: true,
      patientEmail: true,
      patientFullName: true,
      targetCountryCode: true,
    },
  });
  if (!request) return null;

  // The async consultation must still be live. Completing a CANCELLED one
  // counts it toward payout, reopens the chat-lock window and — because
  // `doctorHasTreatmentRelationship` excludes only CANCELLED — re-establishes
  // the prescriber's PHI access. Same "is this still live" probe the patient
  // cancel/reschedule paths use: terminal statuses have no outgoing
  // transitions, so probing against CANCELLED answers it without inventing a
  // second matrix. Deliberately a liveness check only — it does not enforce
  // ordered progression through CONTACTED, because every appointment is
  // created REQUEST_RECEIVED and nothing auto-sets CONTACTED.
  const appointment = await tx.appointment.findUnique({
    where: { id: asyncAppointmentId },
    select: { status: true },
  });
  if (!appointment) throw new CrossBorderRxTerminalAppointmentError("MISSING");
  try {
    assertValidStatusTransition(appointment.status, "CANCELLED");
  } catch {
    throw new CrossBorderRxTerminalAppointmentError(appointment.status);
  }

  // Atomic guard: only the first finalise wins. Losing here means a concurrent
  // finalise already claimed the request, so this one has nothing to do —
  // the document still finalises, matching the pre-existing idempotency.
  const claimed = await tx.crossBorderPrescriptionRequest.updateMany({
    where: { id: request.id, finalisedAt: null },
    data: { status: "ACCEPTED", finalisedAt: new Date(), decidedAt: new Date() },
  });
  if (claimed.count === 0) return null;

  // Complete the async appointment (counts toward payout; starts chat lock).
  // Compare-and-swap on the status validated above: a cancellation landing in
  // between matches zero rows and aborts the whole transaction.
  const completed = await tx.appointment.updateMany({
    where: { id: asyncAppointmentId, status: appointment.status },
    data: { status: "COMPLETED", consultationCompletedAt: new Date() },
  });
  if (completed.count === 0) {
    // The status moved between the read and this write. Re-read it so the
    // message names what the appointment actually is now, rather than the
    // value we validated a moment ago.
    const current = await tx.appointment.findUnique({
      where: { id: asyncAppointmentId },
      select: { status: true },
    });
    throw new CrossBorderRxTerminalAppointmentError(current?.status ?? "MISSING");
  }

  return request;
}

/**
 * Post-commit tail for a finalised cross-border prescription: the patient and
 * Doctor A "sent to pharmacy" messages. Runs only after the writes have
 * committed, so nobody is told about a completion that rolled back.
 */
export async function notifyCrossBorderRxFinalised(
  request: CrossBorderRxFinalisedContext,
): Promise<void> {
  // Doctor A (requesting): portal bell + email/WhatsApp.
  await notifySourceDoctor(request.sourceDoctorId, request.sourceAppointmentId, {
    snippet: `${request.patientFullName} · prescription finalised`,
  });
  void notifyRequestingDoctorFinalised(
    request.sourceDoctorId,
    request.patientFullName,
  ).catch(() => {});

  // Patient: portal bell + email + WhatsApp — sent to pharmacy.
  const patientUserId = await resolvePatientUserId(request.patientEmail);
  if (patientUserId) {
    void notifyUser(patientUserId, "CROSS_BORDER_RX_UPDATED", {
      title: "Your prescription is on its way",
      body: "Your prescription has been finalised and sent to your pharmacy. You should receive your medicine within a few days.",
      href: "/account/bookings",
    }).catch(() => {});
  }
  const src = await prisma.appointment.findUnique({
    where: { id: request.sourceAppointmentId },
    select: { phone: true, whatsappConsent: true, countryCode: true },
  });
  void notifyPatientCrossBorderAccepted({
    fullName: request.patientFullName,
    email: request.patientEmail,
    phone: src?.phone ?? null,
    countryCode: src?.countryCode ?? request.targetCountryCode,
    whatsappConsent: src?.whatsappConsent ?? false,
  }).catch(() => {});
}

async function resolvePatientUserId(email: string): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, isActive: true },
    select: { id: true },
  });
  return user?.id ?? null;
}

async function notifySourceDoctor(
  sourceDoctorId: string,
  sourceAppointmentId: string,
  payload: { snippet: string },
): Promise<void> {
  await notifyDoctor(sourceDoctorId, "CROSS_BORDER_RX_UPDATED", {
    appointmentId: sourceAppointmentId,
    snippet: payload.snippet,
  }).catch(() => {});
}

/**
 * Best-effort deep link into the public booking funnel for a full consultation
 * with Doctor B in the target country. The patient picks a slot and pays the
 * full catalogue price there. Returns null if the doctor has no public slug.
 */
async function buildUpgradeBookingUrl(
  doctorId: string,
  targetCountryCode: string,
  requestId: string,
): Promise<string | null> {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: { slug: true },
  });
  const country = await prisma.country.findFirst({
    where: { code: { equals: targetCountryCode, mode: "insensitive" } },
    select: { code: true, defaultLocale: true },
  });
  if (!doctor?.slug || !country) return null;
  const base = env.PUBLIC_SITE_URL?.replace(/\/+$/, "") ?? "http://localhost:3000";
  const lang = country.defaultLocale.toLowerCase();
  return `${base}/${country.code.toLowerCase()}/${lang}/doctors/${doctor.slug}?upgrade=${requestId}`;
}

async function sendCrossBorderRxRefusalEmail(
  to: string,
  fullName: string,
  upgradeUrl: string | null,
  message: string | null,
): Promise<void> {
  const subject = "Your prescription request — next steps";
  const cta = upgradeUrl
    ? `<p style="margin:20px 0;"><a href="${escapeHtml(upgradeUrl)}" style="display:inline-block;padding:12px 22px;background:#1D4B36;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600;">Book a full consultation</a></p><p style="font-size:13px;color:#6D6D6D;">Or open this link:<br>${escapeHtml(upgradeUrl)}</p>`
    : "";
  const note = message ? `<p>${escapeHtml(message)}</p>` : "";
  const html = wrapHtml(
    "Your prescription request — next steps",
    `<p>Dear ${escapeHtml(fullName)},</p>
     <p>The prescribing doctor was unable to issue your prescription asynchronously
     and recommends a full consultation.</p>
     ${note}
     ${cta}`,
  );
  const text = `Dear ${fullName},\n\nThe prescribing doctor recommends a full consultation before a prescription can be issued.${
    message ? `\n\n${message}` : ""
  }${upgradeUrl ? `\n\nBook here: ${upgradeUrl}` : ""}`;
  await sendEmail({ to, subject, html, text });
  // Keep admins in the loop on refusals (no dedicated admin type; reuse the bell).
  void notifyAdmins("CROSS_BORDER_RX_UPDATED", {
    snippet: `${fullName} · cross-border prescription refused`,
  }).catch(() => {});
}
