import { PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { sendOrderConfirmationEmail } from "../../lib/email/templates.js";
import { getStripeClient, isStripeConfigured } from "../../lib/stripe/client.js";
import { orderHasTestBookingItem } from "./booking-kinds.js";
import {
  orderHasConsultationItem,
  orderIsPaidForMeet,
} from "../admin-orders/generate-order-meet-link.service.js";
import { stopPrePaymentFlowOnPaid } from "../automation/pre-payment-flow.service.js";
import { emitOpsAlert } from "../subscriptions/ops/ops-alert.js";
import { commitOrderCreditReservations } from "../subscriptions/checkout-pricing.service.js";
import { markCouponRedemptionConsumed } from "../coupons/coupon-release.service.js";
import { enqueueOrderPaidAutomations, enqueueMetaCapiPurchase } from "../outbox/outbox.js";
import { encryptPhi } from "../../lib/crypto/phi-crypto.js";
import { markRequisitionsReadyOnOrderPaid } from "../lab-orders/lab-requisitions.service.js";
import { resolvePatientProfileIdForNewAppointment } from "../patient-profile/appointment-patient-link.js";

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
    // Same self-heal for the Meta Conversions API send: skipDuplicates makes a
    // re-delivery a no-op, and an order whose first PAID flip predated this
    // feature still gets a row (the dispatcher then skips it if it carries no
    // consented attribution).
    await enqueueMetaCapiPurchase(prisma, orderId).catch((err) =>
      log.error({ err, orderId }, "Outbox enqueue (meta capi, already-paid) failed"),
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
    // Coupon: RESERVED → CONSUMED. The counter does not move — the use was
    // claimed when the order was created; this records that it stuck, so a
    // later cancellation knows it is releasing a spent use rather than an
    // abandoned one. Idempotent (updateMany filtered on RESERVED), so the
    // redelivery / sync-order path self-heals like the commit above.
    await markCouponRedemptionConsumed(orderId).catch((err) =>
      log.error({ err, orderId }, "Coupon redemption consume failed"),
    );
    // Cross-jurisdiction prescription: mint the async appointment + notify the
    // prescribing doctor on payment. Idempotent (guarded by request status +
    // unique asyncAppointmentId), so calling it on the redelivery / sync-order
    // path too is a self-heal, mirroring commitCreditsForPaidOrder above.
    await settleCrossBorderRxOnPaid(orderId, log);
    // Medical-access consent promotion (see below): the first-flip path fires
    // this from fulfillPaidOrderFromCheckoutSession, which this branch never
    // calls — so a redelivery/sync-order call that lands here would silently
    // never promote if the first delivery's own promotion attempt had failed.
    // Idempotent, same as the two calls above, so self-healing here is safe.
    void promoteConsentsAfterPayment(orderId, log);
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
  await markCouponRedemptionConsumed(orderId).catch((err) =>
    log.error({ err, orderId }, "Coupon redemption consume failed"),
  );
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

/**
 * PM-1. The route's top-level dedupe is a read-then-act, so two concurrent
 * deliveries of the SAME Stripe event both reach this function. The
 * `ProcessedWebhookEvent.stripeEventId` insert below is what actually settles
 * the race — it lives in the same transaction as the PAID flip and the outbox
 * rows, so the loser rolls back having applied nothing.
 *
 * Recognising that conflict is only about the response: without this the loser
 * threw, answered Stripe 500 and burned a retry to reach the `alreadyPaid`
 * branch it was always going to reach. It is NOT a blanket unique-error
 * swallow — the caller re-reads durable state and rethrows unless the event
 * really did complete.
 */
function isProcessedWebhookEventConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }
  // Discriminate on the model, not the field name: `Payment.stripeEventId` is
  // unique too, so a bare field match would let a future `Payment` write in
  // this transaction be misread as this race and silently reported as applied.
  //
  // `modelName` is what Prisma 7.9.1 actually populates here — verified against
  // a real violation on Postgres 18, which produced
  // `{ modelName: "ProcessedWebhookEvent", driverAdapterError: … }` and NO
  // `meta.target`. If a future client stops sending it, this returns false and
  // the caller rethrows: back to a 500 and a Stripe retry, which is where this
  // started, never a swallowed failure.
  return (error.meta as { modelName?: unknown } | undefined)?.modelName === "ProcessedWebhookEvent";
}

