import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  eligibleBenefitSelections,
  isPerkUnlocked,
  percentDiscountAmountCents,
  resolveConsultationPrice,
  type BenefitSelection,
  type ResolvePriceInput,
} from "./pricing-resolver.js";
import type { SnapshotConsultationRule } from "./plan-snapshot.js";

function rule(
  overrides: Partial<SnapshotConsultationRule> = {},
): SnapshotConsultationRule {
  return {
    serviceId: "svc1",
    isIncluded: false,
    usesCredits: false,
    creditsPerUse: 1,
    discountMode: "NONE",
    discountPercent: null,
    fixedPriceCents: null,
    unlockAfterPaidMonths: 0,
    familyUsable: false,
    ...overrides,
  };
}

/** Build a resolver input with explicit selection + self-use defaults. */
function input(
  overrides: Partial<ResolvePriceInput> & { benefitSelection: BenefitSelection },
): ResolvePriceInput {
  return {
    rule: rule(),
    basePriceCents: 5000,
    creditsAvailable: 0,
    paidMonthsCount: 5,
    // Default 0 = plan-level gate off; per-test overrides exercise it.
    benefitsUnlockAfterPaidMonths: 0,
    familyEligible: true,
    ...overrides,
  };
}

describe("percentDiscountAmountCents (§38.3 round-half-up)", () => {
  it("rounds fractional cents half-up", () => {
    // 10% of 7999 = 799.9 → 800
    assert.equal(percentDiscountAmountCents(7999, 10), 800);
    // 10% of 7994 = 799.4 → 799
    assert.equal(percentDiscountAmountCents(7994, 10), 799);
    // exact .5 rounds up: 5% of 50 = 2.5 → 3
    assert.equal(percentDiscountAmountCents(50, 5), 3);
  });
  it("handles zero and whole results", () => {
    assert.equal(percentDiscountAmountCents(8000, 10), 800);
    assert.equal(percentDiscountAmountCents(0, 10), 0);
  });
});

