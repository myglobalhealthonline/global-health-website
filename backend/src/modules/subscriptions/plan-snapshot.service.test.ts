import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { before, describe, it } from "node:test";

loadEnv({ path: join(__dirname, "../../..", ".env") });

/**
 * plan-snapshot loader — DB error branches (happy path is covered by the grant
 * + subscribe tests). Requires Postgres; skips when unreachable.
 */
describe("plan-snapshot.service", () => {
  let prisma: Awaited<typeof import("../../db/prisma.js")>["prisma"];
  let svc: typeof import("./plan-snapshot.service.js");
  let makeSubscriptionFixture: typeof import("./test-support.js")["makeSubscriptionFixture"];
  let bootError: unknown = null;

  before(async () => {
    try {
      prisma = (await import("../../db/prisma.js")).prisma;
      svc = await import("./plan-snapshot.service.js");
      makeSubscriptionFixture = (await import("./test-support.js")).makeSubscriptionFixture;
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (err) {
      bootError = err;
    }
  });

  const skip = (): boolean => Boolean(bootError);

  it("loadPlanForSnapshot returns null for a missing plan", async (t) => {
    if (skip()) return t.skip();
    assert.equal(await svc.loadPlanForSnapshot("does-not-exist"), null);
  });

  it("captureSnapshot throws for a missing plan", async (t) => {
    if (skip()) return t.skip();
    await assert.rejects(svc.captureSnapshot("does-not-exist", 1), /not found/);
  });

  it("loadPlanForSnapshot maps a real plan's fields", async (t) => {
    if (skip()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "snap-svc", {
      monthlyConsultationCredits: 2,
      wellnessCreditsPerMonth: 1,
    });
    try {
      // Add perk + health-test rules so the loader's row-mapping branches run.
      await prisma.planPerkRule.create({
        data: {
          planId: fx.planId,
          perkKey: "SPECIALIST_DISCOUNT",
          unlockMode: "AFTER_PAID_MONTHS",
          unlockAfterPaidMonths: 2,
        },
      });
      const kit = await prisma.healthTest.create({
        data: {
          countryId: fx.countryId,
          slug: `snap-kit-${fx.planId.slice(-8)}`,
          title: "Blood Test",
          priceCents: 9900,
          currencyCode: "EUR",
          productImagePath: "/i.png",
          galleryImagePaths: [],
          whatThisTestCovers: [],
          whyGetTested: [],
        },
      });
      await prisma.healthTestKitRedemptionRule.create({
        data: { planId: fx.planId, healthTestId: kit.id, requiredWellnessCredits: 6, unlockAfterPaidMonths: 2 },
      });

      const loaded = await svc.loadPlanForSnapshot(fx.planId);
      assert.ok(loaded);
      assert.equal(loaded?.monthlyConsultationCredits, 2);
      assert.equal(loaded?.wellnessCreditsPerMonth, 1);
      assert.equal(loaded?.perkRules[0]?.perkKey, "SPECIALIST_DISCOUNT");
      assert.equal(loaded?.healthTestRules[0]?.healthTestId, kit.id);

      const snap = await svc.captureSnapshot(fx.planId, 3);
      assert.equal(snap.snapshotVersion, 3);
      assert.equal(snap.healthTestRules.length, 1);
      assert.equal(snap.perkRules.length, 1);
    } finally {
      await fx.cleanup();
    }
  });
});