/** Idempotent: records Stripe event + flips order to PAID. Never throws on fulfillment errors. */
async function markOrderPaidFromStripeSession(
  orderId: string,
  session: CheckoutSessionSnapshot,
  opts: { stripeEventId: string; eventType: string },
  log: PaymentLog,
): Promise<{ alreadyPaid: boolean; resurrectedFromCancelled: boolean }> {
  try {
    return await markOrderPaidInTransaction(orderId, session, opts, log);
  } catch (error) {
    if (!isProcessedWebhookEventConflict(error)) throw error;

    // Re-read outside the rolled-back transaction: the conflict alone does not
    // prove the winner committed. Only the event row AND a paid order together
    // do — anything else is a real failure Stripe should retry.
    const [seen, order] = await Promise.all([
      prisma.processedWebhookEvent.findUnique({
        where: { stripeEventId: opts.stripeEventId },
        select: { id: true },
      }),
      prisma.order.findUnique({
        where: { id: orderId },
        select: { paymentStatus: true, status: true },
      }),
    ]);
    if (seen && (order?.paymentStatus === "PAID" || order?.status === "PAID")) {
      log.info(
        { orderId, stripeEventId: opts.stripeEventId },
        "Concurrent delivery of the same Stripe event lost the race; already applied",
      );
      return { alreadyPaid: true, resurrectedFromCancelled: false };
    }
    throw error;
  }
}

async function markOrderPaidInTransaction(
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
    // Same durable-outbox reasoning as above, for the Meta Conversions API
    // Purchase send: the dispatcher (meta-capi-dispatch.service.ts) is where
    // consent/config/zero-total gating happens, not here, so every paid order
    // gets a row and older orders with no adAttribution are simply skipped.
    await enqueueMetaCapiPurchase(tx, orderId);

    return { alreadyPaid: false, resurrectedFromCancelled };
  });
}

/**
 * Back-fill the patient's PatientProfile from an order line's intake snapshot,
 * and point the freshly-minted appointment at it when this line is keyed by the
 * patient's own address.
 *
 * Extracted so the consultation and test-booking mint loops share it verbatim.
 * Duplicating it would mean two copies of the PHI encryption rules and of the
 * family / booking-for-other guard, which is the kind of drift that turns into
 * a wrong-patient disclosure.
 */
