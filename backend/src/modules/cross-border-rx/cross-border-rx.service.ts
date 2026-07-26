import type { FastifyRequest } from "fastify";
import { createHash, randomBytes } from "node:crypto";
import { CartItemKind, PaymentStatus } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { generateOrderNumber } from "../../lib/order-number.js";
import { getStripeClient, isStripeConfigured } from "../../lib/stripe/client.js";
import { buildPtStripeInvoiceData } from "../invoices/pt-stripe-invoice-data.js";
import { ensureConsultationDraft } from "../consultations/ensure-consultation-draft.js";
import { notifyDoctor, notifyUser, notifyAdmins } from "../notifications/notify.service.js";
import { sendEmail } from "../../lib/email/send-email.js";
import { wrapHtml } from "../../lib/email/templates.js";
import { orderPayShortLink } from "../orders/order-payment-url.service.js";
import { resolveGpSameDayService } from "../gp-booking/gp-config.service.js";
import {
  notifyPatientCrossBorderConsent,
  notifyPatientCrossBorderPayment,
  notifyStaffCrossBorderRequest,
} from "./cross-border-rx-notifications.service.js";
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

    const doctors = await prisma.doctor.findMany({
      where: {
        crossBorderRxEnabled: true,
        active: true,
        crossBorderRxPriceCents: { gt: 0 },
        country: { isActive: true },
      },
      orderBy: [{ country: { name: "asc" } }, { fullName: "asc" }],
      select: {
        id: true,
        fullName: true,
        title: true,
        country: { select: { code: true, name: true } },
      },
    });

    const sourceCountry = source.countryCode.toLowerCase();
    const byCountry = new Map<string, CrossBorderRxTargetCountry>();
    for (const d of doctors) {
      const code = d.country.code.toLowerCase();
      if (code === sourceCountry) continue; // must be a DIFFERENT jurisdiction
      let entry = byCountry.get(code);
      if (!entry) {
        entry = { countryCode: d.country.code, countryName: d.country.name, doctors: [] };
        byCountry.set(code, entry);
      }
      entry.doctors.push({ id: d.id, fullName: d.fullName, title: d.title });
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

  // Resolve the chosen prescriber (Doctor B): cross-border-enabled, active,
  // priced, and whose PRIMARY country is the requested target. One query
  // enforces all of it — a crafted payload can't reach a doctor who isn't set
  // up. Fee + payout come from the doctor's own config, not a service.
  const doctor = await prisma.doctor.findFirst({
    where: {
      id: input.targetDoctorId,
      crossBorderRxEnabled: true,
      active: true,
      crossBorderRxPriceCents: { gt: 0 },
      country: { code: { equals: input.targetCountryCode, mode: "insensitive" }, isActive: true },
    },
    select: {
      id: true,
      fullName: true,
      crossBorderRxPriceCents: true,
      crossBorderRxPayoutCents: true,
      country: { select: { code: true, name: true } },
    },
  });
  if (!doctor || doctor.crossBorderRxPriceCents == null || doctor.crossBorderRxPriceCents <= 0) {
    throw new CrossBorderRxTargetNotAvailableError();
  }
  const targetCountryCode = doctor.country.code;
  // Must be a DIFFERENT jurisdiction than the treating doctor's.
  if (source.countryCode.toLowerCase() === targetCountryCode.toLowerCase()) {
    throw new CrossBorderRxTargetNotAvailableError();
  }
  // Fail fast if the target market can't take payment — the patient will need
  // it after consenting, so surfacing it now saves a dead-end consent link.
  if (!isStripeConfigured(targetCountryCode)) {
    throw new CrossBorderRxStripeNotConfiguredError();
  }

  // Snapshot the source consultation's SOAP note. Fixed at request time so the
  // record the patient consents to disclose can't drift. Disclosed to Doctor B
  // only after consent (enforced by the status gate).
  const soap = await prisma.consultation.findUnique({
    where: { appointmentId: source.id },
    select: {
      chiefComplaint: true,
      subjective: true,
      objective: true,
      assessment: true,
      plan: true,
    },
  });

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
      payoutCents: doctor.crossBorderRxPayoutCents ?? null,
      // Optional now — the consultation SOAP is disclosed to Doctor B, so the
      // treating doctor no longer has to re-type a summary. Stored as "" when
      // omitted (the column is NOT NULL); the inbox hides an empty reason.
      clinicalSummary: input.clinicalSummary?.trim() ?? "",
      sourceChiefComplaint: soap?.chiefComplaint ?? null,
      sourceSubjective: soap?.subjective ?? null,
      sourceObjective: soap?.objective ?? null,
      sourceAssessment: soap?.assessment ?? null,
      sourcePlan: soap?.plan ?? null,
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
    return existing?.stripeCheckoutUrl ?? orderPayShortLink(request.orderId);
  }

  const doctor = await prisma.doctor.findFirst({
    where: {
      id: request.targetDoctorId,
      crossBorderRxEnabled: true,
      active: true,
      crossBorderRxPriceCents: { gt: 0 },
    },
    select: {
      fullName: true,
      crossBorderRxPriceCents: true,
      country: { select: { code: true, currency: { select: { code: true } } } },
    },
  });
  if (!doctor || doctor.crossBorderRxPriceCents == null || doctor.crossBorderRxPriceCents <= 0) {
    throw new CrossBorderRxTargetNotAvailableError();
  }
  const targetCountryCode = doctor.country.code;
  if (!isStripeConfigured(targetCountryCode)) {
    throw new CrossBorderRxStripeNotConfiguredError();
  }
  const priceCents = doctor.crossBorderRxPriceCents;
  const currency = doctor.country.currency.code;
  const serviceName = `Cross-border prescription — ${doctor.fullName}`;

  const source = await prisma.appointment.findUnique({
    where: { id: request.sourceAppointmentId },
    select: { phone: true, whatsappConsent: true, userId: true },
  });

  const orderNumber = await generateOrderNumber();
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

  return session.url ?? orderPayShortLink(order.id);
}

