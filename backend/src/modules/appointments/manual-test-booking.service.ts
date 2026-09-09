import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "node:crypto";
import { PaymentStatus } from "@prisma/client";
import type { FastifyRequest } from "fastify";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import {
  getStripeClient,
  isStripeConfigured,
  resolveCheckoutPaymentMethods,
} from "../../lib/stripe/client.js";
import { absoluteSiteUrl } from "../../lib/email/send-email.js";
import { generateOrderNumber } from "../../lib/order-number.js";
import { buildPtStripeInvoiceData } from "../invoices/pt-stripe-invoice-data.js";
import { createUnpaidInvoiceForOrder } from "../invoices/generate-invoice.service.js";
import { checkoutBranding } from "../billing/checkout-branding.js";
import { issuePasswordResetToken } from "../auth/auth.service.js";
import { recordAudit } from "../audit/audit.service.js";
import { upsertPatientProfileByEmail } from "../patient-profile/patient-profile.service.js";
import { findPatientsMatchingIdentity } from "../patient-profile/patient-identity-match.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { SlotAlreadyTakenError } from "../scheduling/slot-grid.js";
import {
  holdTestCenterConsecutiveSlots,
  releaseTestCenterSlotsToBaseGrid,
} from "../test-center-availability/test-center-availability.service.js";
import { computePatientPriceCents } from "../test-centers/test-centers.service.js";
import { completeOrderPaymentFromCheckoutSession } from "../orders/complete-order-payment.service.js";
import { startPrePaymentFlow } from "../automation/pre-payment-flow.service.js";
import { persistOrderPortalAccess } from "../automation/resolve-order-portal-access.service.js";
import { defaultNotificationLocaleForCountry } from "../automation/notification-language.js";
import { promoteAppointmentConsents } from "../consents/promote-appointment-consents.js";
import {
  DuplicatePatientError,
  ServicePriceMissingError,
  SlotNotAvailableError,
} from "./manual-booking.service.js";

/**
 * Admin books a test-centre appointment on a patient's behalf.
 *
 * A SIBLING of `createManualBooking`, not a widening of it. That function is
 * ~1000 lines of doctor/service/peak/insurance/membership/commission logic, and
 * every one of those five subsystems is keyed on a service + a doctor. A test
 * booking has neither, so folding it in would mean five "not applicable"
 * branches through the middle of the live consultation booking path.
 *
 * What IS shared is imported outright, so the two cannot drift on the things
 * that matter: patient identity matching, the User/PatientProfile upsert, the
 * portal invite, order numbering, the free-booking completion, the Stripe
 * session, the pre-payment message ladder and the unpaid invoice.
 *
 * Pricing is deliberately simple here: the centre's offering price plus an
 * optional admin discount. No peak windows (a centre has no peak config), no
 * insurance (test bookings are self-pay in v1, enforced at add-to-cart for the
 * public path and by omission here) and no membership benefits.
 */

export class TestCenterNotBookableError extends Error {
  constructor() {
    super("That test is not bookable at this centre");
    this.name = "TestCenterNotBookableError";
  }
}

export type CreateManualTestBookingInput = {
  /** Admin user id — audit attribution. Null for ADMIN_API_TOKEN callers. */
  adminUserId: string | null;
  patient: {
    email: string;
    fullName: string;
    phone?: string | null;
    dateOfBirth?: string | null;
    addressLine1?: string | null;
    addressCity?: string | null;
    addressState?: string | null;
    addressPostalCode?: string | null;
    addressCountryCode?: string | null;
  };
  /** Proceed despite an existing patient matching on phone or name+DOB. */
  allowDuplicatePatient?: boolean;
  testCenterId: string;
  examTypeId: string;
  testCenterTimeSlotId: string;
  countryCode: string;
  notes?: string | null;
  /** Whole 0..100. 100 comps the booking outright. */
  discountPercent?: number | null;
  returnTo?: string | null;
  request?: FastifyRequest;
};

export type CreateManualTestBookingResult = {
  appointmentId: string;
  orderId: string;
  patientUserId: string;
  paymentUrl: string | null;
  paymentSessionId: string | null;
  tempPassword: string | null;
  setPasswordUrl: string;
  emailQueued: boolean;
  amountCents: number;
  discountPercent: number;
  discountCents: number;
  free: boolean;
};

function normalizeDiscountPercent(raw: number | null | undefined): number {
  if (raw == null || !Number.isFinite(raw)) return 0;
  const pct = Math.round(raw);
  if (pct <= 0 || pct > 100) return 0;
  return pct;
}