async function backfillPatientProfile(
  tx: Prisma.TransactionClient,
  input: {
    item: Prisma.OrderItemGetPayload<Record<string, never>>;
    appointmentId: string;
    aptEmail: string | null;
    aptFullName: string;
    aptPhone: string | null;
    aptDob: Date | null;
    patientProfileId: string | null;
  },
): Promise<void> {
  const { item, appointmentId, aptEmail, aptFullName, aptPhone, aptDob, patientProfileId } =
    input;
  if (
    aptEmail &&
    (item.patientNationalIdNumber ||
      item.patientPassportNumber ||
      item.patientUtenteNumber ||
      item.patientAddressLine1 ||
      item.patientAddressCity ||
      item.insuranceCompanyId)
  ) {
    const existing = await tx.patientProfile.findUnique({
      where: { email: aptEmail.toLowerCase() },
      select: {
        nationalIdNumber: true,
        taxIdNumber: true,
        passportNumber: true,
        utenteNumber: true,
        addressLine1: true,
        addressLine2: true,
        addressCity: true,
        addressState: true,
        addressPostalCode: true,
        addressCountryCode: true,
        insuranceProviderName: true,
        insurancePolicyNumber: true,
      },
    });
    // Card snapshot lives on the order — resolve the company name once
    // so it lands on the profile alongside the (already-encrypted)
    // policy number instead of just the opaque insuranceCompanyId.
    const insuranceCompany = item.insuranceCompanyId
      ? await tx.insuranceCompany.findUnique({
          where: { id: item.insuranceCompanyId },
          select: { name: true },
        })
      : null;
    const fill = <T>(existingVal: T | null, snapshotVal: T | null): T | null =>
      existingVal ?? snapshotVal ?? null;
    const upsertedProfile = await tx.patientProfile.upsert({
      where: { email: aptEmail.toLowerCase() },
      update: {
        // PR-4: `nationalIdNumber`/`taxIdNumber` are in PHI_ENCRYPTED_FIELDS
        // but were the only two written through raw. Wrapped like their
        // siblings below; idempotent, so a cart item that already arrived
        // encrypted is not double-wrapped and a legacy plaintext one is
        // encrypted on the way in.
        nationalIdNumber: fill(
          existing?.nationalIdNumber ?? null,
          encryptPhi(item.patientNationalIdNumber),
        ),
        taxIdNumber: fill(
          existing?.taxIdNumber ?? null,
          encryptPhi(item.patientNationalIdNumber),
        ),
        // Encrypted on the way in: `existing` is already ciphertext when a
        // key is configured, so keeping it as-is is correct and only the
        // fresh snapshot value needs wrapping.
        passportNumber: fill(
          existing?.passportNumber ?? null,
          encryptPhi(item.patientPassportNumber),
        ),
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
        insuranceProviderName: fill(
          existing?.insuranceProviderName ?? null,
          insuranceCompany?.name ?? null,
        ),
        // Already ciphertext (same phi:v1: envelope) — copied verbatim,
        // same treatment as the Appointment snapshot above.
        insurancePolicyNumber: fill(
          existing?.insurancePolicyNumber ?? null,
          item.insurancePolicyNumber,
        ),
        // Not a `fill()` — the enum default is NOT_VERIFIED (not null), so
        // nullish-coalescing would never let this flip. An insurance line
        // only reaches payment once its order cleared the PENDING
        // verification gate (or was VERIFIED outright by an admin taking
        // a manual booking), so its presence here IS the verified signal.
        ...(item.insuranceCompanyId ? { insuranceDocumentStatus: "VERIFIED" as const } : {}),
      },
      create: {
        email: aptEmail.toLowerCase(),
        fullName: aptFullName,
        phone: aptPhone,
        dateOfBirth: aptDob,
        nationalIdNumber: encryptPhi(item.patientNationalIdNumber),
        taxIdNumber: encryptPhi(item.patientNationalIdNumber),
        passportNumber: encryptPhi(item.patientPassportNumber),
        utenteNumber: encryptPhi(item.patientUtenteNumber),
        addressLine1: item.patientAddressLine1,
        addressLine2: item.patientAddressLine2,
        addressCity: item.patientAddressCity,
        addressState: item.patientAddressState,
        addressPostalCode: item.patientAddressPostalCode,
        addressCountryCode: item.patientAddressCountryCode,
        insuranceProviderName: insuranceCompany?.name ?? null,
        insurancePolicyNumber: item.insurancePolicyNumber,
        ...(item.insuranceCompanyId ? { insuranceDocumentStatus: "VERIFIED" as const } : {}),
      },
    });

    // The upsert may have just MINTED the profile for a first-time patient,
    // in which case the link resolved above found nothing. Stamp it now —
    // but only when this row is keyed by the patient's own address. A
    // family / booking-for-other line upserts a profile for whichever
    // address the snapshot carried, and that is not authority to point the
    // consultation at it.
    if (!patientProfileId && !item.familyMemberId && !item.bookingForOther) {
      await tx.appointment.update({
        where: { id: appointmentId },
        data: { patientProfileId: upsertedProfile.id },
      });
    }
  }
}

/**
 * The centre address written onto a test booking's `locationAddress`.
 *
 * A SNAPSHOT, matching how every other address on an Appointment behaves: a
 * later edit to the centre must not silently rewrite what a patient was already
 * told to attend. Empty parts are dropped so a centre with no city does not
 * render a dangling comma.
 */
