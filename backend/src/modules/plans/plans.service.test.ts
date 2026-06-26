import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { before, describe, it } from "node:test";

loadEnv({ path: join(__dirname, "../../..", ".env") });

/**
 * Premium-only family guard on the plan-update path (§ appointment-claim G4).
 * planType is immutable and read from the row, so a forged body cannot enable
 * family usage on a non-PREMIUM plan. Requires Postgres; skips when unreachable.
 */
describe("updateAdminPlan — Premium family guard", () => {
  let prisma: Awaited<typeof import("../../db/prisma.js")>["prisma"];
  let plans: typeof import("./plans.service.js");
  let makeSubscriptionFixture: typeof import("../subscriptions/test-support.js")["makeSubscriptionFixture"];
  let bootError: unknown = null;

  before(async () => {
    try {
      prisma = (await import("../../db/prisma.js")).prisma;
      plans = await import("./plans.service.js");
      makeSubscriptionFixture = (await import("../subscriptions/test-support.js")).makeSubscriptionFixture;
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (err) {
      bootError = err;
    }
  });

  const skip = (): boolean => Boolean(bootError);

  async function makePlan(countryId: string, currencyCode: string, planType: "ESSENTIAL" | "PREMIUM") {
    const tag = randomUUID().slice(0, 6);
    return prisma.pricingPlan.create({
      data: {
        countryId,
        slug: `guard-${tag}`,
        planType,
        name: `Guard ${tag}`,
        monthlyPriceCents: 2000,
        currencyCode,
        familyEnabled: false,
      },
      select: { id: true },
    });
  }

  it("throws PlanFamilyNotPremiumError when enabling family on a non-PREMIUM plan", async (t) => {
    if (skip()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, `pg${randomUUID().slice(0, 4)}`);
    const currency = await prisma.currency.findFirst({ where: { id: fx.currencyId } });
    const plan = await makePlan(fx.countryId, currency!.code, "ESSENTIAL");
    try {
      await assert.rejects(
        () => plans.updateAdminPlan(plan.id, { familyEnabled: true } as never),
        (e: unknown) => e instanceof plans.PlanFamilyNotPremiumError,
      );
      const row = await prisma.pricingPlan.findUnique({ where: { id: plan.id }, select: { familyEnabled: true } });
      assert.equal(row?.familyEnabled, false, "stayed off");
    } finally {
      await prisma.pricingPlan.deleteMany({ where: { id: plan.id } });
      await fx.cleanup();
    }
  });

  it("allows enabling family on a PREMIUM plan", async (t) => {
    if (skip()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, `pg${randomUUID().slice(0, 4)}`);
    const currency = await prisma.currency.findFirst({ where: { id: fx.currencyId } });
    const plan = await makePlan(fx.countryId, currency!.code, "PREMIUM");
    try {
      const updated = await plans.updateAdminPlan(plan.id, { familyEnabled: true } as never);
      assert.equal(updated?.familyEnabled, true);
    } finally {
      await prisma.pricingPlan.deleteMany({ where: { id: plan.id } });
      await fx.cleanup();
    }
  });
});
