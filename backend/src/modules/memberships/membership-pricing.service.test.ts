import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  enrollmentGrantsBenefits,
  resolveMembershipPrice,
  selectBenefitRow,
  type PricingBenefitRow,
  type PricingEnrollment,
  type PricingService,
} from "./membership-pricing.service.js";

/**
 * §6.2 / §16.1 — the membership price resolver.
 *
 * Pure, so every combination is exercised without a database. The cases that
 * carry money are the rounding parity with the corporate engine, percent
 * applying to the peak-adjusted price while fixed overrides it, and the clamp
 * that stops a benefit ever costing more than declining it.
 */

const NOW = new Date("2026-08-07T12:00:00.000Z");

function benefit(over: Partial<PricingBenefitRow> = {}): PricingBenefitRow {
  return {
    id: "ben_1",
    serviceKind: "GENERAL",
    serviceId: null,
    benefitType: "PERCENT",
    allowanceCount: null,
    percentOff: 20,
    fixedPriceCents: null,
    fallbackType: "NONE",
    fallbackPercent: null,
    fallbackFixedCents: null,
    isActive: true,
    ...over,
  };
}

function enrollment(
  benefits: PricingBenefitRow[],
  over: Partial<PricingEnrollment> = {},
): PricingEnrollment {
  return {
    id: "enr_1",
    status: "ACTIVE",
    countryId: "ie",
    startDate: new Date("2026-01-01T00:00:00.000Z"),
    endDate: null,
    memberType: "PRIMARY",
    primaryEnrollmentId: null,
    ...over,
    level: { allowancePool: "PER_PERSON", benefits, ...(over.level ?? {}) },
  };
}

const SERVICE: PricingService = { id: "svc_1", countryId: "ie", kind: "GENERAL" };

describe("membership pricing — eligibility", () => {
  it("only ACTIVE enrollments grant benefits", () => {
    for (const status of ["PENDING", "SUSPENDED", "EXPIRED", "REMOVED"] as const) {
      assert.equal(
        resolveMembershipPrice({
          enrollment: enrollment([benefit()], { status }),
          service: SERVICE,
          fullPriceCents: 6000,
          now: NOW,
        }),
        null,
        `${status} must not price`,
      );
    }
  });

  it("a term that has not opened yet grants nothing, though the row is ACTIVE", () => {
    // §5.2: a future startDate links as ACTIVE (EXPIRED is terminal), so the
    // withholding has to happen here, at pricing time.
    const future = enrollment([benefit()], { startDate: new Date("2026-12-01T00:00:00.000Z") });
    assert.equal(enrollmentGrantsBenefits(future, NOW), false);
    assert.equal(
      resolveMembershipPrice({ enrollment: future, service: SERVICE, fullPriceCents: 6000, now: NOW }),
      null,
    );
  });

  it("a passed endDate grants nothing even if the expiry sweep has not run", () => {
    const ended = enrollment([benefit()], { endDate: new Date("2026-07-01T00:00:00.000Z") });
    assert.equal(
      resolveMembershipPrice({ enrollment: ended, service: SERVICE, fullPriceCents: 6000, now: NOW }),
      null,
    );
  });

  it("a service in another country gets no benefit (assumption 2)", () => {
    assert.equal(
      resolveMembershipPrice({
        enrollment: enrollment([benefit()]),
        service: { ...SERVICE, countryId: "pt" },
        fullPriceCents: 6000,
        now: NOW,
      }),
      null,
    );
  });

  it("non-consultation kinds get no benefit (§18)", () => {
    for (const kind of ["HEALTH_TEST", "PRESCRIPTION"] as const) {
      assert.equal(
        resolveMembershipPrice({
          enrollment: enrollment([benefit({ serviceKind: kind })]),
          service: { ...SERVICE, kind },
          fullPriceCents: 6000,
          now: NOW,
        }),
        null,
        `${kind} must not price`,
      );
    }
  });
});

describe("membership pricing — row selection", () => {
  const kindRow = benefit({ id: "kind", serviceKind: "GENERAL", percentOff: 10 });
  const serviceRow = benefit({
    id: "svc",
    serviceKind: null,
    serviceId: "svc_1",
    percentOff: 50,
  });

  it("a service row beats a kind row", () => {
    assert.equal(selectBenefitRow([kindRow, serviceRow], SERVICE)?.id, "svc");
    // Order-independent: the caller has no say in how Prisma returned them.
    assert.equal(selectBenefitRow([serviceRow, kindRow], SERVICE)?.id, "svc");
  });

  it("an EXCLUDED service row beats the kind rule and yields no benefit", () => {
    const excluded = benefit({
      id: "svc",
      serviceKind: null,
      serviceId: "svc_1",
      benefitType: "EXCLUDED",
      percentOff: null,
    });
    assert.equal(
      resolveMembershipPrice({
        enrollment: enrollment([kindRow, excluded]),
        service: SERVICE,
        fullPriceCents: 6000,
        now: NOW,
      }),
      null,
    );
  });

  it("an inactive service row falls back to the kind rule, not to nothing", () => {
    const inactive = { ...serviceRow, isActive: false };
    assert.equal(selectBenefitRow([kindRow, inactive], SERVICE)?.id, "kind");
  });

  it("a kind row for another kind does not apply", () => {
    assert.equal(
      selectBenefitRow([benefit({ serviceKind: "SPECIALIST" })], SERVICE),
      null,
    );
  });
});

