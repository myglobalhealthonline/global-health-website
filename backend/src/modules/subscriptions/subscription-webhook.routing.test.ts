import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { before, describe, it } from "node:test";

// The routing function is pure, but its module graph transitively imports the
// env config (which requires DATABASE_URL at parse time), so load .env first
// and defer the import to a before() hook (no static import is hoisted above
// loadEnv). Mirrors subscription-webhook.service.test.ts.
loadEnv({ path: join(__dirname, "../../..", ".env") });

/**
 * Pure routing tests for isSubscriptionEvent — no DB, no Stripe. Guards the B2
 * fix: charge.refunded / charge.dispute.created must go to the subscription
 * clawback handler ONLY for invoice-backed (subscription) charges, and fall
 * through to the order/appointment refund branch for one-off payment charges.
 */
describe("isSubscriptionEvent routing", () => {
  let isSubscriptionEvent: typeof import("./subscription-webhook.service.js")["isSubscriptionEvent"];
  before(async () => {
    isSubscriptionEvent = (await import("./subscription-webhook.service.js")).isSubscriptionEvent;
  });

  const ev = (type: string, object: Record<string, unknown>) => ({
    id: "evt_x",
    type,
    data: { object },
  });

  it("subscription-mode checkout is a subscription event", () => {
    assert.equal(isSubscriptionEvent(ev("checkout.session.completed", { mode: "subscription" })), true);
  });

  it("order-mode checkout is NOT a subscription event", () => {
    assert.equal(
      isSubscriptionEvent(ev("checkout.session.completed", { mode: "payment", metadata: { kind: "order" } })),
      false,
    );
  });

  it("invoice-backed charge.refunded routes to subscription handler", () => {
    assert.equal(
      isSubscriptionEvent(ev("charge.refunded", { customer: "cus_1", invoice: "in_1" })),
      true,
    );
  });

  it("one-off charge.refunded (no invoice) falls through to order/appointment path", () => {
    assert.equal(
      isSubscriptionEvent(ev("charge.refunded", { payment_intent: "pi_1", customer: "cus_1" })),
      false,
    );
  });

  it("invoice-backed charge.dispute.created routes to subscription handler", () => {
    assert.equal(
      isSubscriptionEvent(ev("charge.dispute.created", { customer: "cus_1", invoice: "in_1" })),
      true,
    );
  });

  it("one-off charge.dispute.created (no invoice) is NOT a subscription event", () => {
    assert.equal(
      isSubscriptionEvent(ev("charge.dispute.created", { payment_intent: "pi_1" })),
      false,
    );
  });

  it("invoice.paid alias is a subscription event", () => {
    assert.equal(isSubscriptionEvent(ev("invoice.paid", { subscription: "sub_1" })), true);
  });

  it("unrelated event types are ignored", () => {
    assert.equal(isSubscriptionEvent(ev("payment_intent.succeeded", {})), false);
  });
});
