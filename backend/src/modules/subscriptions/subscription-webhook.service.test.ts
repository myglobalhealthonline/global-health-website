import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { after, before, describe, it } from "node:test";

loadEnv({ path: join(__dirname, "../../..", ".env") });

/**
 * Subscription webhook integration tests using CANNED Stripe fixtures posted
 * straight to handleSubscriptionEvent — no Stripe keys or signatures (§27).
 * Requires Postgres; skips when unreachable.
 */
describe("subscription webhook lifecycle", () => {
  let prisma: Awaited<typeof import("../../db/prisma.js")>["prisma"];
  let handleSubscriptionEvent: typeof import("./subscription-webhook.service.js")["handleSubscriptionEvent"];
  let getBalance: typeof import("../credits/credit-balance.service.js")["getBalance"];
  let makeSubscriptionFixture: typeof import("./test-support.js")["makeSubscriptionFixture"];
  let bootError: unknown = null;
  const eventIds = new Set<string>();

  before(async () => {
    try {
      prisma = (await import("../../db/prisma.js")).prisma;
      handleSubscriptionEvent = (await import("./subscription-webhook.service.js"))
        .handleSubscriptionEvent;
      getBalance = (await import("../credits/credit-balance.service.js")).getBalance;
      makeSubscriptionFixture = (await import("./test-support.js")).makeSubscriptionFixture;
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (err) {
      bootError = err;
    }
  });

  after(async () => {
    if (!bootError && eventIds.size > 0) {
      await prisma.processedWebhookEvent.deleteMany({
        where: { stripeEventId: { in: [...eventIds] } },
      });
    }
  });

  const skip = (): boolean => Boolean(bootError);

  function invoicePaid(
    subId: string,
    periodStart: string,
    periodEnd: string,
    reason: string,
    eventId: string,
    amountPaid = 2000,
  ) {
    eventIds.add(eventId);
    return {
      id: eventId,
      type: "invoice.payment_succeeded",
      data: {
        object: {
          id: `in_${eventId}`,
          subscription: subId,
          billing_reason: reason,
          amount_paid: amountPaid,
          currency: "eur",
          number: "INV-1",
          lines: {
            data: [
              {
                period: {
                  start: Math.floor(new Date(periodStart).getTime() / 1000),
                  end: Math.floor(new Date(periodEnd).getTime() / 1000),
                },
              },
            ],
          },
        } as Record<string, unknown>,
      },
    };
  }

  it("first invoice grants month-1 credits + promotes ACTIVE; retry idempotent", async (t) => {
    if (skip()) return t.skip();
    const subStripeId = `sub_test_${Date.now()}_a`;
    const fx = await makeSubscriptionFixture(prisma, "wh-first", {
      status: "INCOMPLETE",
      paidMonthsCount: 0,
      monthlyConsultationCredits: 3,
      wellnessCreditsPerMonth: 1,
      stripeSubscriptionId: subStripeId,
    });
    try {
      const ev = invoicePaid(
        subStripeId,
        "2026-06-01T00:00:00Z",
        "2026-07-01T00:00:00Z",
        "subscription_create",
        `evt_${subStripeId}_1`,
      );
      const r1 = await handleSubscriptionEvent(ev);
      assert.equal(r1.detail, "granted");

      const sub = await prisma.userSubscription.findUnique({ where: { id: fx.subscriptionId } });
      assert.equal(sub?.status, "ACTIVE");
      assert.equal(sub?.paidMonthsCount, 1);
      assert.equal(await getBalance(fx.subscriptionId, "CONSULTATION"), 3);
      assert.equal(await getBalance(fx.subscriptionId, "WELLNESS"), 1);

      // Exact retry (same event id) → deduped, no double grant.
      const r2 = await handleSubscriptionEvent(ev);
      assert.equal(r2.detail, "deduped");
      assert.equal(await getBalance(fx.subscriptionId, "CONSULTATION"), 3);

      // Different event id, SAME period → period-keyed no-op.
      const dupPeriod = invoicePaid(
        subStripeId,
        "2026-06-01T00:00:00Z",
        "2026-07-01T00:00:00Z",
        "subscription_cycle",
        `evt_${subStripeId}_dup`,
      );
      const r3 = await handleSubscriptionEvent(dupPeriod);
      assert.equal(r3.detail, "duplicate-period");
      assert.equal(await getBalance(fx.subscriptionId, "CONSULTATION"), 3);
      const subAfter = await prisma.userSubscription.findUnique({ where: { id: fx.subscriptionId } });
      assert.equal(subAfter?.paidMonthsCount, 1, "paidMonthsCount not advanced by duplicate");
    } finally {
      await fx.cleanup();
    }
  });

  it("payment_failed → PAST_DUE, no credits", async (t) => {
    if (skip()) return t.skip();
    const subStripeId = `sub_test_${Date.now()}_b`;
    const fx = await makeSubscriptionFixture(prisma, "wh-fail", {
      status: "ACTIVE",
      consultationBalance: 2,
      stripeSubscriptionId: subStripeId,
    });
    try {
      const eventId = `evt_${subStripeId}_fail`;
      eventIds.add(eventId);
      const r = await handleSubscriptionEvent({
        id: eventId,
        type: "invoice.payment_failed",
        data: { object: { id: "in_x", subscription: subStripeId } },
      });
      assert.equal(r.detail, "past_due");
      const sub = await prisma.userSubscription.findUnique({ where: { id: fx.subscriptionId } });
      assert.equal(sub?.status, "PAST_DUE");
      assert.equal(await getBalance(fx.subscriptionId, "CONSULTATION"), 2, "credits untouched");
    } finally {
      await fx.cleanup();
    }
  });

  it("stale subscription.updated after CANCELED does not reactivate", async (t) => {
    if (skip()) return t.skip();
    const subStripeId = `sub_test_${Date.now()}_c`;
    const fx = await makeSubscriptionFixture(prisma, "wh-stale", {
      status: "CANCELED",
      stripeSubscriptionId: subStripeId,
    });
    try {
      const eventId = `evt_${subStripeId}_stale`;
      eventIds.add(eventId);
      const r = await handleSubscriptionEvent({
        id: eventId,
        type: "customer.subscription.updated",
        data: {
          object: {
            id: subStripeId,
            status: "active",
            cancel_at_period_end: false,
            current_period_end: Math.floor(new Date("2026-08-01T00:00:00Z").getTime() / 1000),
          },
        },
      });
      assert.equal(r.detail, "stale-ignored");
      const sub = await prisma.userSubscription.findUnique({ where: { id: fx.subscriptionId } });
      assert.equal(sub?.status, "CANCELED", "canceled sub stays canceled");
    } finally {
      await fx.cleanup();
    }
  });

  it("charge.refunded claws back unused credits + cancels", async (t) => {
    if (skip()) return t.skip();
    const subStripeId = `sub_test_${Date.now()}_d`;
    const customerId = `cus_test_${Date.now()}_d`;
    const fx = await makeSubscriptionFixture(prisma, "wh-refund", {
      status: "ACTIVE",
      paidMonthsCount: 2,
      consultationBalance: 3,
      stripeSubscriptionId: subStripeId,
      stripeCustomerId: customerId,
    });
    try {
      const eventId = `evt_${subStripeId}_refund`;
      eventIds.add(eventId);
      const r = await handleSubscriptionEvent({
        id: eventId,
        type: "charge.refunded",
        data: { object: { customer: customerId, amount_refunded: 2000 } },
      });
      assert.ok(r.handled);
      const sub = await prisma.userSubscription.findUnique({ where: { id: fx.subscriptionId } });
      assert.equal(sub?.status, "CANCELED");
      assert.equal(sub?.paidMonthsCount, 1, "paidMonthsCount decremented");
      assert.equal(await getBalance(fx.subscriptionId, "CONSULTATION"), 0, "unused credits clawed back");
    } finally {
      await fx.cleanup();
    }
  });

  it("renewal invoice on a CANCELED sub does not resurrect it or grant", async (t) => {
    if (skip()) return t.skip();
    const subStripeId = `sub_test_${Date.now()}_e`;
    const fx = await makeSubscriptionFixture(prisma, "wh-cancelled-charge", {
      status: "CANCELED",
      paidMonthsCount: 1,
      consultationBalance: 0,
      monthlyConsultationCredits: 3,
      stripeSubscriptionId: subStripeId,
    });
    try {
      const r = await handleSubscriptionEvent(
        invoicePaid(
          subStripeId,
          "2026-07-01T00:00:00Z",
          "2026-08-01T00:00:00Z",
          "subscription_cycle",
          `evt_${subStripeId}_zombie`,
        ),
      );
      assert.ok(r.handled, "acked — retrying would not help");
      const sub = await prisma.userSubscription.findUnique({ where: { id: fx.subscriptionId } });
      assert.equal(sub?.status, "CANCELED", "refunded membership must stay canceled");
      assert.equal(sub?.paidMonthsCount, 1, "tenure not advanced by a charge we refuse");
      assert.equal(await getBalance(fx.subscriptionId, "CONSULTATION"), 0, "no credits granted");
    } finally {
      await fx.cleanup();
    }
  });

  it("past_due subscription.updated does not advance the paid period", async (t) => {
    if (skip()) return t.skip();
    const subStripeId = `sub_test_${Date.now()}_f`;
    const paidPeriodEnd = new Date("2026-07-01T00:00:00Z");
    const fx = await makeSubscriptionFixture(prisma, "wh-pastdue-period", {
      status: "ACTIVE",
      stripeSubscriptionId: subStripeId,
    });
    try {
      await prisma.userSubscription.update({
        where: { id: fx.subscriptionId },
        data: { currentPeriodEnd: paidPeriodEnd },
      });
      const eventId = `evt_${subStripeId}_pastdue`;
      eventIds.add(eventId);
      // Stripe rolls current_period_* forward at renewal BEFORE the invoice
      // settles — writing that off a past_due echo gave a delinquent subscriber
      // a free month of benefits (PAST_DUE eligibility keys on this field).
      await handleSubscriptionEvent({
        id: eventId,
        type: "customer.subscription.updated",
        data: {
          object: {
            id: subStripeId,
            status: "past_due",
            cancel_at_period_end: false,
            current_period_end: Math.floor(new Date("2026-08-01T00:00:00Z").getTime() / 1000),
          },
        },
      });
      const sub = await prisma.userSubscription.findUnique({ where: { id: fx.subscriptionId } });
      assert.equal(sub?.status, "PAST_DUE");
      assert.equal(
        sub?.currentPeriodEnd?.toISOString(),
        paidPeriodEnd.toISOString(),
        "period pinned to the last period actually paid for",
      );
    } finally {
      await fx.cleanup();
    }
  });
});
