import { PaymentStatus } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { sendOrderConfirmationEmail } from "../../lib/email/templates.js";
import { getStripeClient, isStripeConfigured } from "../../lib/stripe/client.js";
import {
  orderHasConsultationItem,
  orderIsPaidForMeet,
} from "../admin-orders/generate-order-meet-link.service.js";
import { stopPrePaymentFlowOnPaid } from "../automation/pre-payment-flow.service.js";
import { emitOpsAlert } from "../subscriptions/ops/ops-alert.js";
import { commitOrderCreditReservations } from "../subscriptions/checkout-pricing.service.js";
import { enqueueOrderPaidAutomations } from "../outbox/outbox.js";
import { encryptPhi } from "../../lib/crypto/phi-crypto.js";
import { markRequisitionsReadyOnOrderPaid } from "../lab-orders/lab-requisitions.service.js";

export type PaymentLog = {
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
};

export type CheckoutSessionSnapshot = {
  id: string;
  payment_intent?: string | null;
  invoice?: string | null;
  client_reference_id?: string | null;
  metadata?: Record<string, string> | null;
};

export type CompleteOrderPaymentResult = {
  alreadyPaid: boolean;
  orderId: string;
};

export type SyncOrderPaymentResult =
  | { ok: true; code: "SYNCED" | "ALREADY_PAID" }
  | { ok: false; code: "NOT_FOUND" | "NO_SESSION" | "STRIPE_NOT_CONFIGURED" | "NOT_PAID"; paymentStatus?: string };

const noopLog: PaymentLog = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

/**
 * Mark an order PAID from a completed Stripe Checkout session and run
 * post-payment side effects (automations, receipt email, Meet link).
 */
export async function completeOrderPaymentFromCheckoutSession(
  orderId: string,
  session: CheckoutSessionSnapshot,
  opts: { stripeEventId: string; eventType: string },
  log: PaymentLog = noopLog,
): Promise<CompleteOrderPaymentResult> {
  const { alreadyPaid, resurrectedFromCancelled } = await markOrderPaidFromStripeSession(
    orderId,
    session,
    opts,
    log,
  );

  if (resurrectedFromCancelled) {
    // The order had already been cancelled when this payment arrived, so its
    // slot was released, its appointments cancelled and its plan credits handed
    // back — none of which the fulfilment below can undo. The money is real, so
    // we still record it as PAID, but a human has to rebuild the booking.
    log.error(
      { orderId, stripeEventId: opts.stripeEventId },
      "Payment landed on a CANCELLED order — booking was already torn down",
    );
    await emitOpsAlert({
      severity: "critical",
      title: "Payment received for an already-cancelled order",
      detail:
        "The order was CANCELLED before its payment arrived, so the held slot was released and any appointment cancelled. The order is now PAID with no booking behind it — rebuild the appointment or refund.",
      context: { orderId, stripeEventId: opts.stripeEventId, sessionId: session.id },
    });
  }

  if (alreadyPaid) {
    // Side effects now run via the durable outbox (P-007). The first-flip path
    // wrote the row inside the mark-PAID transaction; here (webhook redelivery
    // or sync of an already-PAID order) we idempotently self-heal — skipDuplicates
    // makes this a no-op when the row already exists, but re-queues legacy orders
    // paid before the outbox existed. Off the awaited critical path either way.
    await enqueueOrderPaidAutomations(prisma, orderId, { sendShopConfirmation: false }).catch(
      (err) => log.error({ err, orderId }, "Outbox enqueue (already-paid) failed"),
    );
    // Still attempt the credit commit on every call, not just the one that
    // first flipped PAID (bug found in a prior review pass: the
    // webhook-vs-sync-order race meant whichever path ISN'T first to mark
    // PAID would return alreadyPaid=true and skip the commit entirely,
    // leaving the reservation stuck RESERVED forever with the credit
    // already spent). Idempotent — a no-op once already committed — so
    // retrying here on every redelivered webhook or sync-order call is
    // also a self-heal if the original commit attempt silently failed.
    await commitCreditsForPaidOrder(orderId, opts.stripeEventId, log);
    // Cross-jurisdiction prescription: mint the async appointment + notify the
    // prescribing doctor on payment. Idempotent (guarded by request status +
    // unique asyncAppointmentId), so calling it on the redelivery / sync-order
    // path too is a self-heal, mirroring commitCreditsForPaidOrder above.
    await settleCrossBorderRxOnPaid(orderId, log);
    return { alreadyPaid: true, orderId };
  }

  try {
    await fulfillPaidOrderFromCheckoutSession(orderId, session, log);
  } catch (err) {
    log.error({ err, orderId }, "Order marked PAID but fulfillment failed — reconcile manually");
    await emitOpsAlert({
      severity: "critical",
      title: "Order marked PAID but fulfillment failed",
      detail: err instanceof Error ? err.message : String(err),
      context: { orderId, stripeEventId: opts.stripeEventId },
    });
  }

  await commitCreditsForPaidOrder(orderId, opts.stripeEventId, log);
  await settleCrossBorderRxOnPaid(orderId, log);
  // Post-payment side effects (Meet link, confirmation email/WhatsApp, invoice
  // PDF) are NOT awaited here anymore. markOrderPaidFromStripeSession already
  // wrote the outbox row inside the same transaction that flipped PAID, so the
  // internal scheduler's tickOutboxDispatch drains them off the webhook path
  // (P-006/P-007). This function returns as soon as the fast DB work is durable.
  return { alreadyPaid: false, orderId };
}

