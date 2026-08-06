import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminMembershipBenefitCreateBodySchema,
  adminMembershipLevelCreateBodySchema,
  adminMembershipPlanCreateBodySchema,
  membershipSlugSchema,
} from "./admin-membership-plans.schema.js";

/**
 * The §3.3 / §13.1 invariants at the API boundary. These are the same rules the
 * migration enforces with CHECK constraints — a bad benefit row has to fail
 * twice — but the DB error is a 500-shaped constraint violation, so these
 * refinements are what turn it into a usable 400.
 *
 * Pure schema parsing, no database.
 */

const benefit = (over: Record<string, unknown> = {}) => ({
  serviceKind: "GENERAL",
  benefitType: "PERCENT",
  percentOff: 20,
  ...over,
});

describe("membership slug", () => {
  it("accepts a lowercase hyphenated slug", () => {
    assert.equal(membershipSlugSchema.parse("  mems-ireland  "), "mems-ireland");
  });

  it("rejects uppercase, spaces, and a single character", () => {
    for (const bad of ["MEMS", "mems ireland", "m", "mems--ireland", "-mems"]) {
      assert.equal(membershipSlugSchema.safeParse(bad).success, false, bad);
    }
  });
});

describe("membership plan create", () => {
  it("keeps payer metadata optional and normalises blanks to null (§15)", () => {
    const parsed = adminMembershipPlanCreateBodySchema.parse({
      countryId: "c-1",
      slug: "mems-ireland",
      name: "MEMS Ireland",
      payerName: "",
      payerNotes: "   ",
    });
    assert.equal(parsed.payerName, null);
    assert.equal(parsed.payerNotes, null);
    assert.equal(parsed.payerAmountCents ?? null, null);
    assert.equal(parsed.isActive, true);
  });

  it("uppercases a payer currency", () => {
    const parsed = adminMembershipPlanCreateBodySchema.parse({
      countryId: "c-1",
      slug: "mems-ireland",
      name: "MEMS Ireland",
      payerCurrency: "eur",
    });
    assert.equal(parsed.payerCurrency, "EUR");
  });

  it("rejects a malformed payer email", () => {
    const result = adminMembershipPlanCreateBodySchema.safeParse({
      countryId: "c-1",
      slug: "mems-ireland",
      name: "MEMS Ireland",
      payerEmail: "not-an-email",
    });
    assert.equal(result.success, false);
  });
});

describe("membership level create", () => {
  it("defaults to a non-family PER_PERSON level", () => {
    const parsed = adminMembershipLevelCreateBodySchema.parse({ slug: "gold", name: "Gold" });
    assert.equal(parsed.familyEnabled, false);
    assert.equal(parsed.maxDependents, 0);
    assert.equal(parsed.allowancePool, "PER_PERSON");
  });

  it("rejects maxDependents without familyEnabled (§13.1)", () => {
    const result = adminMembershipLevelCreateBodySchema.safeParse({
      slug: "gold",
      name: "Gold",
      maxDependents: 3,
    });
    assert.equal(result.success, false);
  });

  it("accepts dependents when family is enabled", () => {
    const parsed = adminMembershipLevelCreateBodySchema.parse({
      slug: "gold",
      name: "Gold",
      familyEnabled: true,
      maxDependents: 3,
      allowancePool: "SHARED",
    });
    assert.equal(parsed.maxDependents, 3);
    assert.equal(parsed.allowancePool, "SHARED");
  });

  it("caps maxDependents at 20", () => {
    const result = adminMembershipLevelCreateBodySchema.safeParse({
      slug: "gold",
      name: "Gold",
      familyEnabled: true,
      maxDependents: 21,
    });
    assert.equal(result.success, false);
  });
});

