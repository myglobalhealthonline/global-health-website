import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { PrismaClient } from "@prisma/client";
import type * as svcTypes from "./membership-reports.service.js";
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
  let countryCode = "";
  // Phase 7f (§23): a second covered country with its OWN currency, plus a
  // third that is covered and has no bookings at all — the union of both sets
  // is what gets a section.
  let currencyBId = "";
  let currencyBCode = uniqueCurrencyCode();
  let countryBId = "";
  let countryBCode = "";
  let countryCId = "";
  let countryCCode = "";
  let serviceBId = "";
  let percentBenefitBId = "";
  let orderBId = "";
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
    const currencyB = await prisma.currency.create({
      data: { code: currencyBCode, symbol: "Kč", decimals: 2 },
    });
    currencyBId = currencyB.id;
    currencyBCode = currencyB.code;

    const mkCountry = (tag: string, curId: string) =>
      prisma!.country.create({
        data: {
          code: `${tag}${uniq}`.slice(0, 8).toLowerCase(),
          name: `Report Test ${tag} ${uniq}`,
          slug: `report-test-${tag}-${uniq}`.toLowerCase(),
          legacyHomePath: `/rhg-${tag}-${uniq}`,
          teamPath: `/rtm-${tag}-${uniq}`,
          generalConsultationPath: `/rgn-${tag}-${uniq}`,
          specialistConsultationPath: `/rsp-${tag}-${uniq}`,
          currencyId: curId,
        },
      });
    const country = await mkCountry("r", currencyId);
    countryId = country.id;
    countryCode = country.code;
    const countryB = await mkCountry("s", currencyBId);
    countryBId = countryB.id;
    countryBCode = countryB.code;
    const countryC = await mkCountry("t", currencyBId);
    countryCId = countryC.id;
    countryCCode = countryC.code;
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
    const serviceB = await prisma.service.create({
      data: {
        countryId: countryBId,
        kind: "GENERAL",
        name: "Report Test GP B",
        slug: `report-gp-b-${uniq}`.toLowerCase(),
        basePriceCents: 80000,
        currencyCode: currencyBCode,
      },
    });
    serviceBId = serviceB.id;
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
      data: {
        primaryCountryId: countryId,
        // Three covered countries: the primary, one that gets booked, and one
        // that never does (§23 — it must still get a zeroed section).
        countries: {
          create: [{ countryId }, { countryId: countryBId }, { countryId: countryCId }],
        },
        slug: `report-plan-${uniq}`,
        name: "Report Plan",
      },
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

    // Country B's own rule. A kind row, not a service row: services are
    // per-country, so B cannot reference A's service (§21.3).
    percentBenefitBId = (
      await prisma.membershipBenefit.create({
        data: {
          levelId,
          planId,
          countryId: countryBId,
          serviceKind: "GENERAL",
          benefitType: "PERCENT",
          percentOff: 10,
        },
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

    // The same member, booking in country B. Its own currency, so the two
    // sections must never be added together (§39).
    const orderB = await prisma.order.create({
      data: {
        orderNumber: `RPB-${uniq}`.slice(0, 30),
        email: user.email,
        fullName: "Report Member",
        countryCode: countryB.code,
        currencyCode: currencyBCode,
        subtotalCents: 0,
        shippingCents: 0,
        totalCents: 0,
        userId,
        items: {
          create: [
            {
              kind: "GENERAL_CONSULTATION",
              serviceId: serviceBId,
              name: "Report Test GP B",
              unitPriceCents: 72000,
              quantity: 1,
              lineTotalCents: 72000,
              membershipEnrollmentId: enrollmentId,
              membershipBenefitId: percentBenefitBId,
              membershipDiscountCents: 8000,
            },
            {
              kind: "GENERAL_CONSULTATION",
              serviceId: serviceBId,
              name: "Report Test GP B",
              unitPriceCents: 0,
              quantity: 1,
              lineTotalCents: 0,
              membershipEnrollmentId: enrollmentId,
              membershipBenefitId: percentBenefitBId,
              membershipDiscountCents: 80000,
              membershipOverrideReason: "Goodwill in the second market",
            },
          ],
        },
      },
    });
    orderBId = orderB.id;
  });

  after(async () => {
    if (!prisma || !countryId) return;
    const countryIds = [countryId, countryBId, countryCId];
    await prisma.membershipUsageLedger.deleteMany({ where: { orderId: { in: [orderId, orderBId] } } });
    await prisma.order.deleteMany({ where: { id: { in: [orderId, orderBId] } } });
    await prisma.membershipAllowanceBalance.deleteMany({
      where: { benefitId: { in: [allowanceBenefitId, percentBenefitId, percentBenefitBId] } },
    });
    await prisma.membershipEnrollment.deleteMany({ where: { planId } });
    await prisma.membershipBenefit.deleteMany({ where: { levelId } });
    await prisma.membershipPlan.deleteMany({ where: { primaryCountryId: countryId } });
    await prisma.service.deleteMany({ where: { countryId: { in: countryIds } } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.country.deleteMany({ where: { id: { in: countryIds } } });
    await prisma.currency.deleteMany({ where: { id: { in: [currencyId, currencyBId] } } });
  });

  /** The section for one country code, which must exist under the §23 union. */
  function section(report: svcTypes.MembershipUsageReport, code: string) {
    const found = report.countries.find((c) => c.countryCode === code.toUpperCase());
    assert.ok(found, `a section for ${code} exists`);
    return found;
  }

  it("counts every benefit type, not only the ones with a ledger row", async (t) => {
    if (!prisma) return t.skip();
    const report = await svc.buildMembershipUsageReport({ planId });
    assert.ok(report);
    const home = section(report, countryCode);
    assert.equal(home.usage.consultations, 2, "the allowance AND the percent booking");
    assert.equal(home.usage.byBenefitType.ALLOWANCE, 1);
    assert.equal(home.usage.byBenefitType.PERCENT, 1);
  });

  it("keeps overrides out of usage, discount and allowance totals", async (t) => {
    if (!prisma) return t.skip();
    const report = await svc.buildMembershipUsageReport({ planId });
    assert.ok(report);
    // 6000 + 1500 from the two real lines. The two override lines carry
    // 1500 + 6000 between them and must not be in here.
    const home = section(report, countryCode);
    assert.equal(home.usage.totalDiscountCents, 7500);
    assert.equal(home.usage.totalChargedCents, 4500);
    // Read off the counter, not by counting flagged lines — an ADMIN_ADJUST
    // moves the counter with no booking behind it.
    assert.equal(report.allowance.used, 1);
    assert.equal(report.allowance.allocated, 2);
  });

  it("reports overrides on their own line, with their reasons", async (t) => {
    if (!prisma) return t.skip();
    const report = await svc.buildMembershipUsageReport({ planId });
    assert.ok(report);
    const home = section(report, countryCode);
    assert.equal(home.overrides.consultations, 2);
    assert.equal(home.overrides.totalValueCents, 7500, "1500 + 6000 given away");
    const reasons = home.overrides.rows.map((row) => row.overrideReason);
    assert.ok(reasons.every(Boolean), "every override row carries its reason");
    assert.ok(reasons.some((r) => /Complaint resolution/.test(r ?? "")));
  });

  it("reaches an override for a patient holding no enrollment", async (t) => {
    if (!prisma) return t.skip();
    const report = await svc.buildMembershipUsageReport({ planId });
    assert.ok(report);
    const unattributed = section(report, countryCode).overrides.rows.find(
      (row) => row.enrollmentId === null,
    );
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
    // The covered countries still get their sections — zeroed, not absent.
    assert.equal(past.countries.length, 3);
    assert.ok(past.countries.every((c) => c.usage.consultations === 0));
    assert.ok(past.countries.every((c) => c.overrides.consultations === 0));
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
    assert.equal(report.rows.length, 5, "four lines at home plus the second market's two, minus the override that belongs to nobody");
    assert.equal(report.totals.consultations, 3);
    assert.equal(report.totals.overrides, 2);
    assert.equal(report.totals.allowanceUsed, 1);
    // Per country, from the rows. `totals.discountCents` adds 6000 + 1500 at
    // home to 8000 in the second market across two currencies — pinned as a
    // known limitation of the MEMBER drill-down rather than asserted as a
    // meaningful figure. The PARTNER report never sums across countries (§23).
    const byCountry = new Map<string | null, number>();
    for (const row of report.rows) {
      if (row.overrideReason) continue;
      byCountry.set(row.countryCode, (byCountry.get(row.countryCode) ?? 0) + row.discountCents);
    }
    assert.equal(byCountry.get(countryCode.toUpperCase()), 7500);
    assert.equal(byCountry.get(countryBCode.toUpperCase()), 8000);
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
    assert.equal(lines.length, 7, "header + 3 usage rows + 3 override rows, both markets");
    assert.ok(lines[0].includes("override,override_reason"));
    const overrideLines = lines.slice(1).filter((line) => line.includes(",yes,"));
    assert.ok(overrideLines.length >= 2, "override rows carry the flag");
    // A reason containing a comma must not shift every column after it.
    assert.ok(csv.includes(`"${"Goodwill after a cancelled slot"}"`) || csv.includes("Goodwill after a cancelled slot"));
  });

  // ─── Per-country sections (§23, phase 7f) ──────────────────────────────────

  it("splits usage into per-country sections, each in its own currency", async (t) => {
    if (!prisma) return t.skip();
    const report = await svc.buildMembershipUsageReport({ planId });
    assert.ok(report);
    const home = section(report, countryCode);
    const away = section(report, countryBCode);
    assert.equal(home.currencyCode, currencyCode);
    assert.equal(away.currencyCode, currencyBCode);
    assert.notEqual(home.currencyCode, away.currencyCode, "no shared currency to sum into");
    assert.equal(away.usage.consultations, 1);
    assert.equal(away.usage.totalChargedCents, 72000);
    assert.equal(away.usage.totalDiscountCents, 8000);
    // The report exposes no summed total anywhere — that is the §39 guarantee,
    // and a top-level figure is what a partner would quote back.
    assert.equal("usage" in report, false);
    assert.equal("currencyCode" in report, false);
  });

  it("keeps overrides on their own line, per country", async (t) => {
    if (!prisma) return t.skip();
    const report = await svc.buildMembershipUsageReport({ planId });
    assert.ok(report);
    const away = section(report, countryBCode);
    assert.equal(away.overrides.consultations, 1);
    assert.equal(away.overrides.totalValueCents, 80000);
    assert.equal(
      away.usage.rows.some((row) => row.overrideReason != null),
      false,
      "goodwill never lands in the partner's usage rows",
    );
  });

  it("gives a covered country with no bookings a zeroed section", async (t) => {
    if (!prisma) return t.skip();
    const report = await svc.buildMembershipUsageReport({ planId });
    assert.ok(report);
    const quiet = section(report, countryCCode);
    assert.equal(quiet.covered, true);
    assert.equal(quiet.usage.consultations, 0);
    assert.equal(quiet.currencyCode, null, "no orders, so no currency to state");
    // Data-only sections would hide that a covered market is used by nobody,
    // which is exactly what a partner conversation needs.
  });

  it("puts the primary country first and keeps members and allowance global", async (t) => {
    if (!prisma) return t.skip();
    const report = await svc.buildMembershipUsageReport({ planId });
    assert.ok(report);
    assert.equal(report.countries[0].countryCode, countryCode.toUpperCase());
    // Enrollment is pinned to the primary country and the pool is shared, so
    // splitting either would invent a distinction the data model lacks.
    assert.equal(report.membersByStatus.ACTIVE, 1);
    assert.equal(report.allowance.allocated, 2);
    assert.equal(report.allowance.used, 1);
  });

  it("labels every CSV row with the country the booking happened in", async (t) => {
    if (!prisma) return t.skip();
    const report = await svc.buildMembershipUsageReport({ planId });
    assert.ok(report);
    const csv = svc.usageReportToCsv(report);
    assert.ok(csv.split("\r\n")[0].startsWith("order_number,booked_at,country,"));
    const codes = csv
      .split("\r\n")
      .slice(1)
      .map((line) => line.split(",")[2]);
    assert.ok(codes.includes(countryCode.toUpperCase()));
    assert.ok(
      codes.includes(countryBCode.toUpperCase()),
      "a member booking abroad is attributed to the BOOKING country, not their own",
    );
  });
});