/**
 * Commit any subscription credit reservations on this order — the charge
 * succeeded, so RESERVED -> CONSUMED (§36.3). Called from BOTH the webhook
 * and sync-order paths via this single shared function so neither can skip
 * it (see the caller's comment for the bug this closes).
 */
async function commitCreditsForPaidOrder(
  orderId: string,
  stripeEventId: string,
  log: PaymentLog,
): Promise<void> {
  try {
    await commitOrderCreditReservations(orderId);
  } catch (err) {
    log.error({ err, orderId }, "Commit order credit reservations failed");
    await emitOpsAlert({
      severity: "critical",
      title: "Order paid but credit reservation commit failed",
      detail: err instanceof Error ? err.message : String(err),
      context: { orderId, stripeEventId },
    });
  }
}

/**
 * Cross-jurisdiction prescription settlement. Dynamically imported to avoid a
 * static import cycle (cross-border-rx → notifications/consultations → …). The
 * hook is a no-op for every non-cross-border order and idempotent for the ones
 * it does handle, so calling it on every paid-order path is safe.
 */
async function settleCrossBorderRxOnPaid(orderId: string, log: PaymentLog): Promise<void> {
  try {
    const { onCrossBorderRxFeePaid, linkCrossBorderUpgradeOnPaid } = await import(
      "../cross-border-rx/cross-border-rx.service.js"
    );
    // Fee paid → mint the async consult + notify Doctor B (no-op unless this
    // order is a cross-border async fee).
    await onCrossBorderRxFeePaid(orderId, log);
    // Full-consult booked after a refusal → link it back + flip to UPGRADED
    // (no-op unless a matching REFUSED request exists).
    await linkCrossBorderUpgradeOnPaid(orderId, log);
  } catch (err) {
    log.error({ err, orderId }, "Cross-border Rx settlement failed after payment");
    await emitOpsAlert({
      severity: "critical",
      title: "Cross-border prescription paid but async consultation not created",
      detail: err instanceof Error ? err.message : String(err),
      context: { orderId },
    });
  }
}