describe("membership pricing — percent", () => {
  it("rounds the DISCOUNT, matching the corporate engine exactly", () => {
    // 110 at 15%: round(16.5) = 17 off → 93. Rounding the discounted PRICE
    // instead would give round(93.5) = 94. The two engines must never differ
    // by a cent on the same input, so this pins the corporate form (§6.2).
    const price = resolveMembershipPrice({
      enrollment: enrollment([benefit({ percentOff: 15 })]),
      service: SERVICE,
      fullPriceCents: 110,
      now: NOW,
    });
    assert.equal(price?.unitPriceCents, 93);
    assert.equal(price?.discountCents, 17);
    assert.equal(price?.basis, "PERCENT");
  });

  it("applies to the PEAK-adjusted price, not the base price (§29)", () => {
    // The caller passes the peak price; the same 20% off two different peak
    // prices has to produce two different member prices.
    const off = resolveMembershipPrice({
      enrollment: enrollment([benefit({ percentOff: 20 })]),
      service: SERVICE,
      fullPriceCents: 5000,
      now: NOW,
    });
    const peak = resolveMembershipPrice({
      enrollment: enrollment([benefit({ percentOff: 20 })]),
      service: SERVICE,
      fullPriceCents: 7500,
      now: NOW,
    });
    assert.equal(off?.unitPriceCents, 4000);
    assert.equal(peak?.unitPriceCents, 6000);
  });

  it("100% off is free, and a missing percent is no benefit rather than a crash", () => {
    assert.equal(
      resolveMembershipPrice({
        enrollment: enrollment([benefit({ percentOff: 100 })]),
        service: SERVICE,
        fullPriceCents: 6000,
        now: NOW,
      })?.unitPriceCents,
      0,
    );
    assert.equal(
      resolveMembershipPrice({
        enrollment: enrollment([benefit({ percentOff: null })]),
        service: SERVICE,
        fullPriceCents: 6000,
        now: NOW,
      }),
      null,
    );
  });
});

describe("membership pricing — fixed", () => {
  const fixed = benefit({ benefitType: "FIXED", percentOff: null, fixedPriceCents: 4500 });

  it("overrides peak: the same price at peak and off-peak", () => {
    const offPeak = resolveMembershipPrice({
      enrollment: enrollment([fixed]),
      service: SERVICE,
      fullPriceCents: 6000,
      now: NOW,
    });
    const atPeak = resolveMembershipPrice({
      enrollment: enrollment([fixed]),
      service: SERVICE,
      fullPriceCents: 9000,
      now: NOW,
    });
    assert.equal(offPeak?.unitPriceCents, 4500);
    assert.equal(atPeak?.unitPriceCents, 4500);
    assert.equal(atPeak?.discountCents, 4500);
  });

  it("is clamped to the full price — a benefit never costs more than declining it", () => {
    // A fixed €45 against a €40 off-peak slot would otherwise charge a member
    // MORE for holding a membership.
    const price = resolveMembershipPrice({
      enrollment: enrollment([fixed]),
      service: SERVICE,
      fullPriceCents: 4000,
      now: NOW,
    });
    assert.equal(price?.unitPriceCents, 4000);
    assert.equal(price?.discountCents, 0);
  });
});

describe("membership pricing — allowance", () => {
  const allowance = benefit({
    benefitType: "ALLOWANCE",
    percentOff: null,
    allowanceCount: 4,
  });

  it("a remaining unit makes the line free and reports what it costs", () => {
    const price = resolveMembershipPrice({
      enrollment: enrollment([allowance]),
      service: SERVICE,
      fullPriceCents: 6000,
      allowanceRemaining: 3,
      now: NOW,
    });
    assert.equal(price?.unitPriceCents, 0);
    assert.equal(price?.allowanceUsed, true);
    // Units left BEFORE this line spends one — the "uses 1 of your N" label.
    assert.equal(price?.allowanceRemaining, 3);
    assert.equal(price?.basis, "ALLOWANCE");
  });

  it("exhausted falls to a percent fallback (§24)", () => {
    const price = resolveMembershipPrice({
      enrollment: enrollment([
        { ...allowance, fallbackType: "PERCENT", fallbackPercent: 20 },
      ]),
      service: SERVICE,
      fullPriceCents: 6000,
      allowanceRemaining: 0,
      now: NOW,
    });
    assert.equal(price?.unitPriceCents, 4800);
    assert.equal(price?.allowanceUsed, false);
    assert.equal(price?.basis, "FALLBACK_PERCENT");
  });

  it("exhausted falls to a fixed fallback, clamped like any fixed price", () => {
    const row = { ...allowance, fallbackType: "FIXED" as const, fallbackFixedCents: 4500 };
    assert.equal(
      resolveMembershipPrice({
        enrollment: enrollment([row]),
        service: SERVICE,
        fullPriceCents: 6000,
        allowanceRemaining: 0,
        now: NOW,
      })?.unitPriceCents,
      4500,
    );
    assert.equal(
      resolveMembershipPrice({
        enrollment: enrollment([row]),
        service: SERVICE,
        fullPriceCents: 4000,
        allowanceRemaining: 0,
        now: NOW,
      })?.unitPriceCents,
      4000,
    );
  });

  it("exhausted with no fallback is full price, not free", () => {
    assert.equal(
      resolveMembershipPrice({
        enrollment: enrollment([allowance]),
        service: SERVICE,
        fullPriceCents: 6000,
        allowanceRemaining: 0,
        now: NOW,
      }),
      null,
    );
  });

  it("an absent allowance count reads as exhausted, never as free", () => {
    // Defensive: the caller passes `allowanceRemaining` and a missing one must
    // fail towards charging, not towards giving the consultation away.
    assert.equal(
      resolveMembershipPrice({
        enrollment: enrollment([allowance]),
        service: SERVICE,
        fullPriceCents: 6000,
        now: NOW,
      }),
      null,
    );
  });
});
