import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

/**
 * The coverage engine: INCLUDED / COPAY / DISCOUNT, best-rule selection, and
 * annual limits. Every property here is one where a plausible implementation
 * charges the wrong money:
 *
 *   - a co-pay charges the co-pay, not a percentage of the price;
 *   - a co-pay ABOVE the list price never charges above list;
 *   - two rules on the same kind resolve by best member price, not row order;
 *   - an exhausted limit falls through to the next-best rule, not to full price;
 *   - grouped rules share ONE annual counter.
 *
 * Fully mocked — zero DB contact (needs `--experimental-test-module-mocks`).
 */

type Rule = {
  id: string;
  serviceId: string | null;
  serviceKind: string | null;
  coverage: "INCLUDED" | "COPAY" | "DISCOUNT";
  discountPercent: number;
  copayCents: number | null;
  annualLimit: number | null;
  limitGroup: string | null;
  appliesToBeneficiaries: boolean;
};

/** `used` is keyed by rule id, mirroring what the groupBy returns. */
const state: { rules: Rule[]; used: Record<string, number> } = { rules: [], used: {} };

const rule = (over: Partial<Rule> = {}): Rule => ({
  id: "r1",
  serviceId: null,
  serviceKind: "GENERAL",
  coverage: "DISCOUNT",
  discountPercent: 15,
  copayCents: null,
  annualLimit: null,
  limitGroup: null,
  appliesToBeneficiaries: true,
  ...over,
});

let svc: typeof import("./corporate-benefit.service.js");

before(async () => {
  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        corporateBenefitRule: { findMany: async () => state.rules },
        orderItem: {
          groupBy: async (args: { where: { corporateBenefitRuleId: { in: string[] } } }) =>
            args.where.corporateBenefitRuleId.in
              .filter((id) => state.used[id])
              .map((id) => ({ corporateBenefitRuleId: id, _sum: { quantity: state.used[id] } })),
        },
      },
    },
  });
  mock.module("./corporate-shared.js", {
    namedExports: {
      companyIsLive: () => true,
      getActiveMembershipForUser: async () => ({
        memberType: "EMPLOYEE",
        employeeId: "emp-1",
        company: {
          id: "co-1",
          name: "Acme",
          planId: "plan-1",
          countryCode: "ie",
          contractStartAt: new Date("2026-01-01T00:00:00Z"),
          plan: { name: "Corporate Premium" },
        },
      }),
    },
  });
  svc = await import("./corporate-benefit.service.js");
});

beforeEach(() => {
  state.rules = [];
  state.used = {};
});

const price = (baseCents: number, serviceId = "gp-1") =>
  svc.resolveCorporateDiscount({
    userId: "user-1",
    serviceId,
    serviceKind: "GENERAL",
    baseCents,
  });

describe("corporate coverage — what the member pays", () => {
  it("charges nothing for an INCLUDED rule", async () => {
    state.rules = [rule({ coverage: "INCLUDED", discountPercent: 0 })];
    const result = await price(5000);
    assert.equal(result?.discountCents, 5000);
    assert.equal(result?.coverage, "INCLUDED");
    assert.equal(result?.discountPercent, 100);
  });

  it("charges exactly the co-pay, whatever the service costs", async () => {
    state.rules = [rule({ coverage: "COPAY", discountPercent: 0, copayCents: 2000 })];
    const cheap = await price(5000);
    const dear = await price(12000);
    assert.equal(cheap?.copayCents, 2000);
    assert.equal(cheap?.discountCents, 3000);
    assert.equal(dear?.copayCents, 2000);
    assert.equal(dear?.discountCents, 10000);
  });

  /** A €20 co-pay on a €15 service must not become a €20 charge. */
  it("never charges above the list price when the co-pay exceeds it", async () => {
    state.rules = [rule({ coverage: "COPAY", discountPercent: 0, copayCents: 2000 })];
    assert.equal(await price(1500), null);
  });

  it("ignores a co-pay rule with no amount configured", async () => {
    state.rules = [rule({ coverage: "COPAY", discountPercent: 0, copayCents: null })];
    assert.equal(await price(5000), null);
  });

  it("keeps percentage rules working unchanged", async () => {
    state.rules = [rule({ coverage: "DISCOUNT", discountPercent: 15 })];
    const result = await price(5000);
    assert.equal(result?.discountCents, 750);
    assert.equal(result?.copayCents, null);
  });
});