// ── Patient consent (public, token-based) ────────────────────────────────────

export type CrossBorderRxConsentView = {
  status: string;
  patientFullName: string;
  sourceDoctorName: string | null;
  targetDoctorName: string;
  targetCountryName: string;
  /** Present when the patient already consented — resume payment. */
  paymentUrl: string | null;
  /** Present when the patient declined — book a full GP consult instead. */
  gpBookingUrl: string | null;
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
      sourceDoctorId: true,
      targetDoctorId: true,
      targetCountryCode: true,
      orderId: true,
      consentTokenExpiresAt: true,
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
    paymentUrl = order?.stripeCheckoutUrl ?? orderPayShortLink(request.orderId);
  } else if (request.status === "CONSENT_DECLINED") {
    gpBookingUrl = await buildGpBookingUrl(request.targetDoctorId, request.targetCountryCode);
  }

  return {
    status: request.status,
    patientFullName: request.patientFullName,
    sourceDoctorName: parties.sourceDoctorName,
    targetDoctorName: parties.targetDoctorName,
    targetCountryName: parties.targetCountryName,
    paymentUrl,
    gpBookingUrl,
  };
}

/** Public: patient agrees (→ payment) or declines (→ GP booking). */
export async function submitCrossBorderRxConsent(
  token: string,
  decision: CrossBorderRxConsentDecision,
): Promise<CrossBorderRxConsentDecisionResult> {
  const request = await loadRequestByConsentToken(token);

  // Idempotent resume: the link stays usable so a patient who closed the tab
  // can return. Re-issuing the same decision returns the same next step.
  if (request.status !== "PENDING_CONSENT") {
    if (decision === "AGREE" && request.status === "PENDING_PAYMENT") {
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
    // Record disclosure consent, then mint the payment link. The SOAP snapshot
    // becomes visible to Doctor B from here (gated on status past PENDING_CONSENT).
    await prisma.crossBorderPrescriptionRequest.update({
      where: { id: request.id },
      data: { status: "PENDING_PAYMENT", soapConsentAt: new Date() },
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
    },
    select: { id: true },
  });

  await ensureConsultationDraft(appt.id, request.targetDoctorId);

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
    await prisma.crossBorderPrescriptionRequest.update({
      where: { id: request.id },
      data: { status: "ACCEPTED", decidedAt: new Date() },
    });
    // Close the async consultation so it counts toward Doctor B's monthly
    // payout statement (which only totals COMPLETED appointments) and starts
    // the consultation-chat lock window. Doctor B still issues the actual
    // prescription through the normal Rx tools on this appointment.
    if (request.asyncAppointmentId) {
      await prisma.appointment
        .update({
          where: { id: request.asyncAppointmentId, consultationCompletedAt: null },
          data: { status: "COMPLETED", consultationCompletedAt: new Date() },
        })
        .catch(() => {
          // Already completed (re-decision race) — the WHERE narrows to no rows
          // and Prisma throws P2025. Ensure the status is COMPLETED regardless.
          return prisma.appointment.update({
            where: { id: request.asyncAppointmentId! },
            data: { status: "COMPLETED" },
          });
        })
        .catch(() => {});
    }
    await notifySourceDoctor(request.sourceDoctorId, request.sourceAppointmentId, {
      snippet: `${request.patientFullName} · prescription accepted`,
    });
    if (patientUserId) {
      await notifyUser(patientUserId, "CROSS_BORDER_RX_UPDATED", {
        title: "Your prescription is being issued",
        body: "The prescribing doctor accepted your request and is issuing your prescription.",
        href: "/account/bookings",
      }).catch(() => {});
    }
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
    await prisma.crossBorderPrescriptionRequest.update({
      where: { id: request.id },
      data: { status: "MORE_INFO" },
    });
    await notifySourceDoctor(request.sourceDoctorId, request.sourceAppointmentId, {
      snippet: `${request.patientFullName} · more information requested`,
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
