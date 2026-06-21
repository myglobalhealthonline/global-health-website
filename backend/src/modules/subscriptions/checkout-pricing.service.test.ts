import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { before, describe, it } from "node:test";

loadEnv({ path: join(__dirname, "../../..", ".env") });

/**
 * Pricing-engine integration (§21): resolve + atomic credit reserve against the
 * live counter, inside a transaction. Requires Postgres; skips when unreachable.
 */
describe("checkout pricing engine", () => {
  let prisma: Awaited<typeof import("../../db/prisma.js")>["prisma"];
  let reserveAndPriceConsultations: typeof import("./checkout-pricing.service.js")["reserveAndPriceConsultations"];
  let getBalance: typeof import("../credits/credit-balance.service.js")["getBalance"];
  let makeSubscriptionFixture: typeof import("./test-support.js")["makeSubscriptionFixture"];
  let bootError: unknown = null;

  before(async () => {
    try {
      prisma = (await import("../../db/prisma.js")).prisma;
      reserveAndPriceConsultations = (await import("./checkout-pricing.service.js"))
        .reserveAndPriceConsultations;
      getBalance = (await import("../credits/credit-balance.service.js")).getBalance;
      makeSubscriptionFixture = (await import("./test-support.js")).makeSubscriptionFixture;
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (err) {
      bootError = err;
    }
  });

  const skip = (): boolean => Boolean(bootError);

  function snapshot(rule: Record<string, unknown>) {
    return {
      snapshotVersion: 1,
      monthlyPriceCents: 4900,
      currencyCode: "EUR",
      monthlyConsultationCredits: 3,
      wellnessCreditsPerMonth: 0,
      familyEnabled: false,
      consultationRules: [
        {
          serviceId: "svc-x",
          isIncluded: false,
          usesCredits: false,
          creditsPerUse: 1,
          discountMode: "NONE",
          discountPercent: null,
          fixedPriceCents: null,
          unlockAfterPaidMonths: 0,
          familyUsable: false,
          ...rule,
        },
      ],
      perkRules: [],
      healthTestRules: [],
    };
  }

  it("included consultation with a credit → €0 and reserves it", async (t) => {
    if (skip()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "px-credit", {
      status: "ACTIVE",
      consultationBalance: 1,
      planSnapshot: snapshot({ isIncluded: true, usesCredits: true, creditsPerUse: 1 }),
    });
    try {
      const result = await prisma.$transaction((tx) =>
        reserveAndPriceConsultations(tx, {
          userId: fx.userId,
          countryCode: fx.countryCode,
          items: [{ id: "i1", kind: "GENERAL_CONSULTATION", serviceId: "svc-x", unitPriceCents: 5000 }],
          peakPriceByItemId: new Map([["i1", 5000]]),
        }),
      );
      const line = result.lines.get("i1");
      assert.equal(line?.finalUnitPriceCents, 0);
      assert.equal(line?.creditCovered, true);
      assert.ok(line?.reservationId);
      assert.equal(await getBalance(fx.subscriptionId, "CONSULTATION"), 0, "credit reserved");
    } finally {
      await fx.cleanup();
    }
  });

  it("no credits → percentage discount applies (rounded)", async (t) => {
    if (skip()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "px-pct", {
      status: "ACTIVE",
      consultationBalance: 0,
      planSnapshot: snapshot({ discountMode: "PERCENT", discountPercent: 10 }),
    });
    try {
      const result = await prisma.$transaction((tx) =>
        reserveAndPriceConsultations(tx, {
          userId: fx.userId,
          countryCode: fx.countryCode,
          items: [{ id: "i1", kind: "SPECIALIST_CONSULTATION", serviceId: "svc-x", unitPriceCents: 7999 }],
          peakPriceByItemId: new Map([["i1", 7999]]),
        }),
      );
      const line = result.lines.get("i1");
      assert.equal(line?.creditCovered, false);
      assert.equal(line?.finalUnitPriceCents, 7199, "7999 − round(799.9)=800");
    } finally {
      await fx.cleanup();
    }
  });

  it("no eligible subscription → no plan lines (peak price kept)", async (t) => {
    if (skip()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "px-none", {
      status: "INCOMPLETE",
      consultationBalance: 5,
      planSnapshot: snapshot({ isIncluded: true, usesCredits: true }),
    });
    try {
      const result = await prisma.$transaction((tx) =>
        reserveAndPriceConsultations(tx, {
          userId: fx.userId,
          countryCode: fx.countryCode,
          items: [{ id: "i1", kind: "GENERAL_CONSULTATION", serviceId: "svc-x", unitPriceCents: 5000 }],
          peakPriceByItemId: new Map([["i1", 5000]]),
        }),
      );
      assert.equal(result.subscriptionId, null, "INCOMPLETE is not benefit-eligible");
      assert.equal(result.lines.size, 0);
      assert.equal(await getBalance(fx.subscriptionId, "CONSULTATION"), 5, "no reservation");
    } finally {
      await fx.cleanup();
    }
  });

  it("mixed cart: one credit line (€0) + one uncovered line", async (t) => {
    if (skip()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "px-mixed", {
      status: "ACTIVE",
      consultationBalance: 1,
      planSnapshot: snapshot({ isIncluded: true, usesCredits: true, creditsPerUse: 1 }),
    });
    try {
      const result = await prisma.$transaction((tx) =>
        reserveAndPriceConsultations(tx, {
          userId: fx.userId,
          countryCode: fx.countryCode,
          items: [
            { id: "i1", kind: "GENERAL_CONSULTATION", serviceId: "svc-x", unitPriceCents: 5000 },
            { id: "i2", kind: "GENERAL_CONSULTATION", serviceId: "svc-x", unitPriceCents: 5000 },
          ],
          peakPriceByItemId: new Map([
            ["i1", 5000],
            ["i2", 5000],
          ]),
        }),
      );
      assert.equal(result.lines.get("i1")?.finalUnitPriceCents, 0, "first line uses the credit");
      // Second line: rule has no discount → not in lines (keeps peak price).
      const i2 = result.lines.get("i2");
      assert.ok(!i2 || i2.finalUnitPriceCents === 5000);
      assert.equal(await getBalance(fx.subscriptionId, "CONSULTATION"), 0, "only one credit spent");
    } finally {
      await fx.cleanup();
    }
  });
});
