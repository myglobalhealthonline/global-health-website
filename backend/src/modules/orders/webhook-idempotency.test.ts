import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { shouldProcessOrderWebhook } from "./webhook-idempotency.js";

describe("order webhook idempotency gate", () => {
  it("skips when the order does not exist (orphaned Stripe event)", () => {
    assert.equal(shouldProcessOrderWebhook({ order: null }), false);
  });

  it("processes a fresh PENDING order", () => {
    assert.equal(
      shouldProcessOrderWebhook({
        order: { paymentStatus: "PENDING", status: "PENDING" },
      }),
      true,
    );
  });

  it("skips a retry of an already-PAID order (paymentStatus check)", () => {
    // This is the regression case: Stripe retries `checkout.session.completed`
    // on any 5xx or duplicate-delivery sweep. Before this gate, the retry
    // would re-decrement health-test stock and re-send the confirmation email.
    assert.equal(
      shouldProcessOrderWebhook({
        order: { paymentStatus: "PAID", status: "PAID" },
      }),
      false,
    );
  });

  it("skips when status is PAID even if paymentStatus says otherwise", () => {
    // Defensive: two columns track the lifecycle (status + paymentStatus).
    // The webhook flips both in one tx, but if a future code path
    // updates only `status`, the gate should still hold.
    assert.equal(
      shouldProcessOrderWebhook({
        order: { paymentStatus: "PENDING", status: "PAID" },
      }),
      false,
    );
  });

  it("processes when order is FULFILLED but not PAID (manual fulfilment edge)", () => {
    // FULFILLED means staff marked it shipped/delivered. That's a
    // downstream status — the webhook still has work to do (paying it).
    // This case shouldn't happen in practice but the gate must not
    // assume FULFILLED implies PAID.
    assert.equal(
      shouldProcessOrderWebhook({
        order: { paymentStatus: "PENDING", status: "FULFILLED" },
      }),
      true,
    );
  });
});
