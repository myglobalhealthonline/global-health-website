import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { before, describe, it } from "node:test";

loadEnv({ path: join(__dirname, "../../..", ".env") });

/**
 * Regression test for a bug found in a prior review pass: the sync-order
 * fallback (fires on every checkout-success page load, races the real
 * Stripe webhook) and the webhook itself both call
 * completeOrderPaymentFromCheckoutSession, but only the call that actually
 * flips the order to PAID used to run commitOrderCreditReservations — the
 * OTHER path (whichever loses the race and sees alreadyPaid=true) returned
 * early and skipped the commit entirely. Net effect: the credit was already
 * decremented at reservation time, but the reservation ledger row stayed
 * RESERVED forever with no automatic repair — the patient got the service
 * and permanently lost the credit.
 *
 * Fixed by moving the commit into completeOrderPaymentFromCheckoutSession
 * itself, called on every invocation (idempotent — a no-op once already
 * committed) rather than only from the webhook route after a fresh PAID
 * transition. This test simulates the exact race: two calls with different
 * stripeEventIds (one for "sync", one for "webhook"), and asserts the
 * reservation is CONSUMED regardless of which one wins.
 */
describe("completeOrderPaymentFromCheckoutSession credit-commit race", () => {
  let prisma: Awaited<typeof import("../../db/prisma.js")>["prisma"];
  let svc: typeof import("./complete-order-payment.service.js");
  let cp: typeof import("../subscriptions/checkout-pricing.service.js");
  let credits: typeof import("../credits/credit-balance.service.js");
  let makeSubscriptionFixture: typeof import("../subscriptions/test-support.js")["makeSubscriptionFixture"];
  let bootError: unknown = null;

  before(async () => {
    try {
      prisma = (await import("../../db/prisma.js")).prisma;
      svc = await import("./complete-order-payment.service.js");
      cp = await import("../subscriptions/checkout-pricing.service.js");
      credits = await import("../credits/credit-balance.service.js");
      makeSubscriptionFixture = (await import("../subscriptions/test-support.js")).makeSubscriptionFixture;
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (err) {
      bootError = err;
    }
  });

  const skip = (): boolean => Boolean(bootError);

  function creditSnapshot() {
    return {
      snapshotVersion: 1,
      monthlyPriceCents: 4900,
      currencyCode: "EUR",
      monthlyConsultationCredits: 3,
      wellnessCreditsPerMonth: 0,
      familyEnabled: false,
      consultationRules: [
        {
          serviceId: "svc-race",
          isIncluded: true,
          usesCredits: true,
          creditsPerUse: 1,
          discountMode: "NONE",
          discountPercent: null,
          fixedPriceCents: null,
          unlockAfterPaidMonths: 0,
          familyUsable: false,
        },
      ],
      perkRules: [],
      healthTestRules: [],
    };
  }

  async function reservedOrder(
    fx: Awaited<ReturnType<typeof makeSubscriptionFixture>>,
  ): Promise<string> {
    const order = await prisma.order.create({
      data: {
        userId: fx.userId,
        email: "race@test.local",
        fullName: "Race",
        countryCode: fx.countryCode,
        currencyCode: "EUR",
        subtotalCents: 0,
        shippingCents: 0,
        totalCents: 0,
        status: "PENDING",
        items: {
          create: [
            { kind: "GENERAL_CONSULTATION", serviceId: "svc-race", name: "GP", unitPriceCents: 0, quantity: 1, lineTotalCents: 0 },
          ],
        },
      },
      include: { items: true },
    });
    const orderItemId = order.items[0]!.id;
    await prisma.$transaction(async (tx) => {
      const result = await cp.reserveAndPriceConsultations(tx, {
        userId: fx.userId,
        countryCode: fx.countryCode,
        items: [{ id: orderItemId, kind: "GENERAL_CONSULTATION", serviceId: "svc-race", unitPriceCents: 5000, benefitSelection: "USE_PLAN_CREDIT" }],
        peakPriceByItemId: new Map([[orderItemId, 5000]]),
      });
      assert.equal(result.lines.get(orderItemId)?.creditCovered, true, "credit reserved");
      await cp.linkReservationsToOrderItems(tx, result.lines, new Map([[orderItemId, orderItemId]]));
    });
    return order.id;
  }

  it("commits the reservation even when the losing race-path calls the function second", async (t) => {
    if (skip()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "race-loser", {
      status: "ACTIVE",
      consultationBalance: 1,
      planSnapshot: creditSnapshot(),
    });
    try {
      const orderId = await reservedOrder(fx);
      assert.equal(await credits.getBalance(fx.subscriptionId, "CONSULTATION"), 0, "reserved");

      const session = { id: `cs_race_${orderId}` };

      // First call wins the race — e.g. sync-order fires first.
      const first = await svc.completeOrderPaymentFromCheckoutSession(
        orderId,
        session,
        { stripeEventId: `sync_${session.id}`, eventType: "checkout.session.sync" },
      );
      assert.equal(first.alreadyPaid, false, "first call performs the real PAID transition");

      // Second call loses the race — e.g. the real webhook arrives after
      // sync-order already marked the order PAID. This is exactly the path
      // that used to skip the credit commit.
      // Real Stripe event ids are globally unique, and ProcessedWebhookEvent
      // dedupes on exactly that — a hardcoded literal here would collide
      // with the same row left behind by a previous run of this test.
      const second = await svc.completeOrderPaymentFromCheckoutSession(
        orderId,
        session,
        { stripeEventId: `evt_webhook_race_${orderId}`, eventType: "checkout.session.completed" },
      );
      assert.equal(second.alreadyPaid, true, "second call sees the order already PAID");

      const consumed = await prisma.consultationCreditLedger.findFirst({
        where: { reason: "CONSUMED", userSubscriptionId: fx.subscriptionId },
      });
      assert.ok(consumed, "reservation was committed to CONSUMED despite losing the race");
      assert.equal(
        await credits.getBalance(fx.subscriptionId, "CONSULTATION"),
        0,
        "credit stays spent (not double-charged, not stuck RESERVED)",
      );
    } finally {
      await fx.cleanup();
    }
  });

  it("commits the reservation when the webhook wins and sync-order calls second", async (t) => {
    if (skip()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "race-winner", {
      status: "ACTIVE",
      consultationBalance: 1,
      planSnapshot: creditSnapshot(),
    });
    try {
      const orderId = await reservedOrder(fx);
      const session = { id: `cs_race2_${orderId}` };

      const first = await svc.completeOrderPaymentFromCheckoutSession(
        orderId,
        session,
        { stripeEventId: `evt_webhook_first_${orderId}`, eventType: "checkout.session.completed" },
      );
      assert.equal(first.alreadyPaid, false);

      const second = await svc.completeOrderPaymentFromCheckoutSession(
        orderId,
        session,
        { stripeEventId: `sync_${session.id}`, eventType: "checkout.session.sync" },
      );
      assert.equal(second.alreadyPaid, true);

      const consumed = await prisma.consultationCreditLedger.findFirst({
        where: { reason: "CONSUMED", userSubscriptionId: fx.subscriptionId },
      });
      assert.ok(consumed, "reservation committed regardless of which path won");
    } finally {
      await fx.cleanup();
    }
  });
});
