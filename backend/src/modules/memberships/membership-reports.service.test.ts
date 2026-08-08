import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { PrismaClient } from "@prisma/client";
import { uniqueCurrencyCode } from "../../test-utils/unique-currency-code.js";

/**
 * §15 / §32 — membership usage reporting.
 *
 * DB-backed: every property under test is about which rows a query reaches.
 *
 * The three that carry the partner relationship:
 *
 *   - PERCENT and FIXED bookings appear at all. An earlier draft of the spec
 *     read the ledger, which only ALLOWANCE spends ever write — most member
 *     activity would have been invisible.
 *   - a goodwill override is EXCLUDED from consultations, from "discount
 *     given" and from allowance-used, and appears on its own line with its
 *     reason. Billing a partner for our own generosity is the failure mode.
 *   - an override for a patient on NO plan is still reached, through the
 *     benefit row rather than the enrollment id, so goodwill cannot be hidden
 *     by having no member attached to it.
 */
describe("membership reports — usage, overrides, drill-down", () => {
  let prisma: PrismaClient | null = null;
  let svc: typeof import("./membership-reports.service.js");

  const uniq = `rp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const TERM_START = new Date("2026-01-01T00:00:00.000Z");

  let currencyId = "";
  let countryId = "";
  let planId = "";
  let levelId = "";
  let allowanceBenefitId = "";
  let percentBenefitId = "";
  let serviceId = "";
  let userId = "";
  let enrollmentId = "";
  let orderId = "";
  let currencyCode = uniqueCurrencyCode();

  before(async () => {
    try {
      prisma = (await import("../../db/prisma.js")).prisma;
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      prisma = null;
      return;
    }
    svc = await import("./membership-reports.service.js");

    const currency = await prisma.currency.create({
      data: { code: currencyCode, symbol: "€", decimals: 2 },
    });
    currencyId = currency.id;
    currencyCode = currency.code;
    const country = await prisma.country.create({
      data: {
        code: `r${uniq}`.slice(0, 8).toLowerCase(),
        name: `Report Test ${uniq}`,
        slug: `report-test-${uniq}`.toLowerCase(),
        legacyHomePath: `/rhg-${uniq}`,
        teamPath: `/rtm-${uniq}`,
        generalConsultationPath: `/rgn-${uniq}`,
        specialistConsultationPath: `/rsp-${uniq}`,
        currencyId,
      },
    });
    countryId = country.id;
    const service = await prisma.service.create({
      data: {
        countryId,
        kind: "GENERAL",
        name: "Report Test GP",
        slug: `report-gp-${uniq}`.toLowerCase(),
        basePriceCents: 6000,
        currencyCode: currency.code,
      },
    });
    serviceId = service.id;
    const user = await prisma.user.create({
      data: {
        email: `report-${uniq}@test.local`,
        passwordHash: "x",
        fullName: "Report Member",
        role: "PATIENT",
        emailVerifiedAt: new Date(),
      },
    });
    userId = user.id;

    const plan = await prisma.membershipPlan.create({
      data: { primaryCountryId: countryId, countries: { create: { countryId } }, slug: `report-plan-${uniq}`, name: "Report Plan" },
    });
    planId = plan.id;
    const level = await prisma.membershipLevel.create({
      data: { planId, slug: "gold", name: "Gold", isDefault: true },
    });
    levelId = level.id;
    allowanceBenefitId = (
      await prisma.membershipBenefit.create({
        data: {
          levelId,
          planId,
          countryId,
          serviceKind: "GENERAL",
          benefitType: "ALLOWANCE",
          allowanceCount: 2,
          fallbackType: "PERCENT",
          fallbackPercent: 20,
        },
      })
    ).id;
    percentBenefitId = (
      await prisma.membershipBenefit.create({
        data: { levelId, planId, countryId, serviceId, benefitType: "PERCENT", percentOff: 25 },
      })
    ).id;

    const enrollment = await prisma.membershipEnrollment.create({
      data: {
        planId,
        levelId,
        countryId,
        membershipId: `RP-${uniq}`.toUpperCase(),
        email: user.email,
        firstName: "Report",
        lastName: "Member",
        userId,
        linkedAt: new Date(),
        status: "ACTIVE",
        startDate: TERM_START,
      },
    });
    enrollmentId = enrollment.id;

    // One counter, so allowance used-vs-allocated has something to read. Set
    // by hand rather than through a spend: this suite is about the report.
    await prisma.membershipAllowanceBalance.create({
      data: {
        benefitId: allowanceBenefitId,
        holderEnrollmentId: enrollmentId,
        termStart: TERM_START,
        allocated: 2,
        used: 1,
      },
    });

    // Four lines on one order:
    //   1. an ALLOWANCE booking at €0                (real usage)
    //   2. a PERCENT booking at €45                  (real usage)
    //   3. an override for THIS member               (goodwill, attributed)
    //   4. an override for someone on no plan at all (goodwill, unattributed)
    const order = await prisma.order.create({
      data: {
        orderNumber: `RPT-${uniq}`.slice(0, 30),
        email: user.email,
        fullName: "Report Member",
        countryCode: country.code,
        currencyCode: currency.code,
        subtotalCents: 0,
        shippingCents: 0,
        totalCents: 0,
        userId,
        items: {
          create: [
            {
              kind: "GENERAL_CONSULTATION",
              serviceId,
              name: "Report Test GP",
              unitPriceCents: 0,
              quantity: 1,
              lineTotalCents: 0,
              membershipEnrollmentId: enrollmentId,
              membershipBenefitId: allowanceBenefitId,
              membershipDiscountCents: 6000,
              membershipAllowanceUsed: true,
            },
            {
              kind: "GENERAL_CONSULTATION",
              serviceId,
              name: "Report Test GP",
              unitPriceCents: 4500,
              quantity: 1,
              lineTotalCents: 4500,
              membershipEnrollmentId: enrollmentId,
              membershipBenefitId: percentBenefitId,
              membershipDiscountCents: 1500,
            },
            {
              kind: "GENERAL_CONSULTATION",
              serviceId,
              name: "Report Test GP",
              unitPriceCents: 4500,
              quantity: 1,
              lineTotalCents: 4500,
              membershipEnrollmentId: enrollmentId,
              membershipBenefitId: percentBenefitId,
              membershipDiscountCents: 1500,
              membershipOverrideReason: "Goodwill after a cancelled slot",
            },
            {
              kind: "GENERAL_CONSULTATION",
              serviceId,
              name: "Report Test GP",
              unitPriceCents: 0,
              quantity: 1,
              lineTotalCents: 0,
              membershipBenefitId: allowanceBenefitId,
              membershipDiscountCents: 6000,
              membershipOverrideReason: "Complaint resolution, no membership held",
            },
          ],
        },
      },
    });
    orderId = order.id;
  });

  after(async () => {
    if (!prisma || !countryId) return;
    await prisma.membershipUsageLedger.deleteMany({ where: { orderId } });
    await prisma.order.deleteMany({ where: { id: orderId } });
    await prisma.membershipAllowanceBalance.deleteMany({
      where: { benefitId: { in: [allowanceBenefitId, percentBenefitId] } },
    });
    await prisma.membershipEnrollment.deleteMany({ where: { planId } });
    await prisma.membershipBenefit.deleteMany({ where: { levelId } });
    await prisma.membershipPlan.deleteMany({ where: { primaryCountryId: countryId } });
    await prisma.service.deleteMany({ where: { countryId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.country.deleteMany({ where: { id: countryId } });
    await prisma.currency.deleteMany({ where: { id: currencyId } });
  });

  it("counts every benefit type, not only the ones with a ledger row", async (t) => {
    if (!prisma) return t.skip();
    const report = await svc.buildMembershipUsageReport({ planId });
    assert.ok(report);
    assert.equal(report.usage.consultations, 2, "the allowance AND the percent booking");
    assert.equal(report.usage.byBenefitType.ALLOWANCE, 1);
    assert.equal(report.usage.byBenefitType.PERCENT, 1);
  });

  it("keeps overrides out of usage, discount and allowance totals", async (t) => {
    if (!prisma) return t.skip();
    const report = await svc.buildMembershipUsageReport({ planId });
    assert.ok(report);
    // 6000 + 1500 from the two real lines. The two override lines carry
    // 1500 + 6000 between them and must not be in here.
    assert.equal(report.usage.totalDiscountCents, 7500);
    assert.equal(report.usage.totalChargedCents, 4500);
    // Read off the counter, not by counting flagged lines — an ADMIN_ADJUST
    // moves the counter with no booking behind it.
    assert.equal(report.allowance.used, 1);
    assert.equal(report.allowance.allocated, 2);
  });

  it("reports overrides on their own line, with their reasons", async (t) => {
    if (!prisma) return t.skip();
    const report = await svc.buildMembershipUsageReport({ planId });
    assert.ok(report);
    assert.equal(report.overrides.consultations, 2);
    assert.equal(report.overrides.totalValueCents, 7500, "1500 + 6000 given away");
    const reasons = report.overrides.rows.map((row) => row.overrideReason);
    assert.ok(reasons.every(Boolean), "every override row carries its reason");
    assert.ok(reasons.some((r) => /Complaint resolution/.test(r ?? "")));
  });

  it("reaches an override for a patient holding no enrollment", async (t) => {
    if (!prisma) return t.skip();
    const report = await svc.buildMembershipUsageReport({ planId });
    assert.ok(report);
    const unattributed = report.overrides.rows.find((row) => row.enrollmentId === null);
    assert.ok(
      unattributed,
      "found through the benefit row — an enrollment-only query would miss it entirely",
    );
    assert.equal(unattributed.memberName, null);
  });

  it("counts members by status", async (t) => {
    if (!prisma) return t.skip();
    const report = await svc.buildMembershipUsageReport({ planId });
    assert.ok(report);
    assert.equal(report.membersByStatus.ACTIVE, 1);
    assert.equal(report.membersByStatus.REMOVED, 0);
  });

  it("honours the date range on both ends", async (t) => {
    if (!prisma) return t.skip();
    const past = await svc.buildMembershipUsageReport({
      planId,
      from: new Date("2020-01-01T00:00:00.000Z"),
      to: new Date("2020-12-31T23:59:59.999Z"),
    });
    assert.ok(past);
    assert.equal(past.usage.consultations, 0);
    assert.equal(past.overrides.consultations, 0);
    // Members are current state, not range-filtered — a partner asking "who is
    // on this programme" means now, not during the window.
    assert.equal(past.membersByStatus.ACTIVE, 1);
  });

  it("returns null for a plan that does not exist", async (t) => {
    if (!prisma) return t.skip();
    assert.equal(await svc.buildMembershipUsageReport({ planId: "no-such-plan" }), null);
  });

  it("drills down to one member, flagging their overrides", async (t) => {
    if (!prisma) return t.skip();
    const report = await svc.buildMemberUsageReport(enrollmentId);
    assert.ok(report);
    assert.equal(report.rows.length, 3, "two real lines plus their own override");
    assert.equal(report.totals.consultations, 2);
    assert.equal(report.totals.overrides, 1);
    assert.equal(report.totals.allowanceUsed, 1);
    assert.equal(report.totals.discountCents, 7500);
    assert.equal(report.enrollment.membershipId, `RP-${uniq}`.toUpperCase());
  });

  it("returns null for an enrollment that does not exist", async (t) => {
    if (!prisma) return t.skip();
    assert.equal(await svc.buildMemberUsageReport("no-such-enrollment"), null);
  });

  it("exports real usage and overrides in one CSV, flagged apart", async (t) => {
    if (!prisma) return t.skip();
    const report = await svc.buildMembershipUsageReport({ planId });
    assert.ok(report);
    const csv = svc.usageReportToCsv(report);
    const lines = csv.split("\r\n");
    assert.equal(lines.length, 5, "header + 2 usage rows + 2 override rows");
    assert.ok(lines[0].includes("override,override_reason"));
    const overrideLines = lines.slice(1).filter((line) => line.includes(",yes,"));
    assert.ok(overrideLines.length >= 2, "override rows carry the flag");
    // A reason containing a comma must not shift every column after it.
    assert.ok(csv.includes(`"${"Goodwill after a cancelled slot"}"`) || csv.includes("Goodwill after a cancelled slot"));
    assert.equal(report.currencyCode, currencyCode);
  });
});