/** Idempotent: records Stripe event + flips order to PAID. Never throws on fulfillment errors. */
async function markOrderPaidFromStripeSession(
  orderId: string,
  session: CheckoutSessionSnapshot,
  opts: { stripeEventId: string; eventType: string },
  log: PaymentLog,
): Promise<{ alreadyPaid: boolean; resurrectedFromCancelled: boolean }> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { paymentStatus: true, status: true },
    });
    if (!order) return { alreadyPaid: true, resurrectedFromCancelled: false };
    if (order.paymentStatus === "PAID" || order.status === "PAID") {
      return { alreadyPaid: true, resurrectedFromCancelled: false };
    }

    // A payment arriving on a CANCELLED order is not a normal flip: the
    // cancellation already released the slot and cancelled the appointment, so
    // marking it PAID leaves an order with nothing behind it. We record the
    // money anyway (refusing it would be worse) but flag it loudly upstream.
    const resurrectedFromCancelled =
      order.status === "CANCELLED" || order.paymentStatus === "FAILED";

    const seen = await tx.processedWebhookEvent.findUnique({
      where: { stripeEventId: opts.stripeEventId },
      select: { id: true },
    });
    if (seen) {
      log.info({ orderId, stripeEventId: opts.stripeEventId }, "Stripe event already processed");
      return { alreadyPaid: true, resurrectedFromCancelled: false };
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "PAID",
        paymentStatus: PaymentStatus.PAID,
        paidAt: new Date(),
        stripePaymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
        stripeInvoiceId:
          typeof session.invoice === "string" ? session.invoice : null,
      },
    });

    await tx.processedWebhookEvent.create({
      data: { stripeEventId: opts.stripeEventId, eventType: opts.eventType },
    });

    // Durably record the post-payment side effects IN THE SAME COMMIT that flips
    // PAID (P-007): the confirmation email/WhatsApp, Meet link, and invoice PDF
    // are now guaranteed exactly-once and drained asynchronously by the
    // scheduler, instead of extending this webhook's latency or being lost if a
    // provider is unreachable at payment time. sendShopConfirmation mirrors the
    // old first-flip behaviour (shop-only orders got the confirmation email).
    await enqueueOrderPaidAutomations(tx, orderId, { sendShopConfirmation: true });

    return { alreadyPaid: false, resurrectedFromCancelled };
  });
}

