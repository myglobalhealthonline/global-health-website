import { prisma } from "../../db/prisma.js";
import { getStripeClient, isStripeConfigured } from "../../lib/stripe/client.js";

type VoidLog = {
  warn: (obj: unknown, msg?: string) => void;
  info: (obj: unknown, msg?: string) => void;
};

const noopLog: VoidLog = { warn: () => undefined, info: () => undefined };

export type VoidCheckoutPaymentResult =
  | "voided"
  | "nothing-to-void"
  | "already-paid"
  | "failed";

/**
 * Kill any payment still in flight on an order we are cancelling.
 *
 * Card checkouts need nothing here: an unpaid card session simply expires and
 * no instrument exists that the patient could still pay. Multibanco does. Its
 * Entidade/Referência voucher lives on the PaymentIntent, Stripe fixes its
 * lifetime at ~7 days, and NOTHING in the API makes that configurable —
 * `payment_method_options.multibanco` carries only `setup_future_usage`, and
 * the session's own `expires_at` stops applying the moment the voucher prints
 * and the session goes `complete`.
 *
 * Left alone, that voucher outlives our payment deadline: we cancel the order
 * and release the slot at `paymentDueAt`, then days later the patient pays the
 * reference at an ATM, Stripe reports `async_payment_succeeded` against a
 * CANCELLED order, and we are holding money for a consultation that no longer
 * exists (the `resurrectedFromCancelled` alarm in complete-order-payment).
 *
 * Cancelling the PaymentIntent voids the reference at SIBS, so the deadline a
 * Multibanco patient is held to is our ordinary `paymentDueAt` and not Stripe's
 * 7 days. Call this BEFORE releasing the slot.
 *
 * Never throws — a cancellation must not be blocked by Stripe being
 * unreachable. Returns `"already-paid"` when the intent turns out to have
 * succeeded, which is the caller's cue to abort the teardown entirely.
 */
export async function voidOrderCheckoutPayment(
  order: {
    id: string;
    countryCode: string;
    stripeSessionId: string | null;
    stripePaymentIntentId: string | null;
  },
  log: VoidLog = noopLog,
): Promise<VoidCheckoutPaymentResult> {
  if (!order.stripeSessionId && !order.stripePaymentIntentId) return "nothing-to-void";
  if (!isStripeConfigured(order.countryCode)) return "nothing-to-void";

  try {
    const stripe = getStripeClient(order.countryCode);

    // The Order only carries `stripePaymentIntentId` once it has been marked
    // PAID, so an unpaid voucher's intent has to come off the session.
    let paymentIntentId = order.stripePaymentIntentId;
    if (!paymentIntentId && order.stripeSessionId) {
      const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
      paymentIntentId =
        typeof session.payment_intent === "string" ? session.payment_intent : null;

      // Still `open` means the patient never got as far as a voucher — expiring
      // the session is enough, and it is the only thing that works (there is no
      // intent to cancel yet).
      if (session.status === "open") {
        await stripe.checkout.sessions.expire(order.stripeSessionId).catch(() => undefined);
        if (!paymentIntentId) return "voided";
      }
    }
    if (!paymentIntentId) return "nothing-to-void";

    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status === "succeeded" || intent.status === "processing") {
      // `processing` = the patient has paid the reference and SIBS is settling.
      // Cancelling now would be destroying a real payment.
      log.warn(
        { orderId: order.id, paymentIntentId, status: intent.status },
        "Refusing to void a payment intent that is already paid or settling",
      );
      return "already-paid";
    }
    if (intent.status === "canceled") return "nothing-to-void";

    await stripe.paymentIntents.cancel(paymentIntentId, { cancellation_reason: "abandoned" });
    log.info(
      { orderId: order.id, paymentIntentId },
      "Voided the checkout payment intent (Multibanco reference is now dead)",
    );
    return "voided";
  } catch (err) {
    log.warn({ err, orderId: order.id }, "Could not void the order's checkout payment");
    return "failed";
  }
}

/** Load the Stripe ids for an order and void whatever is in flight on it. */
export async function voidOrderCheckoutPaymentById(
  orderId: string,
  log: VoidLog = noopLog,
): Promise<VoidCheckoutPaymentResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      countryCode: true,
      stripeSessionId: true,
      stripePaymentIntentId: true,
    },
  });
  if (!order) return "nothing-to-void";
  return voidOrderCheckoutPayment(order, log);
}