function generateTempPassword(): string {
  return randomBytes(12).toString("base64url");
}

function parseDateOfBirth(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || /^(null|undefined)$/i.test(trimmed)) return null;
  const parsed = new Date(`${trimmed.slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Snapshot of the centre address, identical in spirit to the fulfilment one. */
function formatTestCentreAddress(centre: {
  name: string;
  addressLine: string | null;
  city: string | null;
}): string | null {
  const parts = [centre.name, centre.addressLine, centre.city].filter(
    (part): part is string => Boolean(part && part.trim()),
  );
  return parts.length > 0 ? parts.join(", ") : null;
}

export async function createManualTestBooking(
  input: CreateManualTestBookingInput,
): Promise<CreateManualTestBookingResult> {
  const email = input.patient.email.trim().toLowerCase();
  const fullName = input.patient.fullName.trim();
  const dob = parseDateOfBirth(input.patient.dateOfBirth ?? null);

  // Resolve the offering FIRST: it is the price, and it simultaneously proves
  // the exam is published, the centre carries it, and the market is live. Same
  // single read the public add-to-cart path uses.
  const offering = await prisma.testCenterExam.findFirst({
    where: {
      testCenterId: input.testCenterId,
      examTypeId: input.examTypeId,
      isActive: true,
      examType: { isActive: true },
      testCenter: { isActive: true, country: { isActive: true } },
    },
    include: {
      examType: { select: { name: true, durationMinutes: true } },
      testCenter: {
        select: {
          name: true,
          addressLine: true,
          city: true,
          country: { select: { code: true, defaultLocale: true } },
        },
      },
    },
  });
  if (!offering) throw new TestCenterNotBookableError();

  const currencyCode = offering.currencyCode;
  const listPriceCents = computePatientPriceCents(
    offering.costCents,
    offering.markupMode,
    offering.markupValue,
  );
  if (listPriceCents == null || listPriceCents < 0) {
    throw new ServicePriceMissingError();
  }

  const discountPercent = normalizeDiscountPercent(input.discountPercent);
  const discountCents =
    discountPercent > 0 ? Math.round((listPriceCents * discountPercent) / 100) : 0;
  const amountCents = Math.max(0, listPriceCents - discountCents);
  const isFree = amountCents === 0;

  const notificationLocale = defaultNotificationLocaleForCountry(input.countryCode);

  // Duplicate-patient guard — the admin answers this question rather than
  // discovering a duplicate weeks later. Same rule as the consultation path:
  // only asked when no account already owns the email.
  if (!input.allowDuplicatePatient) {
    const existingAccount = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!existingAccount) {
      const matches = await findPatientsMatchingIdentity({
        email,
        fullName,
        phone: input.patient.phone ?? null,
        dateOfBirth: dob,
      });
      if (matches.length > 0) throw new DuplicatePatientError(matches);
    }
  }

  // Reserve the slot BEFORE any patient/order/email side effect, so a stale or
  // taken slot fails the whole booking cleanly. HELD, not BOOKED — the payment
  // webhook flips it, exactly as it does for a consultation.
  let claimedSlot: { testCenterId: string; startAt: Date; endAt: Date };
  try {
    claimedSlot = await prisma.$transaction((tx) =>
      holdTestCenterConsecutiveSlots(
        tx,
        input.testCenterTimeSlotId,
        offering.examType.durationMinutes,
      ),
    );
  } catch (err) {
    if (err instanceof SlotAlreadyTakenError) throw new SlotNotAvailableError();
    throw err;
  }
  // A slot from another centre would price this booking against the wrong
  // offering, so refuse rather than book it.
  if (claimedSlot.testCenterId !== input.testCenterId) {
    await releaseTestCenterSlotsToBaseGrid([input.testCenterTimeSlotId]).catch(
      () => undefined,
    );
    throw new SlotNotAvailableError();
  }
  const scheduledAt = claimedSlot.startAt;

  /** Give the slot back on any failure between here and the order's creation. */
  const releaseSlotOnFailure = async (err: unknown): Promise<never> => {
    await releaseTestCenterSlotsToBaseGrid([input.testCenterTimeSlotId]).catch(
      () => undefined,
    );
    throw err;
  };

  const tempPassword = generateTempPassword();
  const tempHash = await bcrypt.hash(tempPassword, 10);

  let userId: string | null;
  let created: boolean;
  let bookingPatientProfileId: string;
  try {
    const upserted = await upsertPatientProfileByEmail(
      {
        email,
        fullName,
        phone: input.patient.phone ?? null,
        dateOfBirth: dob,
        countryFolderCode: input.countryCode,
      },
      {
        passwordHashOverride: tempHash,
        mustChangePassword: true,
        overwriteCountryFolder: true,
      },
    );
    userId = upserted.userId;
    created = upserted.created;
    bookingPatientProfileId = upserted.profile.id;
  } catch (err) {
    return releaseSlotOnFailure(err);
  }
  if (!userId) {
    // The helper returns null for a non-PATIENT account (doctor/admin). The
    // email namespace is shared but the portals are not.
    return releaseSlotOnFailure(
      new Error("An account with that email already exists with a non-patient role"),
    );
  }

  const inviteToken = await issuePasswordResetToken(userId, {
    ttlMinutes: 7 * 24 * 60,
    isInvite: true,
  });
  const setPasswordUrl = absoluteSiteUrl(
    `/reset-password?token=${encodeURIComponent(inviteToken)}&invite=1`,
  );

  const appointmentId = randomUUID();
  const orderId = randomUUID();
  const orderItemId = randomUUID();
  const locationAddress = formatTestCentreAddress(offering.testCenter);

  try {
    await prisma.appointment.create({
      data: {
        id: appointmentId,
        userId,
        patientProfileId: bookingPatientProfileId,
        countryCode: input.countryCode,
        consultationType: offering.examType.name,
        notificationLocale,
        fullName,
        email,
        phone: input.patient.phone?.trim() || null,
        dateOfBirth: dob,
        notes: input.notes?.trim() || null,
        addressLine1: input.patient.addressLine1?.trim() || null,
        addressCity: input.patient.addressCity?.trim() || null,
        addressState: input.patient.addressState?.trim() || null,
        addressPostalCode: input.patient.addressPostalCode?.trim() || null,
        addressCountryCode:
          input.patient.addressCountryCode?.trim().toLowerCase() || null,
        consentAccepted: true,
        // Without a scope the consent promotion job skips this appointment.
        medicalAccessConsentScope: "DIRECT",
        // Appointment defaults this to false while CartItem defaults it true —
        // the mismatch silently broke WhatsApp sends on manual bookings once.
        whatsappConsent: true,
        status: "REQUEST_RECEIVED",
        // No doctor, no service, no meeting link. IN_PERSON + locationAddress
        // is what makes every notification path render the centre's address.
        doctorId: null,
        serviceId: null,
        examTypeId: input.examTypeId,
        testCenterId: input.testCenterId,
        testCenterTimeSlotId: input.testCenterTimeSlotId,
        scheduledAt,
        consultationMode: "IN_PERSON",
        locationAddress,
        amountCents,
        currencyCode,
        paymentStatus: PaymentStatus.UNPAID,
        manualEntry: true,
        // Reused deliberately — MANUAL means "an admin took this booking", and
        // nothing in the codebase branches on it. See the BookingSource doc.
        bookingSource: "MANUAL",
      },
    });
  } catch (error) {
    return releaseSlotOnFailure(
      normalizeDbError(error, "Could not create manual test booking"),
    );
  }

  // Manual-booking patients may never log in (promotion normally runs on
  // login/verify), so promote booking consents now.
  promoteAppointmentConsents(userId, email).catch((err: unknown) => {
    console.error("[manual-test-booking] consent promotion failed", err);
  });

  const orderNumber = await generateOrderNumber();

  const order = await prisma.order.create({
    data: {
      id: orderId,
      orderNumber,
      userId,
      email,
      fullName,
      phone: input.patient.phone?.trim() || null,
      countryCode: input.countryCode.toLowerCase(),
      notificationLocale,
      currencyCode,
      bookingSource: "MANUAL",
      subtotalCents: amountCents,
      totalCents: amountCents,
      // Audit only — the totals and the line price are ALREADY net of this.
      discountPercent: discountPercent > 0 ? discountPercent : null,
      discountCents: discountCents > 0 ? discountCents : null,
      appointmentIds: [appointmentId],
      orderAppointments: { create: { appointmentId } },
      items: {
        create: {
          id: orderItemId,
          kind: "TEST_BOOKING",
          name: offering.examType.name,
          unitPriceCents: amountCents,
          quantity: 1,
          lineTotalCents: amountCents,
          examTypeId: input.examTypeId,
          testCenterId: input.testCenterId,
          testCenterExamId: offering.id,
          testCenterTimeSlotId: input.testCenterTimeSlotId,
          appointmentId,
          patientFullName: fullName,
          patientEmail: email,
          patientPhone: input.patient.phone?.trim() || null,
          patientDateOfBirth: dob,
          patientNotes: input.notes?.trim() || null,
          patientAddressLine1: input.patient.addressLine1?.trim() || null,
          patientAddressCity: input.patient.addressCity?.trim() || null,
          patientAddressState: input.patient.addressState?.trim() || null,
          patientAddressPostalCode: input.patient.addressPostalCode?.trim() || null,
          patientAddressCountryCode:
            input.patient.addressCountryCode?.trim().toLowerCase() || null,
          patientConsentAcceptedAt: new Date(),
        },
      },
    },
  });

  // Persisted BEFORE the payment branch: a comped booking completes inline
  // below and immediately queues the paid-order automations, which read these
  // columns off the order.
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
      "[manual-test-booking] Portal access persist failed",
    );
  }

  let paymentUrl: string | null = null;
  let paymentSessionId: string | null = null;

  if (isFree) {
    // Comped. Run the same completion the €0 cart path uses: marks the order
    // PAID, flips the appointment and its HELD slot, queues the paid-order
    // automations (confirmation with the centre address, invoice).
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
            source: "admin_manual",
          },
        },
        { stripeEventId: `free_${order.id}`, eventType: "free_order" },
        input.request?.log,
      );
    } catch (err) {
      input.request?.log.error(
        { err, appointmentId, orderId: order.id },
        "[manual-test-booking] Free-booking completion failed — order left unpaid",
      );
    }
  } else if (isStripeConfigured(input.countryCode)) {
    try {
      const stripe = getStripeClient(input.countryCode);
      const baseUrl = env.PUBLIC_SITE_URL?.replace(/\/+$/, "") ?? "http://localhost:3000";
      const returnBase = input.returnTo ?? "/account/bookings";
      const successUrl = `${baseUrl}${returnBase}?orderId=${order.id}&payment=ok&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${baseUrl}${returnBase}?orderId=${order.id}&payment=cancelled`;
      const paymentMethodConfig = await resolveCheckoutPaymentMethods(
        stripe,
        input.countryCode,
        email,
      );
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        ...paymentMethodConfig,
        client_reference_id: order.id,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: currencyCode.toLowerCase(),
              unit_amount: amountCents,
              // Never send clinical free-text to Stripe — this shows on the
              // customer's receipt. Public exam name only.
              product_data: { name: offering.examType.name },
            },
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        invoice_creation: (await buildPtStripeInvoiceData(
          input.countryCode,
          email,
          offering.examType.name,
        )) ?? { enabled: true },
        ...(await checkoutBranding(input.countryCode)),
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
        data: {
          stripeSessionId: paymentSessionId,
          paymentStatus: PaymentStatus.PENDING,
          stripeCheckoutUrl: paymentUrl,
        },
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
        "[manual-test-booking] Stripe session creation failed",
      );
    }
  }

  let emailQueued = false;
  if (isFree) {
    // The completion above already queued the paid-order automations, so the
    // pre-payment ladder (payment link, reminders, cancel sweep) must NOT start
    // on top of them.
    emailQueued = portalAccessSaved;
  } else {
    try {
      await startPrePaymentFlow(order.id, paymentUrl, {
        portal: { setPasswordUrl, tempPassword: created ? tempPassword : null },
      });
      emailQueued = true;
    } catch (err) {
      input.request?.log.warn(
        { err, appointmentId, orderId: order.id },
        "[manual-test-booking] Pre-payment automation failed",
      );
    }
  }

  // Unpaid invoice document, fire-and-forget: its failure must never roll back
  // the booking. A comped booking is already PAID and gets its receipt from the
  // paid-order path instead.
  if (!isFree) {
    void createUnpaidInvoiceForOrder(order.id).catch((err) => {
      input.request?.log.warn(
        { err, orderId: order.id },
        "[manual-test-booking] Unpaid invoice issue failed",
      );
    });
  }

  recordAudit({
    actorUserId: input.adminUserId ?? null,
    actorRole: "ADMIN",
    action: "APPOINTMENT_CREATED",
    entityType: "Appointment",
    entityId: appointmentId,
    metadata: {
      manual: true,
      testBooking: true,
      orderId: order.id,
      testCenterId: input.testCenterId,
      examTypeId: input.examTypeId,
      amountCents,
      discountPercent,
    },
  }).catch(() => undefined);

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