describe("resolveConsultationPrice — explicit selection (§ appointment-claim)", () => {
  it("no rule → NORMAL / NOT_COVERED", () => {
    const r = resolveConsultationPrice(
      input({ rule: null, basePriceCents: 5000, creditsAvailable: 3, benefitSelection: "USE_PLAN_CREDIT" }),
    );
    assert.deepEqual(r, {
      mode: "NORMAL",
      unitPriceCents: 5000,
      creditsToReserve: 0,
      reason: "NOT_COVERED",
    });
  });

  it("PAY_NORMAL never consumes a credit even when a credit rule + credits exist", () => {
    const r = resolveConsultationPrice(
      input({
        rule: rule({ isIncluded: true, usesCredits: true, creditsPerUse: 1 }),
        creditsAvailable: 5,
        benefitSelection: "PAY_NORMAL",
      }),
    );
    assert.deepEqual(r, {
      mode: "NORMAL",
      unitPriceCents: 5000,
      creditsToReserve: 0,
      reason: "NOT_COVERED",
    });
  });

  it("USE_PLAN_CREDIT + includable + enough → CREDIT €0, reserve creditsPerUse", () => {
    const r = resolveConsultationPrice(
      input({
        rule: rule({ isIncluded: true, usesCredits: true, creditsPerUse: 1 }),
        creditsAvailable: 1,
        paidMonthsCount: 0,
        benefitSelection: "USE_PLAN_CREDIT",
      }),
    );
    assert.deepEqual(r, {
      mode: "CREDIT",
      unitPriceCents: 0,
      creditsToReserve: 1,
      reason: "COVERED",
    });
  });

  it("USE_PLAN_CREDIT + NOT enough credits → NORMAL / NOT_ENOUGH_CREDITS (never silently discounts, D7)", () => {
    const r = resolveConsultationPrice(
      input({
        rule: rule({
          isIncluded: true,
          usesCredits: true,
          creditsPerUse: 2,
          discountMode: "PERCENT",
          discountPercent: 10,
        }),
        basePriceCents: 8000,
        creditsAvailable: 1,
        benefitSelection: "USE_PLAN_CREDIT",
      }),
    );
    assert.equal(r.mode, "NORMAL");
    assert.equal(r.unitPriceCents, 8000);
    assert.equal(r.reason, "NOT_ENOUGH_CREDITS");
  });

  it("USE_PLAN_CREDIT on a non-credit rule → NORMAL / NOT_COVERED", () => {
    const r = resolveConsultationPrice(
      input({
        rule: rule({ discountMode: "PERCENT", discountPercent: 20 }),
        basePriceCents: 8000,
        benefitSelection: "USE_PLAN_CREDIT",
      }),
    );
    assert.equal(r.mode, "NORMAL");
    assert.equal(r.reason, "NOT_COVERED");
  });

  it("USE_PLAN_DISCOUNT: FIXED beats PERCENT", () => {
    const r = resolveConsultationPrice(
      input({
        rule: rule({ discountMode: "FIXED", fixedPriceCents: 6000, discountPercent: 50 }),
        basePriceCents: 8000,
        benefitSelection: "USE_PLAN_DISCOUNT",
      }),
    );
    assert.deepEqual(r, {
      mode: "FIXED",
      unitPriceCents: 6000,
      creditsToReserve: 0,
      reason: "COVERED",
    });
  });

  it("USE_PLAN_DISCOUNT: FIXED never exceeds base", () => {
    const r = resolveConsultationPrice(
      input({
        rule: rule({ discountMode: "FIXED", fixedPriceCents: 9000 }),
        basePriceCents: 8000,
        benefitSelection: "USE_PLAN_DISCOUNT",
      }),
    );
    assert.equal(r.unitPriceCents, 8000);
  });

  it("USE_PLAN_DISCOUNT: PERCENT applies rounded discount", () => {
    const r = resolveConsultationPrice(
      input({
        rule: rule({ discountMode: "PERCENT", discountPercent: 10 }),
        basePriceCents: 7999,
        benefitSelection: "USE_PLAN_DISCOUNT",
      }),
    );
    // 7999 - round(799.9)=800 → 7199
    assert.deepEqual(r, {
      mode: "PERCENT",
      unitPriceCents: 7199,
      creditsToReserve: 0,
      reason: "COVERED",
    });
  });

  it("USE_PLAN_DISCOUNT never takes a credit branch (specialist parity, req #7)", () => {
    const r = resolveConsultationPrice(
      input({
        rule: rule({
          isIncluded: true,
          usesCredits: true,
          creditsPerUse: 1,
          discountMode: "PERCENT",
          discountPercent: 20,
        }),
        creditsAvailable: 9,
        basePriceCents: 8000,
        benefitSelection: "USE_PLAN_DISCOUNT",
      }),
    );
    assert.equal(r.mode, "PERCENT");
    assert.equal(r.creditsToReserve, 0);
  });

  it("below unlockAfterPaidMonths → NORMAL / LOCKED", () => {
    const r = resolveConsultationPrice(
      input({
        rule: rule({ discountMode: "PERCENT", discountPercent: 20, unlockAfterPaidMonths: 2 }),
        basePriceCents: 8000,
        paidMonthsCount: 1,
        benefitSelection: "USE_PLAN_DISCOUNT",
      }),
    );
    assert.deepEqual(r, {
      mode: "NORMAL",
      unitPriceCents: 8000,
      creditsToReserve: 0,
      reason: "LOCKED",
    });
  });

  it("plan-level floor (D25) LOCKS a rule with unlock=0 until benefitsUnlock months", () => {
    const r = resolveConsultationPrice(
      input({
        rule: rule({ isIncluded: true, usesCredits: true, creditsPerUse: 1, unlockAfterPaidMonths: 0 }),
        creditsAvailable: 5,
        paidMonthsCount: 1,
        benefitsUnlockAfterPaidMonths: 2,
        benefitSelection: "USE_PLAN_CREDIT",
      }),
    );
    assert.equal(r.mode, "NORMAL");
    assert.equal(r.reason, "LOCKED");
  });

  it("unlocks exactly at threshold", () => {
    const r = resolveConsultationPrice(
      input({
        rule: rule({ discountMode: "PERCENT", discountPercent: 20, unlockAfterPaidMonths: 2 }),
        basePriceCents: 8000,
        paidMonthsCount: 2,
        benefitSelection: "USE_PLAN_DISCOUNT",
      }),
    );
    assert.equal(r.mode, "PERCENT");
    assert.equal(r.unitPriceCents, 6400);
  });

  it("family-ineligible line → NORMAL / FAMILY_UNAVAILABLE regardless of selection", () => {
    const r = resolveConsultationPrice(
      input({
        rule: rule({ isIncluded: true, usesCredits: true, creditsPerUse: 1 }),
        creditsAvailable: 5,
        familyEligible: false,
        benefitSelection: "USE_PLAN_CREDIT",
      }),
    );
    assert.equal(r.mode, "NORMAL");
    assert.equal(r.reason, "FAMILY_UNAVAILABLE");
    assert.equal(r.creditsToReserve, 0);
  });
});

