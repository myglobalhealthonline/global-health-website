import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { before, describe, it } from "node:test";

loadEnv({ path: join(__dirname, "../../..", ".env") });

/**
 * Consultation-rule guards (§36.10/§36.11 + the inactive-service correction):
 * a service linked to a plan must be in the plan's country, not PRESCRIPTION,
 * and ACTIVE. Requires Postgres; skips when unreachable.
 */
describe("setConsultationRule guards", () => {
  let prisma: Awaited<typeof import("../../db/prisma.js")>["prisma"];
  let rules: typeof import("./plan-rules.service.js");
  let makeSubscriptionFixture: typeof import("../subscriptions/test-support.js")["makeSubscriptionFixture"];
  let bootError: unknown = null;

  before(async () => {
    try {
      prisma = (await import("../../db/prisma.js")).prisma;
      rules = await import("./plan-rules.service.js");
      makeSubscriptionFixture = (await import("../subscriptions/test-support.js")).makeSubscriptionFixture;
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (err) {
      bootError = err;
    }
  });

  const skip = (): boolean => Boolean(bootError);

  it("rejects an inactive service, accepts an active one", async (t) => {
    if (skip()) return t.skip();
    // Random tag so the shared fixture's counter-based codes never collide with
    // rows left by a prior run (the counter resets per process).
    const tag = `r${randomUUID().slice(0, 5)}`;
    const fx = await makeSubscriptionFixture(prisma, tag);
    const mk = (slug: string, isActive: boolean) =>
      prisma.service.create({
        data: { countryId: fx.countryId, kind: "GENERAL", slug, name: slug, isActive },
        select: { id: true },
      });
    const inactive = await mk(`inact-${tag}`, false);
    const active = await mk(`act-${tag}`, true);
    try {
      await assert.rejects(
        () => rules.setConsultationRule(fx.planId, { serviceId: inactive.id } as never),
        (e: unknown) => e instanceof rules.RuleServiceInactiveError,
        "inactive service must be rejected",
      );
      const ok = await rules.setConsultationRule(fx.planId, {
        serviceId: active.id,
        isIncluded: true,
        usesCredits: true,
        creditsPerUse: 1,
        discountMode: "NONE",
        unlockAfterPaidMonths: 0,
        familyUsable: false,
        isActive: true,
      } as never);
      assert.equal(ok.serviceId, active.id);
    } finally {
      await prisma.planConsultationRule.deleteMany({ where: { planId: fx.planId } });
      await prisma.service.deleteMany({ where: { id: { in: [inactive.id, active.id] } } });
      await fx.cleanup();
    }
  });
});
