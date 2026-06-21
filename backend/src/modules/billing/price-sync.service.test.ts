import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { before, describe, it } from "node:test";

loadEnv({ path: join(__dirname, "../../..", ".env") });

/**
 * Stripe Price sync (§22) against the fake BillingPort. First sync creates a
 * Product + Price; an amount edit creates a NEW immutable Price, archives the
 * old one, and records PlanStripePrice history. Requires Postgres; skips when
 * unreachable.
 */
describe("syncPlanStripePrice", () => {
  let prisma: Awaited<typeof import("../../db/prisma.js")>["prisma"];
  let syncPlanStripePrice: typeof import("./price-sync.service.js")["syncPlanStripePrice"];
  let makeSubscriptionFixture: typeof import("../subscriptions/test-support.js")["makeSubscriptionFixture"];
  let bootError: unknown = null;

  before(async () => {
    try {
      prisma = (await import("../../db/prisma.js")).prisma;
      syncPlanStripePrice = (await import("./price-sync.service.js")).syncPlanStripePrice;
      makeSubscriptionFixture = (await import("../subscriptions/test-support.js"))
        .makeSubscriptionFixture;
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (err) {
      bootError = err;
    }
  });

  const skip = (): boolean => Boolean(bootError);

  it("first sync creates Product + Price + active history row", async (t) => {
    if (skip()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "price-first");
    try {
      const { stripeProductId, stripePriceId } = await syncPlanStripePrice(fx.planId);
      assert.ok(stripeProductId);
      assert.ok(stripePriceId);

      const plan = await prisma.pricingPlan.findUniqueOrThrow({ where: { id: fx.planId } });
      assert.equal(plan.stripeProductId, stripeProductId);
      assert.equal(plan.stripePriceId, stripePriceId);

      const history = await prisma.planStripePrice.findMany({ where: { planId: fx.planId } });
      assert.equal(history.length, 1);
      assert.equal(history[0]?.active, true);
      assert.equal(history[0]?.stripePriceId, stripePriceId);
    } finally {
      await fx.cleanup();
    }
  });

  it("price edit creates a NEW price, archives the old, grandfather-safe", async (t) => {
    if (skip()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "price-edit");
    try {
      const first = await syncPlanStripePrice(fx.planId);

      // Idempotent: same amount → same price, no new history row.
      const repeat = await syncPlanStripePrice(fx.planId);
      assert.equal(repeat.stripePriceId, first.stripePriceId, "unchanged amount → same Price");
      assert.equal(
        (await prisma.planStripePrice.count({ where: { planId: fx.planId } })),
        1,
        "no duplicate history row",
      );

      // Amount edit → new immutable Price.
      await prisma.pricingPlan.update({
        where: { id: fx.planId },
        data: { monthlyPriceCents: 5900 },
      });
      const second = await syncPlanStripePrice(fx.planId);
      assert.notEqual(second.stripePriceId, first.stripePriceId, "new Price id");

      const plan = await prisma.pricingPlan.findUniqueOrThrow({ where: { id: fx.planId } });
      assert.equal(plan.stripePriceId, second.stripePriceId);

      const oldRow = await prisma.planStripePrice.findFirstOrThrow({
        where: { stripePriceId: first.stripePriceId },
      });
      const newRow = await prisma.planStripePrice.findFirstOrThrow({
        where: { stripePriceId: second.stripePriceId },
      });
      assert.equal(oldRow.active, false, "old Price archived");
      assert.ok(oldRow.archivedAt);
      assert.equal(newRow.active, true);
      assert.equal(newRow.amountCents, 5900);
    } finally {
      await fx.cleanup();
    }
  });

  it("missing plan → throws (hard-fail propagates to caller)", async (t) => {
    if (skip()) return t.skip();
    await assert.rejects(syncPlanStripePrice("nonexistent-plan-id"), /not found/);
  });
});