/** Stock decrement + appointment minting. Failures here do not revert PAID status. */
async function fulfillPaidOrderFromCheckoutSession(
  orderId: string,
  session: CheckoutSessionSnapshot,
  log: PaymentLog,
): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return;

    const consultationItems = order.items.filter(
      (i) => i.kind === "GENERAL_CONSULTATION" || i.kind === "SPECIALIST_CONSULTATION",
    );

    // Self-pay laboratory exams: advance the requisition this order was paying
    // for so the admin queue shows it as ready to send to Synlab. Inside the
    // fulfilment transaction, so a paid lab order and its requisition state can
    // never disagree. No-op for every other kind of order.
    if (order.items.some((i) => i.kind === "LAB_EXAM")) {
      await markRequisitionsReadyOnOrderPaid(tx, orderId);
    }

    const healthTestItems = order.items.filter(
      (i) => i.kind === "HEALTH_TEST" && i.healthTestId,
    );
    for (const item of healthTestItems) {
      if (!item.healthTestId) continue;
      const result = await tx.healthTest.updateMany({
        where: {
          id: item.healthTestId,
          stock: { not: null, gte: item.quantity },
        },
        data: { stock: { decrement: item.quantity } },
      });
      if (result.count !== 1) {
        const fresh = await tx.healthTest.findUnique({
          where: { id: item.healthTestId },
          select: { stock: true },
        });
        if (fresh && fresh.stock !== null) {
          log.error(
            {
              orderId,
              healthTestId: item.healthTestId,
              requested: item.quantity,
              remaining: fresh.stock,
            },
            "OVERSELL: paid order item exceeds available stock — needs manual reconciliation",
          );
        }
      }
    }

    const appointmentIds: string[] = [...order.appointmentIds];
    // Consultation lines that finish this loop WITHOUT an appointment behind
    // them. Each one is a patient who has paid and has no booking — previously
    // only a log.warn, which is how ORD-000182 went unnoticed until the patient
    // asked where their consultation was.
    const unfulfilled: { itemId: string; slotId: string | null; reason: string }[] = [];
    for (const item of consultationItems) {
      if (item.appointmentId) {
        if (item.timeSlotId) {
          const claim = await tx.doctorTimeSlot.updateMany({
            where: {
              id: item.timeSlotId,
              status: { in: ["HELD", "OPEN"] },
            },
            data: { status: "BOOKED" },
          });
          if (claim.count === 0) {
            log.warn(
              { orderId, itemId: item.id, slotId: item.timeSlotId },
              "Manual booking slot already claimed — appointment payment still recorded",
            );
          }
        }
        await tx.appointment.update({
          where: { id: item.appointmentId },
          data: {
            paymentStatus: PaymentStatus.PAID,
            paidAt: new Date(),
            stripePaymentIntentId:
              typeof session.payment_intent === "string" ? session.payment_intent : null,
          },
        });
        if (!appointmentIds.includes(item.appointmentId)) {
          appointmentIds.push(item.appointmentId);
        }
        continue;
      }

      if (!item.timeSlotId || !item.doctorId || !item.serviceId) {
        log.warn(
          { orderId, itemId: item.id },
          "Consultation order item missing slot/doctor/service",
        );
        unfulfilled.push({
          itemId: item.id,
          slotId: item.timeSlotId,
          reason: "missing slot/doctor/service on the order line",
        });
        continue;
      }

      const existingOnSlot = await tx.appointment.findUnique({
        where: { timeSlotId: item.timeSlotId },
        select: { id: true, paymentStatus: true },
      });
      if (existingOnSlot) {
        if (existingOnSlot.paymentStatus !== PaymentStatus.PAID) {
          await tx.appointment.update({
            where: { id: existingOnSlot.id },
            data: {
              paymentStatus: PaymentStatus.PAID,
              paidAt: new Date(),
              stripePaymentIntentId:
                typeof session.payment_intent === "string" ? session.payment_intent : null,
            },
          });
        }
        await tx.orderItem.update({
          where: { id: item.id },
          data: { appointmentId: existingOnSlot.id },
        });
        if (!appointmentIds.includes(existingOnSlot.id)) {
          appointmentIds.push(existingOnSlot.id);
        }
        continue;
      }

      const claim = await tx.doctorTimeSlot.updateMany({
        where: {
          id: item.timeSlotId,
          // BOOKED counts as claimable here ONLY because the appointment
          // lookup above proved nothing occupies this slot. An insurance
          // order commits HELD→BOOKED at checkout time (orders.route.ts) to
          // survive the manual card-verification window, so by the time the
          // patient pays the slot is already BOOKED and owned by this very
          // order — excluding it skipped the mint and left a paid order with
          // no consultation (ORD-000143, ORD-000177).
          status: { in: ["HELD", "OPEN", "BOOKED"] },
        },
        data: { status: "BOOKED" },
      });
      if (claim.count === 0) {
        log.warn(
          { orderId, itemId: item.id, slotId: item.timeSlotId },
          "Slot already claimed by someone else — appointment skipped",
        );
        unfulfilled.push({
          itemId: item.id,
          slotId: item.timeSlotId,
          // Either a genuine double-booking, or the slot was deleted out from
          // under us — which is what a pre-payment cancel does when it races
          // this payment (it folds the held slot back into the base grid under
          // a new id, so this lookup can never match again).
          reason: "held slot is gone or no longer claimable",
        });
        continue;
      }
      const slot = await tx.doctorTimeSlot.findUniqueOrThrow({
        where: { id: item.timeSlotId },
      });
      const consultationType =
        item.kind === "SPECIALIST_CONSULTATION" ? "specialist" : "general";
      const aptFullName = item.patientFullName ?? order.fullName;
      const aptEmail = item.patientEmail ?? order.email;
      const aptPhone = item.patientPhone ?? order.phone;
      const aptDob = item.patientDateOfBirth ?? null;
      const aptNotes = item.patientNotes ?? null;
      // Same-day GP quick-book audit: when this slot was auto-assigned, the
      // GpAssignmentLog row (keyed by the slot) carries the patient's chosen
      // consultation language + why the doctor was picked. Back-fill both onto
      // the appointment so the doctor sees the language and admins can review
      // the assignment. Null for doctor-first bookings (no log row).
      const gpAssignment = await tx.gpAssignmentLog.findUnique({
        where: { timeSlotId: item.timeSlotId },
        select: { languageCode: true, reason: true },
      });
      const apt = await tx.appointment.create({
        data: {
          userId: order.userId,
          countryCode: order.countryCode,
          consultationType,
          consultationLanguageCode: gpAssignment?.languageCode ?? null,
          assignmentReason: gpAssignment?.reason ?? null,
          fullName: aptFullName,
          email: aptEmail,
          phone: aptPhone,
          dateOfBirth: aptDob,
          notes: aptNotes,
          consentAccepted: true,
          status: "REQUEST_RECEIVED",
          serviceId: item.serviceId,
          doctorId: item.doctorId,
          timeSlotId: item.timeSlotId,
          scheduledAt: slot.startAt,
          amountCents: item.unitPriceCents,
          currencyCode: order.currencyCode,
          paymentStatus: PaymentStatus.PAID,
          paidAt: new Date(),
          consultationMode: "ONLINE",
          patientTimezone: item.patientTimezone,
          addressLine1: item.patientAddressLine1,
          addressLine2: item.patientAddressLine2,
          addressCity: item.patientAddressCity,
          addressState: item.patientAddressState,
          addressPostalCode: item.patientAddressPostalCode,
          addressCountryCode: item.patientAddressCountryCode,
          gdprConsentClinic: item.patientGdprConsentClinic,
          gdprConsentPlatform: item.patientGdprConsentPlatform,
          gdprConsentedAt: item.patientGdprConsentedAt,
          whatsappConsent: item.patientWhatsappConsent,
          crossBorderConsentAccepted: item.patientCrossBorderConsentAccepted,
          medicalAccessConsentScope: item.patientMedicalAccessConsentScope ?? "DIRECT",
          // Insurance snapshot for the clinical record (amountCents above
          // already carries the charged insurance price). Policy number stays
          // in its encrypted phi:v1: envelope — copied verbatim, not decrypted.
          insuranceCompanyId: item.insuranceCompanyId,
          insurancePolicyNumber: item.insurancePolicyNumber,
        },
      });
      await tx.orderItem.update({
        where: { id: item.id },
        data: { appointmentId: apt.id },
      });
      appointmentIds.push(apt.id);

      if (
        aptEmail &&
        (item.patientNationalIdNumber ||
          item.patientUtenteNumber ||
          item.patientAddressLine1 ||
          item.patientAddressCity)
      ) {
        const existing = await tx.patientProfile.findUnique({
          where: { email: aptEmail.toLowerCase() },
          select: {
            nationalIdNumber: true,
            taxIdNumber: true,
            utenteNumber: true,
            addressLine1: true,
            addressLine2: true,
            addressCity: true,
            addressState: true,
            addressPostalCode: true,
            addressCountryCode: true,
          },
        });
        const fill = <T>(existingVal: T | null, snapshotVal: T | null): T | null =>
          existingVal ?? snapshotVal ?? null;
        await tx.patientProfile.upsert({
          where: { email: aptEmail.toLowerCase() },
          update: {
            nationalIdNumber: fill(
              existing?.nationalIdNumber ?? null,
              item.patientNationalIdNumber,
            ),
            taxIdNumber: fill(existing?.taxIdNumber ?? null, item.patientNationalIdNumber),
            // Encrypted on the way in: `existing` is already ciphertext when a
            // key is configured, so keeping it as-is is correct and only the
            // fresh snapshot value needs wrapping.
            utenteNumber: fill(
              existing?.utenteNumber ?? null,
              encryptPhi(item.patientUtenteNumber),
            ),
            addressLine1: fill(existing?.addressLine1 ?? null, item.patientAddressLine1),
            addressLine2: fill(existing?.addressLine2 ?? null, item.patientAddressLine2),
            addressCity: fill(existing?.addressCity ?? null, item.patientAddressCity),
            addressState: fill(existing?.addressState ?? null, item.patientAddressState),
            addressPostalCode: fill(
              existing?.addressPostalCode ?? null,
              item.patientAddressPostalCode,
            ),
            addressCountryCode: fill(
              existing?.addressCountryCode ?? null,
              item.patientAddressCountryCode,
            ),
          },
          create: {
            email: aptEmail.toLowerCase(),
            fullName: aptFullName,
            phone: aptPhone,
            dateOfBirth: aptDob,
            nationalIdNumber: item.patientNationalIdNumber,
            taxIdNumber: item.patientNationalIdNumber,
            utenteNumber: encryptPhi(item.patientUtenteNumber),
            addressLine1: item.patientAddressLine1,
            addressLine2: item.patientAddressLine2,
            addressCity: item.patientAddressCity,
            addressState: item.patientAddressState,
            addressPostalCode: item.patientAddressPostalCode,
            addressCountryCode: item.patientAddressCountryCode,
          },
        });
      }
    }

    await tx.order.update({
      where: { id: orderId },
      data: { appointmentIds },
    });

    // Dual-write into the relational join table alongside the legacy array
    // (Suggestion 8, code review 2026-07-05). skipDuplicates keeps this
    // idempotent — this function re-runs on Stripe webhook redelivery.
    if (appointmentIds.length > 0) {
      await tx.orderAppointment.createMany({
        data: appointmentIds.map((appointmentId) => ({ orderId, appointmentId })),
        skipDuplicates: true,
      });
    }
    return { appointmentIds, unfulfilled };
  },
    { maxWait: 10_000, timeout: 30_000 },
  ).then((result) => {
    if (!result) return;
    const { appointmentIds, unfulfilled } = result;

    // Paid, but at least one consultation line has no appointment behind it.
    // Nothing downstream can self-heal this — the patient's money is taken and
    // their booking does not exist — so it has to reach a human immediately.
    if (unfulfilled.length > 0) {
      void emitOpsAlert({
        severity: "critical",
        title: "Paid consultation order has no appointment",
        detail:
          "Payment succeeded but the appointment could not be minted. The patient has been charged and has no booking — rebuild it by hand or refund.",
        context: { orderId, unfulfilled },
      });
    }
    // Corporate lifecycle hook — link freshly-minted appointments to a
    // pending pre-assessment / open corporate request (plan doc §2.1/§2.3).
    // Fire-and-forget + idempotent, so webhook redelivery is harmless.
    for (const appointmentId of appointmentIds) {
      void import("../corporate/corporate-status.service.js")
        .then((m) => m.onCorporateAppointmentCreated(appointmentId))
        .catch(() => {});
    }
    // Promote booking-time medical-access consent into the append-only
    // ledger for logged-in checkouts (guest orders get promoted later, on
    // login/verify — see auth.route.ts). Fire-and-forget: a promotion miss
    // must never affect the paid order.
    void prisma.order
      .findUnique({ where: { id: orderId }, select: { userId: true, email: true } })
      .then((order) => {
        if (!order?.userId) return;
        return import("../consents/promote-appointment-consents.js").then((m) =>
          m.promoteAppointmentConsents(order.userId as string, order.email),
        );
      })
      .catch(() => {});
  });
}

