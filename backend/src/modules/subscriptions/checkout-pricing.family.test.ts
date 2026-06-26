import assert from "node:assert/strict";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { before, describe, it } from "node:test";

loadEnv({ path: join(__dirname, "../../..", ".env") });

/**
 * Premium family-usage at checkout (§ appointment-claim, req #3/#4/#5). A
 * consultation booked for an approved dependent draws on the PRIMARY
 * subscriber's credit, but ONLY when: plan is family-enabled (Premium),
 * the service rule is familyUsable, the member is owned, and the member is
 * approved (canUseCredits). Every other combination prices NORMAL and reserves
 * nothing. Requires Postgres; skips when unreachable.
 */
describe("checkout pricing — Premium family usage", () => {
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

  /** Snapshot with one includable credit GP rule. */
  function snapshot(opts: { familyEnabled: boolean; familyUsable: boolean }) {
    return {
      snapshotVersion: 1,
      monthlyPriceCents: 4900,
      currencyCode: "EUR",
      monthlyConsultationCredits: 3,
      wellnessCreditsPerMonth: 0,
      familyEnabled: opts.familyEnabled,
      consultationRules: [
        {
          serviceId: "svc-x",
          isIncluded: true,
          usesCredits: true,
          creditsPerUse: 1,
          discountMode: "NONE",
          discountPercent: null,
          fixedPriceCents: null,
          unlockAfterPaidMonths: 0,
          familyUsable: opts.familyUsable,
        },
      ],
      perkRules: [],
      healthTestRules: [],
    };
  }

  function familyItem(id: string, familyMemberId: string | null) {
    return {
      id,
      kind: "GENERAL_CONSULTATION",
      serviceId: "svc-x",
      unitPriceCents: 5000,
      benefitSelection: "USE_PLAN_CREDIT" as const,
      familyMemberId,
    };
  }

  it("Premium + family-enabled + usable + approved member → credit used once", async (t) => {
    if (skip()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "fam-ok", {
      status: "ACTIVE",
      planType: "PREMIUM",
      familyEnabled: true,
      consultationBalance: 1,
      planSnapshot: snapshot({ familyEnabled: true, familyUsable: true }),
      familyMembers: [{ canUseCredits: true }],
    });
    try {
      const memberId = fx.familyMemberIds[0]!;
      const result = await prisma.$transaction((tx) =>
        reserveAndPriceConsultations(tx, {
          userId: fx.userId,
          countryCode: fx.countryCode,
          items: [familyItem("i1", memberId)],
          peakPriceByItemId: new Map([["i1", 5000]]),
        }),
      );
      assert.equal(result.lines.get("i1")?.finalUnitPriceCents, 0);
      assert.equal(result.lines.get("i1")?.creditCovered, true);
      assert.equal(await getBalance(fx.subscriptionId, "CONSULTATION"), 0, "exactly one credit spent");
    } finally {
      await fx.cleanup();
    }
  });

  it("Premium but plan family disabled → blocked (FAMILY_NOT_ENABLED), no reserve", async (t) => {
    if (skip()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "fam-off", {
      status: "ACTIVE",
      planType: "PREMIUM",
      familyEnabled: false,
      consultationBalance: 1,
      planSnapshot: snapshot({ familyEnabled: false, familyUsable: true }),
      familyMembers: [{ canUseCredits: true }],
    });
    try {
      const memberId = fx.familyMemberIds[0]!;
      const result = await prisma.$transaction((tx) =>
        reserveAndPriceConsultations(tx, {
          userId: fx.userId,
          countryCode: fx.countryCode,
          items: [familyItem("i1", memberId)],
          peakPriceByItemId: new Map([["i1", 5000]]),
        }),
      );
      assert.equal(result.lines.get("i1")?.finalUnitPriceCents, 5000, "pays normal");
      assert.equal(result.lines.get("i1")?.creditCovered, false);
      assert.equal(await getBalance(fx.subscriptionId, "CONSULTATION"), 1, "no reserve");

      const coverage = await previewConsultationPricing({
        userId: fx.userId,
        countryCode: fx.countryCode,
        items: [familyItem("i1", memberId)],
        peakPriceByItemId: new Map([["i1", 5000]]),
      });
      assert.equal(coverage.lines[0]?.reason, "FAMILY_NOT_ENABLED");
    } finally {
      await fx.cleanup();
    }
  });

  it("service rule familyUsable=false → blocked (SERVICE_NOT_FAMILY_USABLE)", async (t) => {
    if (skip()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "fam-svc", {
      status: "ACTIVE",
      planType: "PREMIUM",
      familyEnabled: true,
      consultationBalance: 1,
      planSnapshot: snapshot({ familyEnabled: true, familyUsable: false }),
      familyMembers: [{ canUseCredits: true }],
    });
    try {
      const memberId = fx.familyMemberIds[0]!;
      const coverage = await previewConsultationPricing({
        userId: fx.userId,
        countryCode: fx.countryCode,
        items: [familyItem("i1", memberId)],
        peakPriceByItemId: new Map([["i1", 5000]]),
      });
      assert.equal(coverage.lines[0]?.reason, "SERVICE_NOT_FAMILY_USABLE");
      assert.equal(coverage.lines[0]?.finalUnitPriceCents, 5000);
      assert.equal(await getBalance(fx.subscriptionId, "CONSULTATION"), 1, "preview reserved nothing");
    } finally {
      await fx.cleanup();
    }
  });

  it("member not approved (canUseCredits=false) → blocked (MEMBER_NOT_ALLOWED)", async (t) => {
    if (skip()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "fam-noappr", {
      status: "ACTIVE",
      planType: "PREMIUM",
      familyEnabled: true,
      consultationBalance: 1,
      planSnapshot: snapshot({ familyEnabled: true, familyUsable: true }),
      familyMembers: [{ canUseCredits: false }],
    });
    try {
      const memberId = fx.familyMemberIds[0]!;
      const coverage = await previewConsultationPricing({
        userId: fx.userId,
        countryCode: fx.countryCode,
        items: [familyItem("i1", memberId)],
        peakPriceByItemId: new Map([["i1", 5000]]),
      });
      assert.equal(coverage.lines[0]?.reason, "MEMBER_NOT_ALLOWED");
      const result = await prisma.$transaction((tx) =>
        reserveAndPriceConsultations(tx, {
          userId: fx.userId,
          countryCode: fx.countryCode,
          items: [familyItem("i1", memberId)],
          peakPriceByItemId: new Map([["i1", 5000]]),
        }),
      );
      assert.equal(result.lines.get("i1")?.creditCovered, false);
      assert.equal(await getBalance(fx.subscriptionId, "CONSULTATION"), 1, "no reserve");
    } finally {
      await fx.cleanup();
    }
  });

  it("cross-account familyMemberId (spoof) → NOT_OWNED, prices NORMAL", async (t) => {
    if (skip()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "fam-spoof", {
      status: "ACTIVE",
      planType: "PREMIUM",
      familyEnabled: true,
      consultationBalance: 1,
      planSnapshot: snapshot({ familyEnabled: true, familyUsable: true }),
    });
    // A dependent owned by a DIFFERENT user.
    const foreign = await prisma.familyMember.create({
      data: { primaryUserId: `other-${fx.userId}`, fullName: "Foreign Dep", canUseCredits: true },
    });
    try {
      const result = await prisma.$transaction((tx) =>
        reserveAndPriceConsultations(tx, {
          userId: fx.userId,
          countryCode: fx.countryCode,
          items: [familyItem("i1", foreign.id)],
          peakPriceByItemId: new Map([["i1", 5000]]),
        }),
      );
      assert.equal(result.lines.get("i1")?.finalUnitPriceCents, 5000, "spoofed line pays normal");
      assert.equal(result.lines.get("i1")?.creditCovered, false);
      assert.equal(await getBalance(fx.subscriptionId, "CONSULTATION"), 1, "no reserve");

      const coverage = await previewConsultationPricing({
        userId: fx.userId,
        countryCode: fx.countryCode,
        items: [familyItem("i1", foreign.id)],
        peakPriceByItemId: new Map([["i1", 5000]]),
      });
      assert.equal(coverage.lines[0]?.reason, "NOT_OWNED");
    } finally {
      await prisma.familyMember.delete({ where: { id: foreign.id } }).catch(() => {});
      await fx.cleanup();
    }
  });

  it("self-use still works for a family-enabled plan (no familyMemberId)", async (t) => {
    if (skip()) return t.skip();
    const fx = await makeSubscriptionFixture(prisma, "fam-self", {
      status: "ACTIVE",
      planType: "PREMIUM",
      familyEnabled: true,
      consultationBalance: 1,
      planSnapshot: snapshot({ familyEnabled: true, familyUsable: true }),
    });
    try {
      const result = await prisma.$transaction((tx) =>
        reserveAndPriceConsultations(tx, {
          userId: fx.userId,
          countryCode: fx.countryCode,
          items: [familyItem("i1", null)],
          peakPriceByItemId: new Map([["i1", 5000]]),
        }),
      );
      assert.equal(result.lines.get("i1")?.creditCovered, true, "self-use credit applies");
      assert.equal(await getBalance(fx.subscriptionId, "CONSULTATION"), 0);
    } finally {
      await fx.cleanup();
    }
  });
});
