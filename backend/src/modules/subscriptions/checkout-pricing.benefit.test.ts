import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { before, describe, it } from "node:test";

loadEnv({ path: join(__dirname, "../../..", ".env") });

/**
 * Per-line benefit choice at checkout (§ appointment-claim, req #2/#8/#9/#12).
 * The critical invariant: a credit is reserved ONLY on an explicit
 * USE_PLAN_CREDIT line that is eligible and funded. PAY_NORMAL and
 * USE_PLAN_DISCOUNT never reserve. Requires Postgres; skips when unreachable.
 */
describe("checkout pricing — per-line benefit selection", () => {
  let prisma: Awaited<typeof import("../../db/prisma.js")>["prisma"];
  let reserveAndPriceConsultations: typeof import("./checkout-pricing.service.js")["reserveAndPriceConsultations"];
  let previewConsultationPricing: typeof import("./checkout-pricing.service.js")["previewConsultationPricing"];
  let getBalance: typeof import("../credits/credit-balance.service.js")["getBalance"];
  let makeSubscriptionFixture: typeof import("./test-support.js")["makeSubscriptionFixture"];
  let bootError: unknown = null;

  before(async () => {
    try {
      prisma = (await import("../../db/prisma.js")).prisma;
      reserveAndPriceConsultations = (await import("./checkout-pricing.service.js"))
        .reserveAndPriceConsultations;
      previewConsultationPricing = (await import("./checkout-pricing.service.js"))
        .previewConsultationPricing;
      getBalance = (await import("../credits/credit-balance.service.js")).getBalance;
      makeSubscriptionFixture = (await import("./test-support.js")).makeSubscriptionFixture;
      await prisma.$queryRawUnsafe("SELECT 1");
    } catch (err) {
      bootError = err;
    }
  });

  const skip = (): boolean => Boolean(bootError);

  /** Snapshot whose GP rule is BOTH an includable credit rule AND has a percent
   *  discount, so the selection alone decides which (if any) benefit applies. */
  function snapshot() {
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
          isIncluded: true,
          usesCredits: true,
          creditsPerUse: 1,
          discountMode: "PERCENT",
          discountPercent: 20,
          fixedPriceCents: null,
          unlockAfterPaidMonths: 0,
          familyUsable: false,
        },
      ],
      perkRules: [],
      healthTestRules: [],
    };
  }

  function item(benefitSelection: "PAY_NORMAL" | "USE_PLAN_CREDIT" | "USE_PLAN_DISCOUNT") {
    return {
      id: "i1",
      kind: "GENERAL_CONSULTATION",
      serviceId: "svc-x",
      unitPriceCents: 5000,
      benefitSelection,
    };
  }

  it("PAY_NORMAL → no credit reserved, no RESERVED ledger row, full price", async (t) => {
    if (skip()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "bn-paynormal", {
      status: "ACTIVE",
      consultationBalance: 3,
      planSnapshot: snapshot(),
    });
    try {
      const result = await prisma.$transaction((tx) =>
        reserveAndPriceConsultations(tx, {
          userId: fx.userId,
          countryCode: fx.countryCode,
          items: [item("PAY_NORMAL")],
          peakPriceByItemId: new Map([["i1", 5000]]),
        }),
      );
      assert.equal(result.lines.get("i1")?.finalUnitPriceCents, 5000);
      assert.equal(result.lines.get("i1")?.creditCovered, false);
      assert.equal(await getBalance(fx.subscriptionId, "CONSULTATION"), 3, "balance unchanged");
      const reserved = await prisma.consultationCreditLedger.findFirst({
        where: { userSubscriptionId: fx.subscriptionId, reason: "RESERVED" },
      });
      assert.equal(reserved, null, "no RESERVED row");
    } finally {
      await fx.cleanup();
    }
  });

  it("USE_PLAN_DISCOUNT → percent discount applied, no credit reserved", async (t) => {
    if (skip()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "bn-discount", {
      status: "ACTIVE",
      consultationBalance: 3,
      planSnapshot: snapshot(),
    });
    try {
      const result = await prisma.$transaction((tx) =>
        reserveAndPriceConsultations(tx, {
          userId: fx.userId,
          countryCode: fx.countryCode,
          items: [item("USE_PLAN_DISCOUNT")],
          peakPriceByItemId: new Map([["i1", 5000]]),
        }),
      );
      assert.equal(result.lines.get("i1")?.finalUnitPriceCents, 4000, "5000 − 20%");
      assert.equal(result.lines.get("i1")?.creditCovered, false);
      assert.equal(await getBalance(fx.subscriptionId, "CONSULTATION"), 3, "credit untouched");
    } finally {
      await fx.cleanup();
    }
  });

  it("USE_PLAN_CREDIT → reserves exactly creditsPerUse", async (t) => {
    if (skip()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "bn-credit", {
      status: "ACTIVE",
      consultationBalance: 3,
      planSnapshot: snapshot(),
    });
    try {
      const result = await prisma.$transaction((tx) =>
        reserveAndPriceConsultations(tx, {
          userId: fx.userId,
          countryCode: fx.countryCode,
          items: [item("USE_PLAN_CREDIT")],
          peakPriceByItemId: new Map([["i1", 5000]]),
        }),
      );
      assert.equal(result.lines.get("i1")?.finalUnitPriceCents, 0);
      assert.equal(result.lines.get("i1")?.creditCovered, true);
      assert.equal(await getBalance(fx.subscriptionId, "CONSULTATION"), 2, "one credit reserved");
    } finally {
      await fx.cleanup();
    }
  });

  it("USE_PLAN_CREDIT with insufficient balance → NORMAL + NOT_ENOUGH_CREDITS, no reserve", async (t) => {
    if (skip()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "bn-nocredit", {
      status: "ACTIVE",
      consultationBalance: 0,
      planSnapshot: snapshot(),
    });
    try {
      const coverage = await previewConsultationPricing({
        userId: fx.userId,
        countryCode: fx.countryCode,
        items: [item("USE_PLAN_CREDIT")],
        peakPriceByItemId: new Map([["i1", 5000]]),
      });
      assert.equal(coverage.lines[0]?.reason, "NOT_ENOUGH_CREDITS");
      assert.equal(coverage.lines[0]?.finalUnitPriceCents, 5000, "never silently discounts (D7)");

      const result = await prisma.$transaction((tx) =>
        reserveAndPriceConsultations(tx, {
          userId: fx.userId,
          countryCode: fx.countryCode,
          items: [item("USE_PLAN_CREDIT")],
          peakPriceByItemId: new Map([["i1", 5000]]),
        }),
      );
      assert.equal(result.lines.get("i1")?.finalUnitPriceCents, 5000);
      assert.equal(result.lines.get("i1")?.creditCovered, false);
      assert.equal(await getBalance(fx.subscriptionId, "CONSULTATION"), 0, "no reserve");
    } finally {
      await fx.cleanup();
    }
  });

  it("preview exposes eligibleSelections for a credit+discount rule", async (t) => {
    if (skip()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "bn-eligible", {
      status: "ACTIVE",
      consultationBalance: 1,
      planSnapshot: snapshot(),
    });
    try {
      const coverage = await previewConsultationPricing({
        userId: fx.userId,
        countryCode: fx.countryCode,
        items: [item("PAY_NORMAL")],
        peakPriceByItemId: new Map([["i1", 5000]]),
      });
      assert.deepEqual(coverage.lines[0]?.eligibleSelections, [
        "PAY_NORMAL",
        "USE_PLAN_CREDIT",
        "USE_PLAN_DISCOUNT",
      ]);
      assert.equal(coverage.lines[0]?.selection, "PAY_NORMAL");
    } finally {
      await fx.cleanup();
    }
  });
});
