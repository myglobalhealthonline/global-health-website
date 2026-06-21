import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isPerkUnlocked,
  percentDiscountAmountCents,
  resolveConsultationPrice,
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

describe("resolveConsultationPrice priority (§21)", () => {
  it("no rule → NORMAL (base)", () => {
    const r = resolveConsultationPrice({
      rule: null,
      basePriceCents: 5000,
      creditsAvailable: 3,
      paidMonthsCount: 5,
    });
    assert.deepEqual(r, { mode: "NORMAL", unitPriceCents: 5000, creditsToReserve: 0 });
  });

  it("included + credit available → CREDIT €0, reserve creditsPerUse", () => {
    const r = resolveConsultationPrice({
      rule: rule({ isIncluded: true, usesCredits: true, creditsPerUse: 1 }),
      basePriceCents: 5000,
      creditsAvailable: 1,
      paidMonthsCount: 0,
    });
    assert.deepEqual(r, { mode: "CREDIT", unitPriceCents: 0, creditsToReserve: 1 });
  });

  it("included but NOT enough credits → falls through to discount/normal", () => {
    const r = resolveConsultationPrice({
      rule: rule({
        isIncluded: true,
        usesCredits: true,
        creditsPerUse: 2,
        discountMode: "PERCENT",
        discountPercent: 10,
      }),
      basePriceCents: 8000,
      creditsAvailable: 1,
      paidMonthsCount: 5,
    });
    assert.equal(r.mode, "PERCENT");
    assert.equal(r.unitPriceCents, 7200);
  });

  it("FIXED beats PERCENT (priority order)", () => {
    const r = resolveConsultationPrice({
      rule: rule({ discountMode: "FIXED", fixedPriceCents: 6000, discountPercent: 50 }),
      basePriceCents: 8000,
      creditsAvailable: 0,
      paidMonthsCount: 5,
    });
    assert.deepEqual(r, { mode: "FIXED", unitPriceCents: 6000, creditsToReserve: 0 });
  });

  it("FIXED never exceeds base", () => {
    const r = resolveConsultationPrice({
      rule: rule({ discountMode: "FIXED", fixedPriceCents: 9000 }),
      basePriceCents: 8000,
      creditsAvailable: 0,
      paidMonthsCount: 5,
    });
    assert.equal(r.unitPriceCents, 8000);
  });

  it("PERCENT applies rounded discount", () => {
    const r = resolveConsultationPrice({
      rule: rule({ discountMode: "PERCENT", discountPercent: 10 }),
      basePriceCents: 7999,
      creditsAvailable: 0,
      paidMonthsCount: 5,
    });
    // 7999 - round(799.9)=800 → 7199
    assert.deepEqual(r, { mode: "PERCENT", unitPriceCents: 7199, creditsToReserve: 0 });
  });

  it("rule gated below unlockAfterPaidMonths → NORMAL", () => {
    const r = resolveConsultationPrice({
      rule: rule({ discountMode: "PERCENT", discountPercent: 20, unlockAfterPaidMonths: 2 }),
      basePriceCents: 8000,
      creditsAvailable: 0,
      paidMonthsCount: 1,
    });
    assert.deepEqual(r, { mode: "NORMAL", unitPriceCents: 8000, creditsToReserve: 0 });
  });

  it("rule unlocks exactly at threshold", () => {
    const r = resolveConsultationPrice({
      rule: rule({ discountMode: "PERCENT", discountPercent: 20, unlockAfterPaidMonths: 2 }),
      basePriceCents: 8000,
      creditsAvailable: 0,
      paidMonthsCount: 2,
    });
    assert.equal(r.mode, "PERCENT");
    assert.equal(r.unitPriceCents, 6400);
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
