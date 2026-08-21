import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { PrismaClient } from "@prisma/client";
import { uniqueCurrencyCode } from "../../test-utils/unique-currency-code.js";

/**
 * Self-declared coverage — the booking form's cover picker.
 *
 * This is money logic on unverified input, so the cases that matter are the
 * refusals as much as the prices: a card that belongs to nobody, a plan that
 * does not cover the service, and — separately — which declarations the system
 * may settle without a human. Note the deliberate asymmetry those last cases
 * pin down: pricing accepts a partner reference, settling does not. Needs
 * Postgres (a plan, a level, a benefit row, a service and an enrollment must
 * exist to price anything), so it skips when the database is unreachable, like
 * the other DB-backed suites.
 */
describe("declared coverage", () => {
  let prisma: PrismaClient | null = null;
  let svc: typeof import("./declared-coverage.service.js");

  const uniq = `dc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const currencyCode = uniqueCurrencyCode();
  let currencyId = "";
  let countryId = "";
  let countryCode = "";
  let serviceId = "";
  let membershipPlanId = "";
  let pricingPlanId = "";
  const CARD = `DC-${uniq}`.toUpperCase();
  const FULL_PRICE = 6000;

  before(async () => {
    try {
      prisma = (await import("../../db/prisma.js")).prisma;
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      prisma = null;
      return;
    }
    svc = await import("./declared-coverage.service.js");

    const currency = await prisma.currency.create({
      data: { code: currencyCode, symbol: "€", decimals: 2 },
    });
    currencyId = currency.id;
    countryCode = `d${uniq}`.slice(0, 8).toLowerCase();
    const country = await prisma.country.create({
      data: {
        code: countryCode,
        name: `Declared Test ${uniq}`,
        slug: `declared-test-${uniq}`.toLowerCase(),
        legacyHomePath: `/dhg-${uniq}`,
        teamPath: `/dtm-${uniq}`,
        generalConsultationPath: `/dgn-${uniq}`,
        specialistConsultationPath: `/dsp-${uniq}`,
        currencyId: currency.id,
      },
    });
    countryId = country.id;

    const service = await prisma.service.create({
      data: {
        countryId,
        kind: "GENERAL",
        name: "Declared Test GP",
        slug: `declared-gp-${uniq}`.toLowerCase(),
        basePriceCents: FULL_PRICE,
        currencyCode: currency.code,
      },
    });
    serviceId = service.id;

    const membershipPlan = await prisma.membershipPlan.create({
      data: {
        primaryCountryId: countryId,
        countries: { create: { countryId } },
        slug: `declared-plan-${uniq}`,
        name: "Declared Plan",
      },
    });
    membershipPlanId = membershipPlan.id;
    const level = await prisma.membershipLevel.create({
      data: { planId: membershipPlanId, slug: "silver", name: "Silver", isDefault: true },
    });
    await prisma.membershipBenefit.create({
      data: {
        levelId: level.id,
        planId: membershipPlanId,
        countryId,
        serviceKind: "GENERAL",
        benefitType: "PERCENT",
        percentOff: 25,
        fallbackType: "NONE",
      },
    });
    // PENDING on purpose: an imported member who has not clicked the claim
    // link is exactly who types a card number into the booking form.
    await prisma.membershipEnrollment.create({
      data: {
        planId: membershipPlanId,
        levelId: level.id,
        countryId,
        membershipId: CARD,
        email: `declared-${uniq}@test.local`,
        firstName: "Declared",
        lastName: "Member",
        status: "PENDING",
        startDate: new Date("2026-01-01"),
      },
    });

    const pricingPlan = await prisma.pricingPlan.create({
      data: {
        countryId,
        slug: `declared-pricing-${uniq}`,
        name: "Declared Health Plan",
        monthlyPriceCents: 1000,
        currencyCode: currency.code,
      },
    });
    pricingPlanId = pricingPlan.id;
    await prisma.planConsultationRule.create({
      data: {
        planId: pricingPlanId,
        countryId,
        serviceId,
        discountMode: "PERCENT",
        discountPercent: 50,
      },
    });
  });

  after(async () => {
    if (!prisma || !countryId) return;
    await prisma.membershipEnrollment.deleteMany({ where: { planId: membershipPlanId } });
    await prisma.membershipPlan.deleteMany({ where: { primaryCountryId: countryId } });
    await prisma.planConsultationRule.deleteMany({ where: { planId: pricingPlanId } });
    await prisma.pricingPlan.deleteMany({ where: { countryId } });
    await prisma.service.deleteMany({ where: { countryId } });
    await prisma.country.deleteMany({ where: { id: countryId } });
    await prisma.currency.deleteMany({ where: { id: currencyId } });
  });

  function input(over: Record<string, unknown> = {}) {
    return {
      source: "MEMBERSHIP" as const,
      refId: membershipPlanId,
      cardNumber: CARD,
      service: { id: serviceId, countryId, kind: "GENERAL" as const, currencyCode },
      fullPriceCents: FULL_PRICE,
      ...over,
    };
  }

  it("prices an unclaimed membership card off the plan's own benefit row", async (t) => {
    if (!prisma) return t.skip();
    const res = await svc.resolveDeclaredCoverage(input());
    assert.equal(res.ok, true);
    assert.equal(res.ok && res.unitPriceCents, 4500); // 25% off 6000
    assert.equal(res.ok && res.label, "Declared Plan");
  });

  it("matches the card case-insensitively", async (t) => {
    if (!prisma) return t.skip();
    const res = await svc.resolveDeclaredCoverage(input({ cardNumber: CARD.toLowerCase() }));
    assert.equal(res.ok, true);
  });

  it("refuses a card nobody holds instead of falling back to full price", async (t) => {
    if (!prisma) return t.skip();
    const res = await svc.resolveDeclaredCoverage(input({ cardNumber: "NOT-A-REAL-CARD" }));
    assert.equal(res.ok, false);
    assert.equal(!res.ok && res.reason, "CARD_NOT_RECOGNISED");
  });

  it("refuses a provider that is not in the catalogue", async (t) => {
    if (!prisma) return t.skip();
    const res = await svc.resolveDeclaredCoverage(input({ refId: "no-such-plan" }));
    assert.equal(res.ok, false);
    assert.equal(!res.ok && res.reason, "UNKNOWN_PROVIDER");
  });

  it("prices a health plan from its consultation rule, no card lookup", async (t) => {
    if (!prisma) return t.skip();
    const res = await svc.resolveDeclaredCoverage(
      input({ source: "PUBLIC_PLAN", refId: pricingPlanId, cardNumber: "anything" }),
    );
    assert.equal(res.ok, true);
    assert.equal(res.ok && res.unitPriceCents, 3000); // 50% off 6000
  });

  it("settles a membership card only for the enrolled address", async (t) => {
    if (!prisma) return t.skip();
    // THE attack this gate exists for: a stranger who has seen the card. The
    // number resolves — it is real — but knowing it must not be enough, or
    // anyone who photographed a card books at that member's price.
    assert.equal(
      await svc.declaredCoverageIsSystemVerified({
        userId: null,
        bookingEmail: "stranger@example.com",
        source: "MEMBERSHIP",
        refId: membershipPlanId,
        cardNumber: CARD,
      }),
      false,
    );
    // The member's own address settles, case- and whitespace-insensitively.
    assert.equal(
      await svc.declaredCoverageIsSystemVerified({
        userId: null,
        bookingEmail: `  DECLARED-${uniq}@TEST.LOCAL  `,
        source: "MEMBERSHIP",
        refId: membershipPlanId,
        cardNumber: CARD,
      }),
      true,
    );
    // Right address, card that belongs to nobody.
    assert.equal(
      await svc.declaredCoverageIsSystemVerified({
        userId: null,
        bookingEmail: `declared-${uniq}@test.local`,
        source: "MEMBERSHIP",
        refId: membershipPlanId,
        cardNumber: "NOT-A-REAL-CARD",
      }),
      false,
    );
  });

  it("settles for the linked account even from another address", async (t) => {
    if (!prisma) return t.skip();
    const user = await prisma.user.create({
      data: {
        email: `declared-linked-${uniq}@test.local`,
        fullName: "Linked Member",
        role: "PATIENT",
        passwordHash: "not-a-real-hash",
      },
      select: { id: true },
    });
    await prisma.membershipEnrollment.updateMany({
      where: { planId: membershipPlanId, membershipId: CARD },
      data: { userId: user.id, status: "ACTIVE", linkedAt: new Date() },
    });

    // The claim flow already proved this account owns the membership, so a
    // different contact address on one booking is not suspicious.
    assert.equal(
      await svc.declaredCoverageIsSystemVerified({
        userId: user.id,
        bookingEmail: "someone-else@example.com",
        source: "MEMBERSHIP",
        refId: membershipPlanId,
        cardNumber: CARD,
      }),
      true,
    );
    // A different session with the same card still gets a human.
    assert.equal(
      await svc.declaredCoverageIsSystemVerified({
        userId: "a-different-user",
        bookingEmail: "someone-else@example.com",
        source: "MEMBERSHIP",
        refId: membershipPlanId,
        cardNumber: CARD,
      }),
      false,
    );

    await prisma.membershipEnrollment.updateMany({
      where: { planId: membershipPlanId, membershipId: CARD },
      data: { userId: null, status: "PENDING", linkedAt: null },
    });
    await prisma.user.delete({ where: { id: user.id } });
  });

  it("never prices an allowance unit from a declared card", async (t) => {
    if (!prisma) return t.skip();
    // Included visits are a counted entitlement, and only the account-linked
    // checkout decrements the counter. Pricing one at zero here would be an
    // unlimited free consultation nothing records. The level's own rule applies
    // instead — the same branch a member who declines their unit takes.
    const level = await prisma.membershipLevel.findFirst({
      where: { planId: membershipPlanId },
      select: { id: true },
    });
    const allowance = await prisma.membershipBenefit.create({
      data: {
        levelId: level!.id,
        planId: membershipPlanId,
        countryId,
        serviceId,
        benefitType: "ALLOWANCE",
        allowanceCount: 3,
        fallbackType: "PERCENT",
        fallbackPercent: 10,
      },
    });

    const res = await svc.resolveDeclaredCoverage(input());
    assert.equal(res.ok, true);
    // 10% fallback, NOT the free included visit.
    assert.equal(res.ok && res.unitPriceCents, 5400);

    await prisma.membershipBenefit.delete({ where: { id: allowance.id } });
  });

  it("refuses to settle on a partner reference, which is guessable", async (t) => {
    if (!prisma) return t.skip();
    const PARTNER_REF = "100042";
    await prisma.membershipEnrollment.updateMany({
      where: { planId: membershipPlanId, membershipId: CARD },
      data: { partnerReference: PARTNER_REF },
    });

    // Pricing accepts it — a member handed that number is a real member, and a
    // human still sees the booking.
    const priced = await svc.resolveDeclaredCoverage(input({ cardNumber: PARTNER_REF }));
    assert.equal(priced.ok, true);

    // Skipping the human on it would not: partner numbers are often sequential,
    // so anyone counting upwards would buy member pricing.
    assert.equal(
      await svc.declaredCoverageIsSystemVerified({
        userId: null,
        // Even with the enrolled address: the reference is not a credential, so
        // it cannot be the thing that settles.
        bookingEmail: `declared-${uniq}@test.local`,
        source: "MEMBERSHIP",
        refId: membershipPlanId,
        cardNumber: PARTNER_REF,
      }),
      false,
    );

    await prisma.membershipEnrollment.updateMany({
      where: { planId: membershipPlanId, membershipId: CARD },
      data: { partnerReference: null },
    });
  });

  it("never settles insurance, and never settles a plan without a subscription", async (t) => {
    if (!prisma) return t.skip();
    // No copy of the policy exists here to check against — this is the case
    // the manual queue was built for.
    assert.equal(
      await svc.declaredCoverageIsSystemVerified({
        userId: "someone",
        bookingEmail: "someone@example.com",
        source: "INSURANCE",
        refId: membershipPlanId,
        cardNumber: CARD,
      }),
      false,
    );
    // A plan card number is not a key for anything; the entitlement belongs to
    // an account, and this session holds no subscription for the plan.
    assert.equal(
      await svc.declaredCoverageIsSystemVerified({
        userId: "someone-without-the-plan",
        bookingEmail: "someone@example.com",
        source: "PUBLIC_PLAN",
        refId: pricingPlanId,
        cardNumber: "anything",
      }),
      false,
    );
  });

  it("lists the configured providers for the market", async (t) => {
    if (!prisma) return t.skip();
    const catalog = await svc.listCoverageCatalog({ countryCode, serviceId });
    assert.ok(catalog);
    assert.deepEqual(
      catalog!.membership.map((p) => p.id),
      [membershipPlanId],
    );
    assert.deepEqual(
      catalog!.publicPlan.map((p) => p.id),
      [pricingPlanId],
    );
    // No insurer covers this service, so none may be offered — picking one
    // would 400 at add-to-cart.
    assert.deepEqual(catalog!.insurance, []);
  });
});
