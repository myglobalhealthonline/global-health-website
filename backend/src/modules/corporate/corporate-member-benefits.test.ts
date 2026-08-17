import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

/**
 * The member-facing benefit view. Its whole job is to agree with what checkout
 * will actually charge, so the properties worth pinning are the ones where a
 * plausible implementation would quietly disagree:
 *
 *   - a pinned-service rule beats a kind rule (same precedence as
 *     `resolveCorporateDiscount`);
 *   - a beneficiary does not see a discount the pricing engine will refuse
 *     them (`appliesToBeneficiaries`);
 *   - kinds checkout does not discount are not advertised at all.
 *
 * Fully mocked — zero DB contact (needs `--experimental-test-module-mocks`).
 */

type Rule = {
  serviceId: string | null;
  serviceKind: string | null;
  discountPercent: number;
  appliesToBeneficiaries: boolean;
  service?: { slug: string; kind: string } | null;
};

type Service = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  basePriceCents: number | null;
  currencyCode: string | null;
};

const state: { rules: Rule[]; services: Service[] } = { rules: [], services: [] };

let svc: typeof import("./corporate-benefit.service.js");

before(async () => {
  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        corporateBenefitRule: { findMany: async () => state.rules },
        corporatePlanService: { findMany: async () => [] },
        service: {
          findMany: async (args: { select?: Record<string, unknown> }) =>
            // The pinned-label lookup selects only slug+name; the catalogue
            // sweep selects the priced columns. Same mock serves both.
            args.select && "basePriceCents" in args.select
              ? state.services
              : state.services.map((s) => ({ slug: s.slug, name: s.name })),
        },
      },
    },
  });
  svc = await import("./corporate-benefit.service.js");
});

beforeEach(() => {
  state.rules = [];
  state.services = [
    { id: "gp-1", slug: "gp", name: "GP consultation", kind: "GENERAL", basePriceCents: 5000, currencyCode: "EUR" },
    { id: "gp-2", slug: "gp-extended", name: "Extended GP", kind: "GENERAL", basePriceCents: 8000, currencyCode: "EUR" },
    { id: "sp-1", slug: "derm", name: "Dermatology", kind: "SPECIALIST", basePriceCents: 12000, currencyCode: "EUR" },
  ];
});

const load = (memberType: "EMPLOYEE" | "BENEFICIARY" = "EMPLOYEE", discountsActive = true) =>
  svc.resolveMemberBenefits({
    planId: "plan-1",
    countryCode: "ie",
    locale: "en",
    memberType,
    discountsActive,
  });

describe("resolveMemberBenefits — discounted public services", () => {
  it("prices every service of a discounted kind", async () => {
    state.rules = [
      { serviceId: null, serviceKind: "GENERAL", discountPercent: 10, appliesToBeneficiaries: true },
    ];
    const { discountedServices } = await load();
    assert.deepEqual(
      discountedServices.map((s) => [s.slug, s.memberPriceCents]),
      [
        ["gp", 4500],
        ["gp-extended", 7200],
      ],
    );
    assert.equal(discountedServices[0].bookPath, "/ie/en/book?service=gp");
  });

  it("lets a pinned-service rule beat the kind rule, as checkout does", async () => {
    state.rules = [
      { serviceId: null, serviceKind: "GENERAL", discountPercent: 10, appliesToBeneficiaries: true },
      {
        serviceId: "gp-2",
        serviceKind: null,
        discountPercent: 50,
        appliesToBeneficiaries: true,
        service: { slug: "gp-extended", kind: "GENERAL" },
      },
    ];
    const { discountedServices } = await load();
    const pinned = discountedServices.find((s) => s.slug === "gp-extended");
    assert.equal(pinned?.discountPercent, 50);
    assert.equal(pinned?.memberPriceCents, 4000);
    // The unpinned sibling still gets the kind rule.
    assert.equal(discountedServices.find((s) => s.slug === "gp")?.memberPriceCents, 4500);
  });

  it("hides from a beneficiary what the pricing engine would refuse them", async () => {
    state.rules = [
      { serviceId: null, serviceKind: "GENERAL", discountPercent: 10, appliesToBeneficiaries: false },
    ];
    assert.equal((await load("BENEFICIARY")).discountedServices.length, 0);
    assert.equal((await load("EMPLOYEE")).discountedServices.length, 2);
  });

  /** Mid-onboarding and suspended members are not priced by
   *  `resolveCorporateDiscount`, so quoting them a member price next to a Book
   *  link would promise a total checkout does not honour. The percentage
   *  summary stays — the page frames it as what onboarding unlocks. */
  it("quotes no member prices while the discount does not yet apply", async () => {
    state.rules = [
      { serviceId: null, serviceKind: "GENERAL", discountPercent: 10, appliesToBeneficiaries: true },
    ];
    const inactive = await load("EMPLOYEE", false);
    assert.deepEqual(inactive.discountedServices, []);
    assert.equal(inactive.discounts.length, 1);
    assert.equal((await load("EMPLOYEE", true)).discountedServices.length, 2);
  });

  it("never advertises a kind checkout does not discount", async () => {
    state.rules = [
      { serviceId: null, serviceKind: "PRESCRIPTION", discountPercent: 25, appliesToBeneficiaries: true },
    ];
    const result = await load();
    assert.deepEqual(result.discountedServices, []);
    assert.deepEqual(result.discounts, []);
  });

  it("skips a price-less service rather than printing a zero saving", async () => {
    state.services = [
      { id: "gp-1", slug: "gp", name: "GP", kind: "GENERAL", basePriceCents: null, currencyCode: "EUR" },
    ];
    state.rules = [
      { serviceId: null, serviceKind: "GENERAL", discountPercent: 10, appliesToBeneficiaries: true },
    ];
    assert.deepEqual((await load()).discountedServices, []);
  });

  it("returns nothing when the plan has no rules at all", async () => {
    assert.deepEqual((await load()).discountedServices, []);
  });
});