function formatTestCentreAddress(
  centre: { name: string; addressLine: string | null; city: string | null } | null,
): string | null {
  if (!centre) return null;
  const parts = [centre.name, centre.addressLine, centre.city].filter(
    (part): part is string => Boolean(part && part.trim()),
  );
  return parts.length > 0 ? parts.join(", ") : null;
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
    // Deliberately NOT folded into the filter above — see the second loop.
    const testBookingItems = order.items.filter((i) => i.kind === "TEST_BOOKING");

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
        const paymentData = {
          paymentStatus: PaymentStatus.PAID,
          paidAt: new Date(),
          stripePaymentIntentId:
            typeof session.payment_intent === "string" ? session.payment_intent : null,
        };
        if (item.bookingForOther || item.familyMemberId) {
          const claim = await tx.appointment.updateMany({
            where: { id: existingOnSlot.id, patientProfileId: null },
            data: existingOnSlot.paymentStatus === PaymentStatus.PAID
              ? { paymentStatus: PaymentStatus.PAID }
              : paymentData,
          });
          if (claim.count !== 1) {
            unfulfilled.push({
              itemId: item.id,
              slotId: item.timeSlotId,
              reason: "existing appointment is already bound to a patient",
            });
            continue;
          }
        } else if (existingOnSlot.paymentStatus !== PaymentStatus.PAID) {
          await tx.appointment.update({
            where: { id: existingOnSlot.id },
            data: paymentData,
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
      // The patient this consultation is FOR, which is NOT `order.userId` —
      // that is the payer. A family line names the dependent through
      // `familyMemberId`; a "booking for other" line names them through their
      // own `patientEmail` and must never fall back to the order's address.
      // Only a plain self-booking may use `aptEmail`, where the two agree.
      const patientProfileId = await resolvePatientProfileIdForNewAppointment(tx, {
        familyMemberId: item.familyMemberId,
        patientEmail: item.bookingForOther ? item.patientEmail : aptEmail,
      });

      const apt = await tx.appointment.create({
        data: {
          userId: order.userId,
          patientProfileId,
          countryCode: order.countryCode,
          consultationType,
          // Carried from the order so every appointment-level message (doctor
          // ready, no-show nudge) speaks the same language as the order-level
          // ones the patient has already received.
          notificationLocale: order.notificationLocale ?? null,
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
          // Declared membership / corporate / plan coverage, same deal: card
          // number copied verbatim in its envelope, never decrypted here.
          declaredCoverageSource: item.declaredCoverageSource,
          declaredCoverageRefId: item.declaredCoverageRefId,
          declaredCoverageCardNumber: item.declaredCoverageCardNumber,
        },
      });
      await tx.orderItem.update({
        where: { id: item.id },
        data: { appointmentId: apt.id },
      });
      appointmentIds.push(apt.id);

      await backfillPatientProfile(tx, {
        item,
        appointmentId: apt.id,
        aptEmail,
        aptFullName,
        aptPhone,
        aptDob,
        patientProfileId,
      });
    }

    // ── Test-centre bookings ────────────────────────────────────────────
    //
    // A SECOND loop rather than a widened `consultationItems` filter: the loop
    // above reads item.doctorId, the GP assignment log and DoctorTimeSlot
    // throughout, none of which a test line has. Both loops push into the same
    // `appointmentIds` / `unfulfilled` arrays, so everything after them —
    // Order.appointmentIds, the OrderAppointment dual-write, the ops alert —
    // covers test bookings for free.
    for (const item of testBookingItems) {
      // Already minted (an admin manual test booking, paid later). Commit the
      // held slot and record the payment; do not mint a second appointment.
      if (item.appointmentId) {
        if (item.testCenterTimeSlotId) {
          const claim = await tx.testCenterTimeSlot.updateMany({
            where: {
              id: item.testCenterTimeSlotId,
              status: { in: ["HELD", "OPEN"] },
            },
            data: { status: "BOOKED" },
          });
          if (claim.count === 0) {
            log.warn(
              { orderId, itemId: item.id, slotId: item.testCenterTimeSlotId },
              "Manual test booking slot already claimed — appointment payment still recorded",
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

      if (!item.testCenterTimeSlotId || !item.testCenterId || !item.examTypeId) {
        log.warn(
          { orderId, itemId: item.id },
          "Test booking order item missing slot/centre/exam",
        );
        unfulfilled.push({
          itemId: item.id,
          slotId: item.testCenterTimeSlotId,
          reason: "missing slot/centre/exam on the order line",
        });
        continue;
      }

      const existingOnSlot = await tx.appointment.findUnique({
        where: { testCenterTimeSlotId: item.testCenterTimeSlotId },
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

      // BOOKED is claimable here for the same reason as the consultation loop:
      // the lookup above proved no appointment occupies this slot.
      const claim = await tx.testCenterTimeSlot.updateMany({
        where: {
          id: item.testCenterTimeSlotId,
          status: { in: ["HELD", "OPEN", "BOOKED"] },
        },
        data: { status: "BOOKED" },
      });
      if (claim.count === 0) {
        log.warn(
          { orderId, itemId: item.id, slotId: item.testCenterTimeSlotId },
          "Test centre slot already claimed by someone else — appointment skipped",
        );
        unfulfilled.push({
          itemId: item.id,
          slotId: item.testCenterTimeSlotId,
          reason: "held slot is gone or no longer claimable",
        });
        continue;
      }

      const slot = await tx.testCenterTimeSlot.findUniqueOrThrow({
        where: { id: item.testCenterTimeSlotId },
      });
      const centre = await tx.testCenter.findUnique({
        where: { id: item.testCenterId },
        select: { name: true, addressLine: true, city: true },
      });

      const aptFullName = item.patientFullName ?? order.fullName;
      const aptEmail = item.patientEmail ?? order.email;
      const aptPhone = item.patientPhone ?? order.phone;
      const aptDob = item.patientDateOfBirth ?? null;
      const aptNotes = item.patientNotes ?? null;
      const patientProfileId = await resolvePatientProfileIdForNewAppointment(tx, {
        familyMemberId: item.familyMemberId,
        patientEmail: item.bookingForOther ? item.patientEmail : aptEmail,
      });

      const apt = await tx.appointment.create({
        data: {
          userId: order.userId,
          patientProfileId,
          countryCode: order.countryCode,
          // The exam name, snapshotted on the line at add-to-cart in the
          // patient's own locale.
          consultationType: item.name,
          notificationLocale: order.notificationLocale ?? null,
          fullName: aptFullName,
          email: aptEmail,
          phone: aptPhone,
          dateOfBirth: aptDob,
          notes: aptNotes,
          consentAccepted: true,
          status: "REQUEST_RECEIVED",
          examTypeId: item.examTypeId,
          testCenterId: item.testCenterId,
          testCenterTimeSlotId: item.testCenterTimeSlotId,
          scheduledAt: slot.startAt,
          amountCents: item.unitPriceCents,
          currencyCode: order.currencyCode,
          paymentStatus: PaymentStatus.PAID,
          paidAt: new Date(),
          // No doctor, no meeting link. IN_PERSON + a locationAddress snapshot
          // is what makes every existing notification and reminder path render
          // the centre's address where a consultation shows its Meet link —
          // see appointment-reminder.service.ts, which needs no change at all.
          doctorId: null,
          serviceId: null,
          consultationMode: "IN_PERSON",
          meetingUrl: null,
          locationAddress: formatTestCentreAddress(centre),
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
        },
      });
      await tx.orderItem.update({
        where: { id: item.id },
        data: { appointmentId: apt.id },
      });
      appointmentIds.push(apt.id);

      await backfillPatientProfile(tx, {
        item,
        appointmentId: apt.id,
        aptEmail,
        aptFullName,
        aptPhone,
        aptDob,
        patientProfileId,
      });
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
      // Ireland: ask the patient to verify their identity now, while there is
      // still time before the consultation. Verification needs a human to
      // review a photo, so a request raised mid-consultation is already too
      // late to help that consultation. No-ops for every other country, and
      // for a patient already verified or already asked.
      void import("../identity-verification/on-appointment-confirmed.js")
        .then((m) => m.onAppointmentConfirmed(appointmentId))
        .catch(() => {});
    }
    // Promote booking-time medical-access consent into the append-only
    // ledger — see promoteConsentsAfterPayment below. Fire-and-forget: a
    // promotion miss must never affect the paid order.
    void promoteConsentsAfterPayment(orderId, log);
  });
}

/**
 * Promote booking-time medical-access consent into the append-only
 * PatientConsent ledger for both logged-in and guest checkouts — this is
 * also where a guest's PatientProfile gets upserted by email (in
 * fulfillPaidOrderFromCheckoutSession above), so this is the most reliable
 * point to catch guest promotions. Idempotent (promoteAppointmentConsents
 * skips consent types that already have a matching source="BOOKING_FORM"
 * row), so it is safe to call from BOTH the first-flip fulfillment path AND
 * the alreadyPaid short-circuit (webhook redelivery / sync-order race) —
 * mirroring commitCreditsForPaidOrder / settleCrossBorderRxOnPaid above,
 * which already self-heal on every call for the same reason.
 *
 * Fire-and-forget: a promotion miss must never affect the paid order — but
 * it gates a doctor's PHI access, so a failure must never be swallowed
 * silently (a bare `.catch(() => {})` here is how ORD-000298 went unnoticed:
 * resolveOrCreatePatientProfile's case-sensitive email lookup missed the
 * existing profile and the fallback create() hit the unique constraint on
 * PatientProfile.userId, and nothing recorded it).
 */
async function promoteConsentsAfterPayment(orderId: string, log: PaymentLog): Promise<void> {
  let order: { userId: string | null; email: string } | null = null;
  try {
    order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { userId: true, email: true },
    });
    if (!order?.email) return;
    const { promoteAppointmentConsents } = await import(
      "../consents/promote-appointment-consents.js"
    );
    await promoteAppointmentConsents(order.userId ?? null, order.email);
  } catch (err) {
    log.error(
      { err, orderId, userId: order?.userId ?? null, email: order?.email },
      "Could not promote booking-time medical-access consents after payment",
    );
    await emitOpsAlert({
      severity: "critical",
      title: "Post-payment medical-access consent promotion failed",
      detail:
        "The patient's booking-time consent was not written to the ledger, so their doctor may be denied PHI access (DOCTOR_NO_VALID_ACCESS_PATH). Run backend/scripts/promote-guest-consents.ts or backfill manually.",
      context: { orderId, userId: order?.userId ?? null, email: order?.email },
    });
  }
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
    items: { name: string; quantity: number; lineTotalCents: number; kind: string }[];
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
    hasPrescriptionItem: paidOrder.items.some((i) => i.kind === "PRESCRIPTION_SERVICE"),
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

  // Test-centre booking with no consultation on the order: there is no meeting
  // link to provision, only an address the patient already has on the line.
  //
  // This MUST stay ABOVE the `hasConsult` branch. `hasConsult` ORs in
  // `appointmentIds.length > 0`, and a test order DOES mint an appointment — so
  // without this early return it satisfies that term, walks into the
  // meeting-link path, finds no consultation item to build a Meet link from,
  // and returns having advanced nothing. The order would sit at
  // POST_PAYMENT_STAGE_PAID indefinitely and the patient would never be told
  // their booking is confirmed. Their money is taken either way.
  const hasTestBooking = orderHasTestBookingItem(paidOrder.items);
  const hasConsultItem = orderHasConsultationItem(paidOrder.items);
  if (hasTestBooking && !hasConsultItem) {
    const { post_sendVenueNotifications } = await import(
      "../automation/post-payment-flow.service.js"
    );
    await post_sendVenueNotifications(orderId).catch((err) => {
      log.warn({ err, orderId }, "Test booking confirmation notifications failed");
    });
    return;
  }

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
    await enqueueMetaCapiPurchase(prisma, orderId).catch((err) =>
      log.error({ err, orderId }, "Outbox enqueue (meta capi, sync already-paid) failed"),
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
