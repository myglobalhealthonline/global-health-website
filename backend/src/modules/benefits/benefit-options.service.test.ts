import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { PrismaClient } from "@prisma/client";
import { sortAndRecommend, type BenefitOption } from "./benefit-options.service.js";

/**
 * §6.3 / §16.1 — the cross-source options list.
 *
 * The ordering half is pure and always runs. The end-to-end half needs
 * Postgres (a plan, a level, a benefit row, a service and an enrollment all
 * have to exist for the resolver to have anything to price), so it skips when
 * the database is unreachable, like the other DB-backed suites.
 */

function option(over: Partial<BenefitOption> = {}): BenefitOption {
  return {
    source: "MEMBERSHIP",
    refId: "r1",
    label: "A",
    unitPriceCents: 5000,
    discountCents: 1000,
    note: null,
    indicative: false,
    recommended: false,
    ...over,
  };
}

describe("benefit options — ordering", () => {
  it("sorts ascending by price and recommends the cheapest", () => {
    const sorted = sortAndRecommend(
      [
        option({ source: "INSURANCE", refId: "ins", unitPriceCents: 4500 }),
        option({ source: "MEMBERSHIP", refId: "mem", unitPriceCents: 0 }),
        option({ source: "CORPORATE", refId: "corp", unitPriceCents: 5400 }),
      ],
      6000,
    );
    assert.deepEqual(
      sorted.map((o) => o.refId),
      ["mem", "ins", "corp"],
    );
    assert.deepEqual(
      sorted.map((o) => o.recommended),
      [true, false, false],
    );
  });

  it("breaks ties by source order, not by input order", () => {
    // Same price from every source: the list must not reshuffle between the
    // booking step and a refresh just because Prisma returned rows differently.
    const build = (order: BenefitOption[]) => sortAndRecommend(order, 6000).map((o) => o.source);
    const insurance = option({ source: "INSURANCE", refId: "i", unitPriceCents: 5000 });
    const membership = option({ source: "MEMBERSHIP", refId: "m", unitPriceCents: 5000 });
    const corporate = option({ source: "CORPORATE", refId: "c", unitPriceCents: 5000 });
    const plan = option({ source: "PUBLIC_PLAN", refId: "p", unitPriceCents: 5000 });

    const expected = ["MEMBERSHIP", "CORPORATE", "PUBLIC_PLAN", "INSURANCE"];
    assert.deepEqual(build([insurance, plan, corporate, membership]), expected);
    assert.deepEqual(build([membership, corporate, plan, insurance]), expected);
  });

  it("breaks same-source ties by label", () => {
    const sorted = sortAndRecommend(
      [
        option({ refId: "b", label: "Zeta", unitPriceCents: 5000 }),
        option({ refId: "a", label: "Alpha", unitPriceCents: 5000 }),
      ],
      6000,
    );
    assert.deepEqual(
      sorted.map((o) => o.refId),
      ["a", "b"],
    );
  });

  it("recommends nothing when nothing beats the full price", () => {
    // Pre-selecting an option that saves the patient nothing would be worse
    // than showing no recommendation at all.
    const sorted = sortAndRecommend([option({ unitPriceCents: 6000, discountCents: 0 })], 6000);
    assert.equal(sorted[0]?.recommended, false);
  });

  it("returns an empty list unchanged", () => {
    assert.deepEqual(sortAndRecommend([], 6000), []);
  });
});