function formatOrderMoney(currencyCode: string, cents: number): string {
  const code = currencyCode.toUpperCase() || "EUR";
  const symbol =
    code === "EUR" ? "€" : code === "CZK" ? "Kč " : code === "BRL" ? "R$" : `${code} `;
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

async function sendShopOrderConfirmationEmail(
  paidOrder: {
    email: string;
    fullName: string;
    id: string;
    orderNumber?: string | null;
    currencyCode: string;
    totalCents: number;
    items: { name: string; quantity: number; lineTotalCents: number }[];
    shipName: string | null;
    shipLine1: string | null;
    shipLine2: string | null;
    shipCity: string | null;
    shipPostalCode: string | null;
    shipCountryCode: string | null;
  },
  _log: PaymentLog,
) {
  const fmt = (cents: number) => formatOrderMoney(paidOrder.currencyCode, cents);
  await sendOrderConfirmationEmail({
    to: paidOrder.email,
    fullName: paidOrder.fullName,
    orderId: paidOrder.id,
    orderNumber: paidOrder.orderNumber,
    totalLabel: fmt(paidOrder.totalCents),
    items: paidOrder.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      lineLabel: fmt(i.lineTotalCents),
    })),
    shipAddress: paidOrder.shipName
      ? {
          name: paidOrder.shipName,
          line1: paidOrder.shipLine1 ?? "",
          line2: paidOrder.shipLine2,
          city: paidOrder.shipCity ?? "",
          postalCode: paidOrder.shipPostalCode ?? "",
          countryCode: paidOrder.shipCountryCode ?? "",
        }
      : null,
  });
}

