import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { before, beforeEach, describe, it, mock } from "node:test";

// The module graph reaches the env config (DATABASE_URL required at parse
// time), so load .env before the deferred import. Mirrors the other billing /
// subscription tests. No DB or Stripe key is used — both are mocked below.
loadEnv({ path: join(__dirname, "../../..", ".env") });

/**
 * Money-path guard (no DB, no Stripe): `cancelActiveSubscriptionsForCustomer`
 * clears ABANDONED provider subscriptions before a fresh Checkout. It used to
 * cancel whatever it found — including subscriptions whose first invoice was
 * already settled, which Stripe does NOT refund. With a missing activation
 * webhook that path billed one customer three times in a day and kept only the
 * last subscription.
 */
describe("cancelActiveSubscriptionsForCustomer paid-invoice guard", () => {
  let StripeBillingPort: typeof import("./billing.stripe.js")["StripeBillingPort"];

  const canceled: string[] = [];
  let subscriptionsList: unknown[] = [];
  let invoicesForSubscription: (subId: string) => unknown[];
  let invoiceListThrows = false;

  before(async () => {
    mock.module("../subscriptions/ops/ops-alert.js", {
      namedExports: { emitOpsAlert: async () => {} },
    });
    mock.module("../../lib/stripe/client.js", {
      namedExports: {
        DEFAULT_STRIPE_ACCOUNT: "ie",
        resolveStripeAccount: () => "ie",
        getStripeClient: () => ({
          subscriptions: {
            list: async () => ({ data: subscriptionsList }),
            cancel: async (id: string) => {
              canceled.push(id);
              return { id };
            },
          },
          invoices: {
            list: async ({ subscription }: { subscription: string }) => {
              if (invoiceListThrows) throw new Error("stripe unavailable");
              return { data: invoicesForSubscription(subscription) };
            },
          },
        }),
      },
    });
    StripeBillingPort = (await import("./billing.stripe.js")).StripeBillingPort;
  });

  beforeEach(() => {
    canceled.length = 0;
    subscriptionsList = [];
    invoicesForSubscription = () => [];
    invoiceListThrows = false;
  });

  it("cancels an abandoned (never-paid) subscription", async () => {
    subscriptionsList = [{ id: "sub_unpaid", status: "incomplete" }];
    const result = await new StripeBillingPort().cancelActiveSubscriptionsForCustomer("cus_1");
    assert.deepEqual(canceled, ["sub_unpaid"]);
    assert.equal(result.canceled, 1);
    assert.equal(result.skippedPaid, 0);
  });

  it("REFUSES to cancel a subscription with a paid invoice", async () => {
    subscriptionsList = [{ id: "sub_paid", status: "active" }];
    invoicesForSubscription = () => [{ id: "in_1", status: "paid" }];
    const result = await new StripeBillingPort().cancelActiveSubscriptionsForCustomer("cus_1");
    assert.deepEqual(canceled, [], "a paid subscription must never be cancelled here");
    assert.equal(result.canceled, 0);
    assert.equal(result.skippedPaid, 1);
  });

  it("treats a failed invoice lookup as paid (refusing is recoverable)", async () => {
    subscriptionsList = [{ id: "sub_unknown", status: "active" }];
    invoiceListThrows = true;
    const result = await new StripeBillingPort().cancelActiveSubscriptionsForCustomer("cus_1");
    assert.deepEqual(canceled, []);
    assert.equal(result.skippedPaid, 1);
  });

  it("clears the abandoned one and keeps the paid one in a mixed set", async () => {
    subscriptionsList = [
      { id: "sub_paid", status: "active" },
      { id: "sub_abandoned", status: "incomplete" },
    ];
    invoicesForSubscription = (subId) =>
      subId === "sub_paid" ? [{ id: "in_1", status: "paid" }] : [];
    const result = await new StripeBillingPort().cancelActiveSubscriptionsForCustomer("cus_1");
    assert.deepEqual(canceled, ["sub_abandoned"]);
    assert.equal(result.canceled, 1);
    assert.equal(result.skippedPaid, 1);
  });

  it("ignores subscriptions already in a terminal status", async () => {
    subscriptionsList = [{ id: "sub_gone", status: "canceled" }];
    const result = await new StripeBillingPort().cancelActiveSubscriptionsForCustomer("cus_1");
    assert.deepEqual(canceled, []);
    assert.equal(result.canceled, 0);
    assert.equal(result.skippedPaid, 0);
  });
});
