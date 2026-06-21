import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminPlanCreateBodySchema,
  adminConsultationRuleBodySchema,
  adminPerkRuleBodySchema,
  adminHealthTestRuleBodySchema,
  adminAdjustCreditsBodySchema,
} from "./admin-plans.schema.js";

const planBase = {
  countryId: "c-ie",
  slug: "essential-care",
  name: "Essential Care",
  monthlyPriceCents: 2000,
  currencyCode: "eur",
};

describe("adminPlanCreateBodySchema", () => {
  it("accepts a minimal valid plan and uppercases currency + applies defaults", () => {
    const parsed = adminPlanCreateBodySchema.parse(planBase);
    assert.equal(parsed.currencyCode, "EUR");
    assert.equal(parsed.billingInterval, "MONTHLY");
    assert.equal(parsed.vatMode, "EXEMPT");
    assert.equal(parsed.monthlyConsultationCredits, 0);
    assert.equal(parsed.familyEnabled, false);
  });

  it("rejects negative consultation credits", () => {
    const result = adminPlanCreateBodySchema.safeParse({
      ...planBase,
      monthlyConsultationCredits: -1,
    });
    assert.equal(result.success, false);
  });

  it("rejects negative wellness credits", () => {
    const result = adminPlanCreateBodySchema.safeParse({
      ...planBase,
      wellnessCreditsPerMonth: -2,
    });
    assert.equal(result.success, false);
  });

  it("requires vatRatePct when vatMode is STANDARD", () => {
    const missing = adminPlanCreateBodySchema.safeParse({ ...planBase, vatMode: "STANDARD" });
    assert.equal(missing.success, false);
    const ok = adminPlanCreateBodySchema.safeParse({ ...planBase, vatMode: "STANDARD", vatRatePct: 23 });
    assert.equal(ok.success, true);
  });

  it("rejects an uppercase/invalid slug", () => {
    const result = adminPlanCreateBodySchema.safeParse({ ...planBase, slug: "Essential Care" });
    assert.equal(result.success, false);
  });
});

describe("adminConsultationRuleBodySchema", () => {
  it("accepts a NONE-discount included rule", () => {
    const parsed = adminConsultationRuleBodySchema.parse({
      serviceId: "svc-gp",
      isIncluded: true,
      usesCredits: true,
    });
    assert.equal(parsed.creditsPerUse, 1);
    assert.equal(parsed.discountMode, "NONE");
  });

  it("requires discountPercent when discountMode is PERCENT", () => {
    const result = adminConsultationRuleBodySchema.safeParse({
      serviceId: "svc-spec",
      discountMode: "PERCENT",
    });
    assert.equal(result.success, false);
  });

  it("requires fixedPriceCents when discountMode is FIXED", () => {
    const result = adminConsultationRuleBodySchema.safeParse({
      serviceId: "svc-spec",
      discountMode: "FIXED",
    });
    assert.equal(result.success, false);
  });

  it("rejects creditsPerUse below 1", () => {
    const result = adminConsultationRuleBodySchema.safeParse({ serviceId: "x", creditsPerUse: 0 });
    assert.equal(result.success, false);
  });
});

describe("adminPerkRuleBodySchema", () => {
  it("requires unlockAfterPaidMonths when mode is AFTER_PAID_MONTHS", () => {
    const bad = adminPerkRuleBodySchema.safeParse({
      perkKey: "SPECIALIST_DISCOUNT",
      unlockMode: "AFTER_PAID_MONTHS",
    });
    assert.equal(bad.success, false);
    const ok = adminPerkRuleBodySchema.safeParse({
      perkKey: "SPECIALIST_DISCOUNT",
      unlockMode: "AFTER_PAID_MONTHS",
      unlockAfterPaidMonths: 2,
    });
    assert.equal(ok.success, true);
  });

  it("accepts MONTH_1 without months", () => {
    const ok = adminPerkRuleBodySchema.parse({ perkKey: "FAMILY_USAGE" });
    assert.equal(ok.unlockMode, "MONTH_1");
  });
});

describe("adminHealthTestRuleBodySchema", () => {
  it("rejects requiredWellnessCredits below 1", () => {
    const result = adminHealthTestRuleBodySchema.safeParse({
      healthTestId: "ht-1",
      requiredWellnessCredits: 0,
    });
    assert.equal(result.success, false);
  });
});

describe("adminAdjustCreditsBodySchema", () => {
  it("rejects a zero delta", () => {
    const result = adminAdjustCreditsBodySchema.safeParse({
      kind: "CONSULTATION",
      delta: 0,
      requestId: "req-1",
    });
    assert.equal(result.success, false);
  });

  it("accepts a signed delta with a requestId", () => {
    const parsed = adminAdjustCreditsBodySchema.parse({
      kind: "WELLNESS",
      delta: -3,
      requestId: "req-2",
    });
    assert.equal(parsed.reason, "ADJUSTMENT");
    assert.equal(parsed.delta, -3);
  });
});