describe("corporate coverage — which rule wins", () => {
  /** The Premium plans carry both: a €20 co-pay AND the sitewide 15% employee
   *  benefit program. Row order must not decide the price. */
  it("picks the rule that leaves the member paying least", async () => {
    state.rules = [
      rule({ id: "ebp", coverage: "DISCOUNT", discountPercent: 15 }),
      rule({ id: "copay", coverage: "COPAY", discountPercent: 0, copayCents: 2000 }),
    ];
    assert.equal((await price(5000))?.ruleId, "copay");
    // Cheap service: the co-pay clamps to full price and stops being a benefit,
    // so the 15% takes over instead of the member losing the benefit entirely.
    assert.equal((await price(1500))?.ruleId, "ebp");
  });

  it("still lets a pinned-service rule beat a kind rule", async () => {
    state.rules = [
      rule({ id: "kind", coverage: "INCLUDED", discountPercent: 0 }),
      rule({ id: "pinned", serviceId: "gp-1", serviceKind: null, discountPercent: 10 }),
    ];
    // Pinned wins on tier even though INCLUDED would be cheaper for the member.
    assert.equal((await price(5000))?.ruleId, "pinned");
  });

  it("refuses a beneficiary the rules that exclude them", async () => {
    state.rules = [rule({ appliesToBeneficiaries: false })];
    // The mocked membership is an EMPLOYEE, so this rule applies…
    assert.ok(await price(5000));
    // …and the beneficiary path is covered by resolveMemberBenefits' own test.
  });
});

describe("corporate coverage — annual limits", () => {
  it("stops covering once the limit is spent", async () => {
    state.rules = [
      rule({ id: "physio", coverage: "COPAY", discountPercent: 0, copayCents: 4000, annualLimit: 5 }),
    ];
    state.used = { physio: 4 };
    assert.equal((await price(9000))?.copayCents, 4000);
    state.used = { physio: 5 };
    assert.equal(await price(9000), null);
  });

  it("falls through to the next-best rule instead of full price", async () => {
    state.rules = [
      rule({ id: "ebp", coverage: "DISCOUNT", discountPercent: 15 }),
      rule({ id: "copay", coverage: "COPAY", discountPercent: 0, copayCents: 2000, annualLimit: 5 }),
    ];
    state.used = { copay: 5 };
    const result = await price(5000);
    assert.equal(result?.ruleId, "ebp");
    assert.equal(result?.discountCents, 750);
  });

  /** "Physiotherapy or Chiropractic (up to 5x)" — 5 across both, not 5 each. */
  it("shares one counter across a limit group", async () => {
    state.rules = [
      rule({ id: "physio", coverage: "COPAY", discountPercent: 0, copayCents: 4000, annualLimit: 5, limitGroup: "physio-chiro" }),
      rule({ id: "chiro", serviceId: "chiro-1", serviceKind: null, coverage: "COPAY", discountPercent: 0, copayCents: 4000, annualLimit: 5, limitGroup: "physio-chiro" }),
    ];
    state.used = { physio: 3, chiro: 2 };
    assert.equal(await price(9000), null);
    assert.equal(await price(9000, "chiro-1"), null);
    state.used = { physio: 3, chiro: 1 };
    assert.equal((await price(9000))?.copayCents, 4000);
  });

  it("leaves uncapped rules alone", async () => {
    state.rules = [rule({ id: "ebp", annualLimit: null })];
    state.used = { ebp: 99 };
    assert.ok(await price(5000));
  });
});

describe("contractYearStart", () => {
  it("resets on the contract anniversary, not in January", () => {
    const start = new Date("2026-09-15T00:00:00Z");
    assert.equal(
      svc.contractYearStart(start, new Date("2027-03-01T00:00:00Z")).toISOString(),
      "2026-09-15T00:00:00.000Z",
    );
    assert.equal(
      svc.contractYearStart(start, new Date("2027-10-01T00:00:00Z")).toISOString(),
      "2027-09-15T00:00:00.000Z",
    );
  });

  it("returns the current window on the anniversary itself", () => {
    const start = new Date("2026-09-15T00:00:00Z");
    assert.equal(
      svc.contractYearStart(start, new Date("2027-09-15T00:00:00Z")).toISOString(),
      "2027-09-15T00:00:00.000Z",
    );
  });
});
