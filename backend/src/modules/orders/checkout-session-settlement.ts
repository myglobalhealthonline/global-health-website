/**
 * Decide whether a `checkout.session.*` webhook event actually means money
 * moved, and may therefore mark an order PAID.
 *
 * The distinction exists because `checkout.session.completed` is NOT a payment.
 * Portugal's checkout offers Multibanco, a delayed-notification method: Stripe
 * completes the session the instant the Entidade/Referência voucher is printed
 * and fires `completed` with `payment_status: "unpaid"`. The patient then pays
 * at an ATM or in homebanking, SIBS reports it hours or days later, and only
 * then does Stripe fire `checkout.session.async_payment_succeeded`. A voucher
 * that is never paid produces `checkout.session.async_payment_failed` instead.
 *
 * Until 2026-08-25 this handler treated `completed` and
 * `async_payment_succeeded` identically, so a PT patient who selected
 * Multibanco was sent a booking confirmation (and, in Portugal, issued a real
 * fiscal invoice) the moment the reference was generated — for money that had
 * not been received and might never be.
 *
 * Pure function so the regression test can run without Stripe or a database.
 */

/**
 * Session `payment_status` values that mean "nothing more is owed".
 *
 * An allowlist rather than `!== "unpaid"`: an unrecognised status must hold the
 * order rather than confirm a booking nobody paid for. `no_payment_required` is
 * here for completeness — €0 credit-covered orders are fulfilled without Stripe
 * (see orders.route.ts) so no such session reaches this code today.
 */
const SETTLED_PAYMENT_STATUSES = new Set(["paid", "no_payment_required"]);

export type CheckoutSettlementInput = {
  /** The Stripe event type, e.g. `checkout.session.completed`. */
  eventType: string;
  /** `session.payment_status` — absent on payloads that predate it. */
  paymentStatus?: string | null;
};

export function isSettledCheckoutSession(input: CheckoutSettlementInput): boolean {
  // `async_payment_succeeded` fires only after the bank confirms, so it is
  // settled by definition — Stripe has been known to send it with the session's
  // `payment_status` still lagging, and gating it would strand a real payment.
  if (input.eventType === "checkout.session.async_payment_succeeded") return true;
  return SETTLED_PAYMENT_STATUSES.has(input.paymentStatus ?? "");
}
