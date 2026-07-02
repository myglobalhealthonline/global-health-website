import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { before, describe, it } from "node:test";

loadEnv({ path: join(__dirname, "../../..", ".env") });

/**
 * Period-keyed grant engine (§36.2/§36.9). Complements the webhook test with
 * renewal-cycle behaviour: reset-prior-unused, additive wellness, re-snapshot,
 * €0/stale exclusion. Requires Postgres; skips when unreachable.
 */
describe("processInvoicePaid grant engine", () => {
  let prisma: Awaited<typeof import("../../db/prisma.js")>["prisma"];
  let processInvoicePaid: typeof import("./subscription-grant.service.js")["processInvoicePaid"];
  let getBalance: typeof import("../credits/credit-balance.service.js")["getBalance"];
  let makeSubscriptionFixture: typeof import("./test-support.js")["makeSubscriptionFixture"];
  let bootError: unknown = null;

  before(async () => {
    try {
      prisma = (await import("../../db/prisma.js")).prisma;
      processInvoicePaid = (await import("./subscription-grant.service.js")).processInvoicePaid;
      getBalance = (await import("../credits/credit-balance.service.js")).getBalance;
      makeSubscriptionFixture = (await import("./test-support.js")).makeSubscriptionFixture;
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (err) {
      bootError = err;
    }
  });

  const skip = (): boolean => Boolean(bootError);
  const P1 = { start: new Date("2026-06-01T00:00:00Z"), end: new Date("2026-07-01T00:00:00Z") };
  const P2 = { start: new Date("2026-07-01T00:00:00Z"), end: new Date("2026-08-01T00:00:00Z") };

  it("create grants month-1 + ACTIVE; cycle re-snapshots, resets (no rollover) + adds wellness", async (t) => {
    if (skip()) return t.skip();
    const subStripeId = `sub_grant_${Date.now()}_a`;
    const fx = await makeSubscriptionFixture(prisma, "grant-cycle", {
      status: "INCOMPLETE",
      paidMonthsCount: 0,
      monthlyConsultationCredits: 3,
      wellnessCreditsPerMonth: 1,
      stripeSubscriptionId: subStripeId,
    });
    try {
      // First invoice (subscription_create) → month-1.
      const create = await processInvoicePaid({
        stripeSubscriptionId: subStripeId,
        periodStart: P1.start,
        periodEnd: P1.end,
        billingReason: "subscription_create",
        amountPaid: 2000,
      });
      assert.equal(create.granted, true);
      assert.equal(create.consultationCreditsGranted, 3);
      let sub = await prisma.userSubscription.findUniqueOrThrow({ where: { id: fx.subscriptionId } });
      assert.equal(sub.status, "ACTIVE");
      assert.equal(sub.paidMonthsCount, 1);
      assert.equal(await getBalance(fx.subscriptionId, "CONSULTATION"), 3);
      assert.equal(await getBalance(fx.subscriptionId, "WELLNESS"), 1);
      const v0 = sub.snapshotVersion;

      // Admin edits the plan before the renewal — cycle must re-snapshot.
      await prisma.pricingPlan.update({
        where: { id: fx.planId },
        data: { monthlyConsultationCredits: 5 },
      });

      // Renewal (subscription_cycle) → reset prior 3 → grant 5; wellness 1→2.
      const cycle = await processInvoicePaid({
        stripeSubscriptionId: subStripeId,
        periodStart: P2.start,
        periodEnd: P2.end,
        billingReason: "subscription_cycle",
        amountPaid: 2000,
      });
      assert.equal(cycle.granted, true);
      assert.equal(cycle.consultationCreditsGranted, 5, "re-snapshot picked up the edit");
      sub = await prisma.userSubscription.findUniqueOrThrow({ where: { id: fx.subscriptionId } });
      assert.equal(sub.paidMonthsCount, 2);
      assert.ok(sub.snapshotVersion > v0, "snapshotVersion bumped");
      assert.equal(await getBalance(fx.subscriptionId, "CONSULTATION"), 5, "reset, no rollover (not 3+5)");
      assert.equal(await getBalance(fx.subscriptionId, "WELLNESS"), 2, "wellness additive");
    } finally {
      await fx.cleanup();
    }
  });

  it("D25: month-1 withholds consultation credits (0), wellness still earns; month-2 grants full", async (t) => {
    if (skip()) return t.skip();
    const subStripeId = `sub_grant_${Date.now()}_unlock`;
    const fx = await makeSubscriptionFixture(prisma, "grant-unlock", {
      status: "INCOMPLETE",
      paidMonthsCount: 0,
      monthlyConsultationCredits: 3,
      wellnessCreditsPerMonth: 1,
      benefitsUnlockAfterPaidMonths: 2,
      stripeSubscriptionId: subStripeId,
    });
    try {
      // Month 1 (create): benefits locked → 0 consultation credits, but ACTIVE
      // and wellness earns from the first payment.
      const create = await processInvoicePaid({
        stripeSubscriptionId: subStripeId,
        periodStart: P1.start,
        periodEnd: P1.end,
        billingReason: "subscription_create",
        amountPaid: 2000,
      });
      assert.equal(create.granted, true);
      assert.equal(create.consultationCreditsGranted, 0, "month-1 consultation credits withheld");
      let sub = await prisma.userSubscription.findUniqueOrThrow({ where: { id: fx.subscriptionId } });
      assert.equal(sub.status, "ACTIVE");
      assert.equal(sub.paidMonthsCount, 1);
      assert.equal(await getBalance(fx.subscriptionId, "CONSULTATION"), 0, "no month-1 credits");
      assert.equal(await getBalance(fx.subscriptionId, "WELLNESS"), 1, "wellness earns from payment 1");

      // Month 2 (cycle): benefits unlock → full consultation credits granted.
      const cycle = await processInvoicePaid({
        stripeSubscriptionId: subStripeId,
        periodStart: P2.start,
        periodEnd: P2.end,
        billingReason: "subscription_cycle",
        amountPaid: 2000,
      });
      assert.equal(cycle.granted, true);
      assert.equal(cycle.consultationCreditsGranted, 3, "month-2 grants full credits");
      sub = await prisma.userSubscription.findUniqueOrThrow({ where: { id: fx.subscriptionId } });
      assert.equal(sub.paidMonthsCount, 2);
      assert.equal(await getBalance(fx.subscriptionId, "CONSULTATION"), 3);
      assert.equal(await getBalance(fx.subscriptionId, "WELLNESS"), 2, "wellness additive");
    } finally {
      await fx.cleanup();
    }
  });

  it("€0 invoice (trial/coupon) → no grant, no paidMonths advance", async (t) => {
    if (skip()) return t.skip();
    const subStripeId = `sub_grant_${Date.now()}_b`;
    const fx = await makeSubscriptionFixture(prisma, "grant-zero", {
      status: "INCOMPLETE",
      paidMonthsCount: 0,
      stripeSubscriptionId: subStripeId,
    });
    try {
      const r = await processInvoicePaid({
        stripeSubscriptionId: subStripeId,
        periodStart: P1.start,
        periodEnd: P1.end,
        billingReason: "subscription_create",
        amountPaid: 0,
      });
      assert.equal(r.granted, false);
      const sub = await prisma.userSubscription.findUniqueOrThrow({ where: { id: fx.subscriptionId } });
      assert.equal(sub.paidMonthsCount, 0);
      assert.equal(sub.status, "INCOMPLETE", "not promoted on a €0 invoice");
    } finally {
      await fx.cleanup();
    }
  });

  it("stale period (older than current) → ignored, no grant", async (t) => {
    if (skip()) return t.skip();
    const subStripeId = `sub_grant_${Date.now()}_c`;
    const fx = await makeSubscriptionFixture(prisma, "grant-stale", {
      status: "INCOMPLETE",
      paidMonthsCount: 0,
      monthlyConsultationCredits: 3,
      stripeSubscriptionId: subStripeId,
    });
    try {
      // Establish P2 as the current period.
      await processInvoicePaid({
        stripeSubscriptionId: subStripeId,
        periodStart: P2.start,
        periodEnd: P2.end,
        billingReason: "subscription_create",
        amountPaid: 2000,
      });
      const balanceAfter = await getBalance(fx.subscriptionId, "CONSULTATION");

      // A late/duplicated earlier-period invoice must not grant again.
      const stale = await processInvoicePaid({
        stripeSubscriptionId: subStripeId,
        periodStart: P1.start,
        periodEnd: P1.end,
        billingReason: "subscription_cycle",
        amountPaid: 2000,
      });
      assert.equal(stale.granted, false, "stale period ignored");
      const sub = await prisma.userSubscription.findUniqueOrThrow({ where: { id: fx.subscriptionId } });
      assert.equal(sub.paidMonthsCount, 1, "paidMonthsCount not advanced by stale invoice");
      assert.equal(await getBalance(fx.subscriptionId, "CONSULTATION"), balanceAfter);
    } finally {
      await fx.cleanup();
    }
  });
});