describe("eligibleBenefitSelections", () => {
  it("PAY_NORMAL only when no rule", () => {
    assert.deepEqual(
      eligibleBenefitSelections({
        rule: null,
        paidMonthsCount: 5,
        benefitsUnlockAfterPaidMonths: 0,
        familyEligible: true,
      }),
      ["PAY_NORMAL"],
    );
  });
  it("PAY_NORMAL only when family-ineligible", () => {
    assert.deepEqual(
      eligibleBenefitSelections({
        rule: rule({ isIncluded: true, usesCredits: true, creditsPerUse: 1 }),
        paidMonthsCount: 5,
        benefitsUnlockAfterPaidMonths: 0,
        familyEligible: false,
      }),
      ["PAY_NORMAL"],
    );
  });
  it("credit rule → PAY_NORMAL + USE_PLAN_CREDIT", () => {
    assert.deepEqual(
      eligibleBenefitSelections({
        rule: rule({ isIncluded: true, usesCredits: true, creditsPerUse: 1 }),
        paidMonthsCount: 5,
        benefitsUnlockAfterPaidMonths: 0,
        familyEligible: true,
      }),
      ["PAY_NORMAL", "USE_PLAN_CREDIT"],
    );
  });
  it("discount rule → PAY_NORMAL + USE_PLAN_DISCOUNT", () => {
    assert.deepEqual(
      eligibleBenefitSelections({
        rule: rule({ discountMode: "FIXED", fixedPriceCents: 6000 }),
        paidMonthsCount: 5,
        benefitsUnlockAfterPaidMonths: 0,
        familyEligible: true,
      }),
      ["PAY_NORMAL", "USE_PLAN_DISCOUNT"],
    );
  });
  it("locked rule → PAY_NORMAL only", () => {
    assert.deepEqual(
      eligibleBenefitSelections({
        rule: rule({ isIncluded: true, usesCredits: true, creditsPerUse: 1, unlockAfterPaidMonths: 3 }),
        paidMonthsCount: 1,
        benefitsUnlockAfterPaidMonths: 0,
        familyEligible: true,
      }),
      ["PAY_NORMAL"],
    );
  });
  it("plan-level unlock floor (D25) hides credit/discount pre-unlock even when rule.unlock=0", () => {
    // Month 1 with benefitsUnlockAfterPaidMonths=2 → only PAY_NORMAL.
    assert.deepEqual(
      eligibleBenefitSelections({
        rule: rule({ isIncluded: true, usesCredits: true, creditsPerUse: 1 }),
        paidMonthsCount: 1,
        benefitsUnlockAfterPaidMonths: 2,
        familyEligible: true,
      }),
      ["PAY_NORMAL"],
    );
    // Month 2 → unlocked.
    assert.deepEqual(
      eligibleBenefitSelections({
        rule: rule({ isIncluded: true, usesCredits: true, creditsPerUse: 1 }),
        paidMonthsCount: 2,
        benefitsUnlockAfterPaidMonths: 2,
        familyEligible: true,
      }),
      ["PAY_NORMAL", "USE_PLAN_CREDIT"],
    );
  });
});

describe("isPerkUnlocked gate (§9)", () => {
  it("MONTH_1 always unlocked", () => {
    assert.equal(isPerkUnlocked({ unlockMode: "MONTH_1", unlockAfterPaidMonths: null }, 0), true);
  });
  it("AFTER_PAID_MONTHS gates on count", () => {
    assert.equal(isPerkUnlocked({ unlockMode: "AFTER_PAID_MONTHS", unlockAfterPaidMonths: 2 }, 1), false);
    assert.equal(isPerkUnlocked({ unlockMode: "AFTER_PAID_MONTHS", unlockAfterPaidMonths: 2 }, 2), true);
  });
  it("MANUAL_APPROVAL needs grant", () => {
    assert.equal(isPerkUnlocked({ unlockMode: "MANUAL_APPROVAL", unlockAfterPaidMonths: null }, 9, false), false);
    assert.equal(isPerkUnlocked({ unlockMode: "MANUAL_APPROVAL", unlockAfterPaidMonths: null }, 9, true), true);
  });
  it("NOT_AVAILABLE never unlocks", () => {
    assert.equal(isPerkUnlocked({ unlockMode: "NOT_AVAILABLE", unlockAfterPaidMonths: null }, 99), false);
  });
});
