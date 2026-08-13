import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { PrismaClient } from "@prisma/client";
import { uniqueCurrencyCode } from "../../test-utils/unique-currency-code.js";

/**
 * §11.7 / §16.1 — the SUPER_ADMIN goodwill override.
 *
 * DB-backed, because the two properties that matter are both lookups: the
 * benefit row must be real and current (so the price comes from a configured
 * rule rather than a typed-in number), and the patient's own enrollment must be
 * attributed when they hold one *in any state*. Neither can be exercised
 * against a mock without testing the mock.
 *
 * The cases that carry money:
 *
 *   - an ALLOWANCE rule resolves at its €0 member price, NOT at its fallback
 *     discount — "give them the member price" has to mean the member price;
 *   - no allowance unit is ever spent, so a ledger-derived total can never be
 *     inflated by goodwill;
 *   - a suspended / expired / exhausted member is still served, because those
 *     are precisely the cases the override exists for;
 *   - the enrollment id is stamped whenever the patient holds one and null only
 *     for a true goodwill grant, since `membershipOverrideReason` — not the
 *     absence of an id — is the sole discriminator in reporting.
 */
describe("membership override — goodwill pricing and attribution", () => {
  let prisma: PrismaClient | null = null;
  let svc: typeof import("./membership-override.service.js");

  const uniq = `ov-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const currencyCode = uniqueCurrencyCode();
  const TERM_START = new Date("2026-01-01T00:00:00.000Z");
  const FULL_PRICE = 6000;

  let currencyId = "";
  let countryId = "";
  let otherCountryId = "";
  let planId = "";
  let levelId = "";
  let allowanceBenefitId = "";
  let percentBenefitId = "";
  let specialistBenefitId = "";
  let inactiveBenefitId = "";
  let serviceId = "";
  let specialistServiceId = "";
  const MEMBER_EMAIL = `override-member-${uniq}@test.local`;
  const STRANGER_EMAIL = `override-stranger-${uniq}@test.local`;

  const generalService = () => ({ id: serviceId, countryId, kind: "GENERAL" as const });

  before(async () => {
    try {
      prisma = (await import("../../db/prisma.js")).prisma;
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      prisma = null;
      return;
    }
    svc = await import("./membership-override.service.js");

    const currency = await prisma.currency.create({
      data: { code: currencyCode, symbol: "€", decimals: 2 },
    });
    currencyId = currency.id;
    const country = await prisma.country.create({
      data: {
        code: `o${uniq}`.slice(0, 8).toLowerCase(),
        name: `Override Test ${uniq}`,
        slug: `override-test-${uniq}`.toLowerCase(),
        legacyHomePath: `/ohg-${uniq}`,
        teamPath: `/otm-${uniq}`,
        generalConsultationPath: `/ogn-${uniq}`,
        specialistConsultationPath: `/osp-${uniq}`,
        currencyId,
      },
    });
    countryId = country.id;
    const otherCountry = await prisma.country.create({
      data: {
        code: `x${uniq}`.slice(0, 8).toLowerCase(),
        name: `Override Other ${uniq}`,
        slug: `override-other-${uniq}`.toLowerCase(),
        legacyHomePath: `/xhg-${uniq}`,
        teamPath: `/xtm-${uniq}`,
        generalConsultationPath: `/xgn-${uniq}`,
        specialistConsultationPath: `/xsp-${uniq}`,
        currencyId,
      },
    });
    otherCountryId = otherCountry.id;

    const service = await prisma.service.create({
      data: {
        countryId,
        kind: "GENERAL",
        name: "Override Test GP",
        slug: `override-gp-${uniq}`.toLowerCase(),
        basePriceCents: FULL_PRICE,
        currencyCode: currency.code,
      },
    });
    serviceId = service.id;
    const specialist = await prisma.service.create({
      data: {
        countryId,
        kind: "SPECIALIST",
        name: "Override Test Specialist",
        slug: `override-spec-${uniq}`.toLowerCase(),
        basePriceCents: FULL_PRICE,
        currencyCode: currency.code,
      },
    });
    specialistServiceId = specialist.id;

    const plan = await prisma.membershipPlan.create({
      data: { primaryCountryId: countryId, countries: { create: { countryId } }, slug: `override-plan-${uniq}`, name: "Override Plan" },
    });
    planId = plan.id;
    const level = await prisma.membershipLevel.create({
      data: { planId, slug: "gold", name: "Gold", isDefault: true },
    });
    levelId = level.id;

    // The rule the override normally applies: one included consultation, with a
    // 20% fallback once it is gone. The override must land on the €0 side.
    allowanceBenefitId = (
      await prisma.membershipBenefit.create({
        data: {
          levelId,
          planId,
          countryId,
          serviceKind: "GENERAL",
          benefitType: "ALLOWANCE",
          allowanceCount: 1,
          fallbackType: "PERCENT",
          fallbackPercent: 20,
        },
      })
    ).id;
    // A service-pinned percent rule, so "does this row govern this service"
    // has something to fail against.
    percentBenefitId = (
      await prisma.membershipBenefit.create({
        data: {
          levelId,
          planId,
          countryId,
          serviceId,
          benefitType: "PERCENT",
          percentOff: 25,
        },
      })
    ).id;
    specialistBenefitId = (
      await prisma.membershipBenefit.create({
        data: {
          levelId,
          planId,
          countryId,
          serviceKind: "SPECIALIST",
          benefitType: "FIXED",
          fixedPriceCents: 4500,
        },
      })
    ).id;
    inactiveBenefitId = (
      await prisma.membershipBenefit.create({
        data: {
          levelId,
          planId,
          countryId,
          serviceId: specialistServiceId,
          benefitType: "PERCENT",
          percentOff: 50,
          isActive: false,
        },
      })
    ).id;

    // A SUSPENDED member: entitled to nothing right now, which is exactly the
    // shape the override is for.
    await prisma.membershipEnrollment.create({
      data: {
        planId,
        levelId,
        countryId,
        membershipId: `OV-${uniq}`.toUpperCase(),
        email: MEMBER_EMAIL,
        firstName: "Override",
        lastName: "Member",
        status: "SUSPENDED",
        startDate: TERM_START,
      },
    });
  });

  after(async () => {
    if (!prisma || !countryId) return;
    await prisma.membershipEnrollment.deleteMany({ where: { planId } });
    await prisma.membershipBenefit.deleteMany({ where: { levelId } });
    await prisma.membershipPlan.deleteMany({ where: { primaryCountryId: countryId } });
    await prisma.service.deleteMany({ where: { countryId } });
    await prisma.country.deleteMany({ where: { id: { in: [countryId, otherCountryId] } } });
    await prisma.currency.deleteMany({ where: { id: currencyId } });
  });

  it("prices an ALLOWANCE rule at the member price, not its fallback", async (t) => {
    if (!prisma) return t.skip();
    const result = await svc.resolveMembershipOverride({
      benefitId: allowanceBenefitId,
      service: generalService(),
      fullPriceCents: FULL_PRICE,
      patientEmail: STRANGER_EMAIL,
    });
    // 0, not 4800 (the 20% fallback): falling through to the fallback would
    // make "give them the member price" silently mean something else.
    assert.equal(result.unitPriceCents, 0);
    assert.equal(result.discountCents, FULL_PRICE);
    assert.equal(result.basis, "ALLOWANCE");
  });

  it("never writes a ledger row or a balance — goodwill spends no unit", async (t) => {
    if (!prisma) return t.skip();
    await svc.resolveMembershipOverride({
      benefitId: allowanceBenefitId,
      service: generalService(),
      fullPriceCents: FULL_PRICE,
      patientEmail: STRANGER_EMAIL,
    });
    const balances = await prisma.membershipAllowanceBalance.count({
      where: { benefitId: allowanceBenefitId },
    });
    const ledger = await prisma.membershipUsageLedger.count({
      where: { balance: { benefitId: allowanceBenefitId } },
    });
    assert.equal(balances, 0, "no counter created by an override");
    assert.equal(ledger, 0, "no ledger row written by an override");
  });

  it("serves a SUSPENDED member and still stamps their enrollment", async (t) => {
    if (!prisma) return t.skip();
    const result = await svc.resolveMembershipOverride({
      benefitId: percentBenefitId,
      service: generalService(),
      fullPriceCents: FULL_PRICE,
      patientEmail: MEMBER_EMAIL,
    });
    assert.equal(result.unitPriceCents, 4500, "25% off the full price");
    assert.ok(result.enrollmentId, "a held enrollment is attributed even when suspended");
  });

  it("matches the enrollment case-insensitively, like every other lookup", async (t) => {
    if (!prisma) return t.skip();
    const result = await svc.resolveMembershipOverride({
      benefitId: percentBenefitId,
      service: generalService(),
      fullPriceCents: FULL_PRICE,
      patientEmail: MEMBER_EMAIL.toUpperCase(),
    });
    assert.ok(result.enrollmentId);
  });

  it("leaves the enrollment null for a patient on no plan at all", async (t) => {
    if (!prisma) return t.skip();
    const result = await svc.resolveMembershipOverride({
      benefitId: percentBenefitId,
      service: generalService(),
      fullPriceCents: FULL_PRICE,
      patientEmail: STRANGER_EMAIL,
    });
    assert.equal(result.enrollmentId, null);
  });

  it("refuses a rule that does not govern this service", async (t) => {
    if (!prisma) return t.skip();
    // A SPECIALIST rule pushed onto a GENERAL booking. The resolver refuses it
    // for free, which is the whole reason the override goes through it.
    await assert.rejects(
      () =>
        svc.resolveMembershipOverride({
          benefitId: specialistBenefitId,
          service: generalService(),
          fullPriceCents: FULL_PRICE,
          patientEmail: MEMBER_EMAIL,
        }),
      svc.MembershipOverrideError,
    );
  });

  it("refuses a rule from another country's plan", async (t) => {
    if (!prisma) return t.skip();
    await assert.rejects(
      () =>
        svc.resolveMembershipOverride({
          benefitId: percentBenefitId,
          service: { id: serviceId, countryId: otherCountryId, kind: "GENERAL" },
          fullPriceCents: FULL_PRICE,
          patientEmail: MEMBER_EMAIL,
        }),
      svc.MembershipOverrideError,
    );
  });

  it("refuses an inactive rule with a message that names the reason", async (t) => {
    if (!prisma) return t.skip();
    await assert.rejects(
      () =>
        svc.resolveMembershipOverride({
          benefitId: inactiveBenefitId,
          service: { id: specialistServiceId, countryId, kind: "SPECIALIST" },
          fullPriceCents: FULL_PRICE,
          patientEmail: MEMBER_EMAIL,
        }),
      (err: unknown) =>
        err instanceof svc.MembershipOverrideError && /no longer active/.test(err.message),
    );
  });

  it("refuses a benefit id that does not exist", async (t) => {
    if (!prisma) return t.skip();
    await assert.rejects(
      () =>
        svc.resolveMembershipOverride({
          benefitId: "not-a-real-benefit",
          service: generalService(),
          fullPriceCents: FULL_PRICE,
          patientEmail: MEMBER_EMAIL,
        }),
      svc.MembershipOverrideError,
    );
  });

  it("never charges more than declining the benefit would", async (t) => {
    if (!prisma) return t.skip();
    // The specialist rule is a €45 fixed price; on a €20 off-peak slot it must
    // clamp rather than charge the member extra for holding a membership.
    const result = await svc.resolveMembershipOverride({
      benefitId: specialistBenefitId,
      service: { id: specialistServiceId, countryId, kind: "SPECIALIST" },
      fullPriceCents: 2000,
      patientEmail: MEMBER_EMAIL,
    });
    assert.equal(result.unitPriceCents, 2000);
    assert.equal(result.discountCents, 0);
  });

  it("lists only the rules that govern the service, priced", async (t) => {
    if (!prisma) return t.skip();
    const options = await svc.listMembershipOverrideOptions({
      service: generalService(),
      fullPriceCents: FULL_PRICE,
      patientEmail: MEMBER_EMAIL,
    });
    const ids = options.map((option) => option.benefitId);
    assert.ok(ids.includes(percentBenefitId), "the service-pinned rule is offered");
    assert.ok(
      !ids.includes(specialistBenefitId),
      "a SPECIALIST rule is not offered for a GENERAL service",
    );
    assert.ok(!ids.includes(inactiveBenefitId), "an inactive rule is never offered");
    const percentOption = options.find((option) => option.benefitId === percentBenefitId);
    assert.equal(percentOption?.unitPriceCents, 4500);
    assert.equal(percentOption?.patientHoldsPlan, true);
  });

  it("marks the plan as not held for a patient with no enrollment", async (t) => {
    if (!prisma) return t.skip();
    const options = await svc.listMembershipOverrideOptions({
      service: generalService(),
      fullPriceCents: FULL_PRICE,
      patientEmail: STRANGER_EMAIL,
    });
    assert.ok(options.length > 0);
    assert.ok(options.every((option) => option.patientHoldsPlan === false));
    assert.ok(options.every((option) => option.enrollmentId === null));
  });
});