describe("benefit options — end to end", () => {
  let prisma: PrismaClient | null = null;
  let svc: typeof import("./benefit-options.service.js");

  const uniq = `bo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let currencyId = "";
  let countryId = "";
  let planId = "";
  let serviceId = "";
  let userId = "";

  before(async () => {
    try {
      prisma = (await import("../../db/prisma.js")).prisma;
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      prisma = null;
      return;
    }
    svc = await import("./benefit-options.service.js");

    const currency = await prisma.currency.create({
      data: { code: `B${uniq}`.slice(0, 9), symbol: "€", decimals: 2 },
    });
    currencyId = currency.id;
    const country = await prisma.country.create({
      data: {
        code: `b${uniq}`.slice(0, 8).toLowerCase(),
        name: `Benefit Test ${uniq}`,
        slug: `benefit-test-${uniq}`.toLowerCase(),
        legacyHomePath: `/bhg-${uniq}`,
        teamPath: `/btm-${uniq}`,
        generalConsultationPath: `/bgn-${uniq}`,
        specialistConsultationPath: `/bsp-${uniq}`,
        currencyId: currency.id,
      },
    });
    countryId = country.id;
    const service = await prisma.service.create({
      data: {
        countryId,
        kind: "GENERAL",
        name: "Benefit Test GP",
        slug: `benefit-gp-${uniq}`.toLowerCase(),
        basePriceCents: 6000,
        currencyCode: currency.code,
      },
    });
    serviceId = service.id;
    const user = await prisma.user.create({
      data: {
        email: `benefit-${uniq}@test.local`,
        passwordHash: "x",
        fullName: "Benefit Member",
        role: "PATIENT",
        emailVerifiedAt: new Date(),
      },
    });
    userId = user.id;

    const plan = await prisma.membershipPlan.create({
      data: { countryId, slug: `benefit-plan-${uniq}`, name: "Benefit Plan" },
    });
    planId = plan.id;
    const level = await prisma.membershipLevel.create({
      data: { planId, countryId, slug: "gold", name: "Gold", isDefault: true },
    });
    await prisma.membershipBenefit.create({
      data: {
        levelId: level.id,
        countryId,
        serviceKind: "GENERAL",
        benefitType: "ALLOWANCE",
        allowanceCount: 2,
        fallbackType: "PERCENT",
        fallbackPercent: 20,
      },
    });
    await prisma.membershipEnrollment.create({
      data: {
        planId,
        levelId: level.id,
        countryId,
        membershipId: `BO-${uniq}`.toUpperCase(),
        email: user.email,
        firstName: "Benefit",
        lastName: "Member",
        userId: user.id,
        linkedAt: new Date(),
        status: "ACTIVE",
        startDate: new Date("2026-01-01"),
      },
    });
  });

  after(async () => {
    if (!prisma || !countryId) return;
    await prisma.membershipEnrollment.deleteMany({ where: { planId } });
    await prisma.membershipPlan.deleteMany({ where: { countryId } });
    await prisma.service.deleteMany({ where: { countryId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.country.deleteMany({ where: { id: countryId } });
    await prisma.currency.deleteMany({ where: { id: currencyId } });
  });

  it("prices the member's allowance at zero and labels what it costs them", async (t) => {
    if (!prisma) return t.skip();
    const result = await svc.listBenefitOptions({ userId, serviceId });
    assert.ok(result);
    assert.equal(result.fullPriceCents, 6000);
    // No slot was supplied, so the price is the base one (§11.2).
    assert.equal(result.slotPriced, false);

    const membership = result.options.find((o) => o.source === "MEMBERSHIP");
    assert.ok(membership, "the active enrollment should produce an option");
    assert.equal(membership.unitPriceCents, 0);
    assert.equal(membership.recommended, true);
    assert.deepEqual(membership.note, { key: "ALLOWANCE_UNIT", remaining: 2 });
    // A €0 allowance line is a flat outcome — no slot can change it.
    assert.equal(membership.indicative, false);
  });

  it("falls to the row's fallback discount once the allowance is spent", async (t) => {
    if (!prisma) return t.skip();
    const enrollment = await prisma.membershipEnrollment.findFirst({ where: { planId } });
    const benefit = await prisma.membershipBenefit.findFirst({ where: { countryId } });
    assert.ok(enrollment && benefit);
    await prisma.membershipAllowanceBalance.create({
      data: {
        benefitId: benefit.id,
        holderEnrollmentId: enrollment.id,
        allocated: 2,
        used: 2,
        termStart: enrollment.startDate,
      },
    });

    const result = await svc.listBenefitOptions({ userId, serviceId });
    const membership = result?.options.find((o) => o.source === "MEMBERSHIP");
    assert.ok(membership);
    assert.equal(membership.unitPriceCents, 4800);
    assert.deepEqual(membership.note, { key: "ALLOWANCE_EXHAUSTED" });
    // Percent off an un-slotted base price moves once a real slot is chosen.
    assert.equal(membership.indicative, true);
  });

  it("gives a member nothing on another country's service (assumption 2)", async (t) => {
    if (!prisma) return t.skip();
    const other = await prisma.country.create({
      data: {
        code: `x${uniq}`.slice(0, 8).toLowerCase(),
        name: `Other ${uniq}`,
        slug: `other-${uniq}`.toLowerCase(),
        legacyHomePath: `/xhg-${uniq}`,
        teamPath: `/xtm-${uniq}`,
        generalConsultationPath: `/xgn-${uniq}`,
        specialistConsultationPath: `/xsp-${uniq}`,
        currencyId,
      },
    });
    const otherService = await prisma.service.create({
      data: {
        countryId: other.id,
        kind: "GENERAL",
        name: "Other GP",
        slug: `other-gp-${uniq}`.toLowerCase(),
        basePriceCents: 6000,
        currencyCode: `B${uniq}`.slice(0, 9),
      },
    });

    const result = await svc.listBenefitOptions({ userId, serviceId: otherService.id });
    assert.equal(result?.options.some((o) => o.source === "MEMBERSHIP"), false);

    await prisma.service.deleteMany({ where: { countryId: other.id } });
    await prisma.country.deleteMany({ where: { id: other.id } });
  });

  it("returns null for an unknown service rather than an empty option list", async (t) => {
    if (!prisma) return t.skip();
    assert.equal(await svc.listBenefitOptions({ userId, serviceId: "nope" }), null);
  });
});
