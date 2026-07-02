import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { before, describe, it } from "node:test";

loadEnv({ path: join(__dirname, "../../..", ".env") });

/**
 * Subscribe lifecycle (Phase 1) against the in-memory fake BillingPort
 * (BILLING_DRIVER unset). Verifies feature gate, one-active enforcement (§36.8),
 * cancel-at-period-end (Q5=A), next-cycle change (Q10=B), portal. Requires
 * Postgres; skips when unreachable.
 */
describe("subscription lifecycle", () => {
  let prisma: Awaited<typeof import("../../db/prisma.js")>["prisma"];
  let svc: typeof import("./subscription.service.js");
  let makeSubscriptionFixture: typeof import("./test-support.js")["makeSubscriptionFixture"];
  let bootError: unknown = null;

  before(async () => {
    try {
      prisma = (await import("../../db/prisma.js")).prisma;
      svc = await import("./subscription.service.js");
      makeSubscriptionFixture = (await import("./test-support.js")).makeSubscriptionFixture;
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (err) {
      bootError = err;
    }
  });

  const skip = (): boolean => Boolean(bootError);

  it("subscribe creates an INCOMPLETE sub + returns a checkout URL", async (t) => {
    if (skip()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "sub-new", { enableSubscriptions: true });
    try {
      // Start from no subscription — drop the fixture's auto-created one.
      await prisma.userSubscription.deleteMany({ where: { id: fx.subscriptionId } });

      const { checkoutUrl } = await svc.startSubscription({
        userId: fx.userId,
        email: "new@test.local",
        fullName: "New User",
        planId: fx.planId,
      });
      assert.match(checkoutUrl, /fake-billing\.local/);

      const sub = await prisma.userSubscription.findFirstOrThrow({ where: { userId: fx.userId } });
      assert.equal(sub.status, "INCOMPLETE");
      assert.ok(sub.stripeCustomerId, "customer reused/created");
      assert.ok(sub.stripePriceId, "plan price synced on demand");
    } finally {
      await fx.cleanup();
    }
  });

  it("feature disabled in country → NOT_ELIGIBLE", async (t) => {
    if (skip()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "sub-off", { enableSubscriptions: false });
    try {
      await prisma.userSubscription.deleteMany({ where: { id: fx.subscriptionId } });
      await assert.rejects(
        svc.startSubscription({
          userId: fx.userId,
          email: "x@test.local",
          fullName: "X",
          planId: fx.planId,
        }),
        (err: Error) => (err as { code?: string }).code === "NOT_ELIGIBLE",
      );
    } finally {
      await fx.cleanup();
    }
  });

  it("one active sub per user → ALREADY_SUBSCRIBED", async (t) => {
    if (skip()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "sub-dup", {
      enableSubscriptions: true,
      status: "ACTIVE",
    });
    try {
      await assert.rejects(
        svc.startSubscription({
          userId: fx.userId,
          email: "x@test.local",
          fullName: "X",
          planId: fx.planId,
        }),
        (err: Error) => (err as { code?: string }).code === "ALREADY_SUBSCRIBED",
      );
    } finally {
      await fx.cleanup();
    }
  });

  it("cancel sets cancelAtPeriodEnd (benefits to period end)", async (t) => {
    if (skip()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "sub-cancel", {
      enableSubscriptions: true,
      status: "ACTIVE",
      stripeSubscriptionId: `sub_cancel_${Date.now()}`,
      stripeCustomerId: `cus_cancel_${Date.now()}`,
    });
    try {
      const result = await svc.cancelSubscription(fx.userId);
      assert.ok(result.currentPeriodEnd, "period end returned");
      const sub = await prisma.userSubscription.findUniqueOrThrow({ where: { id: fx.subscriptionId } });
      assert.equal(sub.cancelAtPeriodEnd, true);
      assert.ok(sub.canceledAt);
      assert.equal(sub.status, "ACTIVE", "still ACTIVE until period end");
    } finally {
      await fx.cleanup();
    }
  });

  it("change schedules a next-cycle switch (pending fields set, no proration)", async (t) => {
    if (skip()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "sub-change", {
      enableSubscriptions: true,
      status: "ACTIVE",
      stripeSubscriptionId: `sub_change_${Date.now()}`,
    });
    try {
      const tag = fx.subscriptionId.slice(-8);
      const newPlan = await prisma.pricingPlan.create({
        data: {
          countryId: fx.countryId,
          slug: `target-${tag}`,
          name: "Target Plan",
          // Different tier from the fixture's COMPREHENSIVE — the partial
          // unique [countryId, planType] WHERE isActive (B9) allows only one
          // active plan per tier per country.
          planType: "PREMIUM",
          monthlyPriceCents: 3900,
          currencyCode: "EUR",
          monthlyConsultationCredits: 2,
        },
      });
      const result = await svc.changePlan(fx.userId, newPlan.id);
      const sub = await prisma.userSubscription.findUniqueOrThrow({ where: { id: fx.subscriptionId } });
      assert.equal(sub.pendingPlanId, newPlan.id);
      assert.ok(sub.pendingStripePriceId, "target price synced");
      assert.deepEqual(sub.pendingChangeEffectiveAt, sub.currentPeriodEnd);
      assert.deepEqual(result.pendingChangeEffectiveAt, sub.currentPeriodEnd);
    } finally {
      await fx.cleanup();
    }
  });

  it("portal returns a URL when a customer exists", async (t) => {
    if (skip()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "sub-portal", {
      enableSubscriptions: true,
      status: "ACTIVE",
      stripeCustomerId: `cus_portal_${Date.now()}`,
    });
    try {
      const { portalUrl } = await svc.getBillingPortalUrl(fx.userId);
      assert.match(portalUrl, /fake-billing\.local\/portal/);
    } finally {
      await fx.cleanup();
    }
  });
});