/**
 * Idempotent post-payment automations for consultation orders (Meet link +
 * confirmation messages). Safe to call when an order is already PAID — e.g.
 * admin Meet auto-provision or payment sync retries.
 */
export async function ensureOrderPaidAutomations(
  orderId: string,
  log: PaymentLog = noopLog,
  opts?: { sendShopConfirmation?: boolean },
) {
  await stopPrePaymentFlowOnPaid(orderId).catch(() => undefined);

  // Generate invoice (skips Portugal automatically; idempotent). Fire-and-forget
  // (P-002): nothing downstream in this flow reads the invoice, and the invoice
  // email is sent inside generateInvoiceForOrder itself — so blocking the payment
  // path on it is unnecessary. Failures are logged and never reject the caller.
  void import("../invoices/generate-invoice.service.js")
    .then(({ generateInvoiceForOrder }) => generateInvoiceForOrder(orderId, log))
    .catch((invoiceErr) => {
      log.warn({ err: invoiceErr, orderId }, "Invoice generation failed — order still paid");
    });

  // Portugal: generateInvoiceForOrder skips PT (invoicing is done via
  // InvoiceExpress). Issue the PT legal InvoiceReceipt directly through the
  // InvoiceExpress REST API instead. PT-only + live-Stripe-only + idempotent
  // guards live inside issuePortugalInvoiceExpress; fire-and-forget so it never
  // blocks the paid order.
  void import("../invoices/pt-invoicexpress.service.js")
    .then(({ issuePortugalInvoiceExpress }) => issuePortugalInvoiceExpress(orderId, log))
    .catch((ptErr) => {
      log.warn({ err: ptErr, orderId }, "PT InvoiceExpress issue failed — order still paid");
    });

  const paidOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  const hasConsult =
    Boolean(paidOrder && orderHasConsultationItem(paidOrder.items)) ||
    (paidOrder?.appointmentIds.length ?? 0) > 0;
  if (!paidOrder || !orderIsPaidForMeet(paidOrder)) return;

  if (hasConsult) {
    const {
      POST_PAYMENT_STAGE_MEETING_LINK,
      POST_PAYMENT_STAGE_PAID,
      post_sendMeetingLinkNotifications,
    } = await import("../automation/post-payment-flow.service.js");

    if (paidOrder.meetingUrl?.trim()) {
      const fresh = await prisma.order.findUnique({
        where: { id: orderId },
        select: { postPaymentStage: true },
      });
      if (
        fresh &&
        fresh.postPaymentStage >= POST_PAYMENT_STAGE_PAID &&
        fresh.postPaymentStage < POST_PAYMENT_STAGE_MEETING_LINK
      ) {
        await post_sendMeetingLinkNotifications(orderId).catch((err) => {
          log.warn({ err, orderId }, "Meeting-link notifications failed");
        });
      }
      return;
    }

    try {
      const { autoProvisionOrderMeetOnPaid } = await import(
        "../admin-orders/generate-order-meet-link.service.js"
      );
      await autoProvisionOrderMeetOnPaid(orderId, log);
    } catch (meetErr) {
      log.warn({ err: meetErr, orderId }, "Order Meet auto-provision import failed");
    }
    return;
  }

  if (!opts?.sendShopConfirmation) return;

  try {
    await sendShopOrderConfirmationEmail(paidOrder, log);
  } catch (emailErr) {
    log.warn({ err: emailErr, orderId }, "Order confirmation email failed");
  }
}

