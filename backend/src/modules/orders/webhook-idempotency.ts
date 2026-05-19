/**
 * Decide whether a Stripe `checkout.session.completed` (order branch)
 * webhook should run the side-effects (decrement stock, mint
 * appointments, send the confirmation email).
 *
 * Returns false (skip) when:
 *   • the order doesn't exist (orphaned event)
 *   • the order is already PAID (a Stripe retry of an event we already
 *     processed). The order branch never writes a `Payment` row keyed
 *     by `event.id`, so the top-of-handler dedupe doesn't fire — this
 *     gate is the only thing standing between a retry and double-
 *     decrementing the same stock or double-sending the confirmation
 *     email.
 *
 * Pure function so the regression test can run without a database. The
 * route handler keeps the same logic inline (inside its tx callback)
 * so callers reading the file don't have to chase across modules.
 */
export type OrderWebhookGateInput = {
  order: {
    paymentStatus: string;
    status: string;
  } | null;
};

export function shouldProcessOrderWebhook(input: OrderWebhookGateInput): boolean {
  if (!input.order) return false;
  if (input.order.paymentStatus === "PAID") return false;
  if (input.order.status === "PAID") return false;
  return true;
}