describe("membership benefit target (§3.3)", () => {
  it("accepts a service-kind row", () => {
    assert.equal(adminMembershipBenefitCreateBodySchema.safeParse(benefit()).success, true);
  });

  it("accepts a specific-service row", () => {
    const result = adminMembershipBenefitCreateBodySchema.safeParse(
      benefit({ serviceKind: null, serviceId: "svc-1" }),
    );
    assert.equal(result.success, true);
  });

  it("rejects a row targeting both a kind and a service", () => {
    const result = adminMembershipBenefitCreateBodySchema.safeParse(
      benefit({ serviceId: "svc-1" }),
    );
    assert.equal(result.success, false);
  });

  it("rejects a row targeting neither", () => {
    const result = adminMembershipBenefitCreateBodySchema.safeParse(
      benefit({ serviceKind: null }),
    );
    assert.equal(result.success, false);
  });

  it("rejects a non-consultation service kind (§18)", () => {
    for (const kind of ["HEALTH_TEST", "PRESCRIPTION", "HOME_DELIVERY", "ASYNC_PRESCRIPTION"]) {
      const result = adminMembershipBenefitCreateBodySchema.safeParse(benefit({ serviceKind: kind }));
      assert.equal(result.success, false, kind);
    }
  });
});

describe("membership benefit value (§3.3)", () => {
  it("requires allowanceCount on an ALLOWANCE row", () => {
    const result = adminMembershipBenefitCreateBodySchema.safeParse(
      benefit({ benefitType: "ALLOWANCE", percentOff: null }),
    );
    assert.equal(result.success, false);
  });

  it("requires percentOff on a PERCENT row", () => {
    const result = adminMembershipBenefitCreateBodySchema.safeParse(
      benefit({ percentOff: null }),
    );
    assert.equal(result.success, false);
  });

  it("requires fixedPriceCents on a FIXED row", () => {
    const result = adminMembershipBenefitCreateBodySchema.safeParse(
      benefit({ benefitType: "FIXED", percentOff: null }),
    );
    assert.equal(result.success, false);
  });

  it("rejects a percent of 0 or over 100", () => {
    for (const pct of [0, -5, 100.5, 120]) {
      const result = adminMembershipBenefitCreateBodySchema.safeParse(benefit({ percentOff: pct }));
      assert.equal(result.success, false, String(pct));
    }
  });

  it("accepts exactly 100 percent off", () => {
    assert.equal(
      adminMembershipBenefitCreateBodySchema.safeParse(benefit({ percentOff: 100 })).success,
      true,
    );
  });

  it("accepts an EXCLUDED row with no value at all", () => {
    const result = adminMembershipBenefitCreateBodySchema.safeParse(
      benefit({ benefitType: "EXCLUDED", percentOff: null }),
    );
    assert.equal(result.success, true);
  });

  it("bounds allowanceCount to 1..999", () => {
    for (const count of [0, -1, 1000]) {
      const result = adminMembershipBenefitCreateBodySchema.safeParse(
        benefit({ benefitType: "ALLOWANCE", percentOff: null, allowanceCount: count }),
      );
      assert.equal(result.success, false, String(count));
    }
  });
});

describe("membership benefit fallback (§24)", () => {
  it("accepts an allowance with a percent fallback", () => {
    const result = adminMembershipBenefitCreateBodySchema.safeParse(
      benefit({
        benefitType: "ALLOWANCE",
        percentOff: null,
        allowanceCount: 4,
        fallbackType: "PERCENT",
        fallbackPercent: 20,
      }),
    );
    assert.equal(result.success, true);
  });

  it("rejects a fallback on a non-allowance benefit", () => {
    const result = adminMembershipBenefitCreateBodySchema.safeParse(
      benefit({ fallbackType: "PERCENT", fallbackPercent: 10 }),
    );
    assert.equal(result.success, false);
  });

  it("rejects a PERCENT fallback with no percent", () => {
    const result = adminMembershipBenefitCreateBodySchema.safeParse(
      benefit({
        benefitType: "ALLOWANCE",
        percentOff: null,
        allowanceCount: 4,
        fallbackType: "PERCENT",
      }),
    );
    assert.equal(result.success, false);
  });

  it("rejects a FIXED fallback with no amount", () => {
    const result = adminMembershipBenefitCreateBodySchema.safeParse(
      benefit({
        benefitType: "ALLOWANCE",
        percentOff: null,
        allowanceCount: 4,
        fallbackType: "FIXED",
      }),
    );
    assert.equal(result.success, false);
  });

  it("defaults fallbackType to NONE", () => {
    const parsed = adminMembershipBenefitCreateBodySchema.parse(benefit());
    assert.equal(parsed.fallbackType, "NONE");
  });
});