/** Fallback when Stripe webhook did not reach the server (common in local dev). */
export async function syncOrderPaymentFromStripe(
  orderId: string,
  log: PaymentLog = noopLog,
): Promise<SyncOrderPaymentResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, paymentStatus: true, status: true, stripeSessionId: true, countryCode: true },
  });
  if (!order) return { ok: false, code: "NOT_FOUND" };
  // Config check is per the order's account — a PT/ES/CZ order needs its own
  // sandbox key (falls back to Ireland when the sandbox key is unset).
  if (!isStripeConfigured(order.countryCode)) {
    return { ok: false, code: "STRIPE_NOT_CONFIGURED" };
  }
  if (order.paymentStatus === "PAID" || order.status === "PAID") {
    // Already PAID (sync fallback / redelivery): self-heal via the outbox
    // instead of running the side effects inline. Idempotent — no-op if the row
    // already exists, re-queues legacy orders paid before the outbox existed.
    await enqueueOrderPaidAutomations(prisma, orderId, { sendShopConfirmation: false }).catch(
      (err) => log.error({ err, orderId }, "Outbox enqueue (sync already-paid) failed"),
    );
    return { ok: true, code: "ALREADY_PAID" };
  }
  if (!order.stripeSessionId) {
    return { ok: false, code: "NO_SESSION" };
  }

  // Session id is account-scoped — retrieve from the account that issued it.
  const stripe = getStripeClient(order.countryCode);
  const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
  if (session.payment_status !== "paid") {
    return { ok: false, code: "NOT_PAID", paymentStatus: session.payment_status ?? undefined };
  }

  const result = await completeOrderPaymentFromCheckoutSession(
    orderId,
    {
      id: session.id,
      payment_intent:
        typeof session.payment_intent === "string" ? session.payment_intent : null,
      invoice:
        typeof session.invoice === "string" ? session.invoice : null,
      client_reference_id: session.client_reference_id,
      metadata: (session.metadata ?? undefined) as Record<string, string> | undefined,
    },
    { stripeEventId: `sync_${session.id}`, eventType: "checkout.session.sync" },
    log,
  );

  return { ok: true, code: result.alreadyPaid ? "ALREADY_PAID" : "SYNCED" };
}

/** Sync by Stripe Checkout session id (success URL fallback). */
export async function syncOrderPaymentFromStripeSession(
  stripeSessionId: string,
  log: PaymentLog = noopLog,
): Promise<SyncOrderPaymentResult> {
  // Resolve the order from OUR DB by the stored session id so we know which
  // account (country) issued it — the session id is account-scoped and can
  // only be retrieved with the matching client. syncOrderPaymentFromStripe
  // then does the Stripe retrieve with the correct account client.
  const order = await prisma.order.findFirst({
    where: { stripeSessionId },
    select: { id: true },
  });
  if (!order) return { ok: false, code: "NOT_FOUND" };

  return syncOrderPaymentFromStripe(order.id, log);
}
