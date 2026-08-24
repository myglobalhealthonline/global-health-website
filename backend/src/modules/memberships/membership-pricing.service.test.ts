import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  enrollmentGrantsBenefits,
  resolveMembershipPrice,
  resolvePoolBenefit,
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
    countryId: "ie",
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
    plan: { primaryCountryId: "ie", countries: [{ countryId: "ie" }], ...(over.plan ?? {}) },
    level: { allowancePool: "PER_PERSON", benefits, ...(over.level ?? {}) },
  };
}

/** A plan whose primary is Ireland and which also covers Czechia (§21.1). */
function multiCountry(over: Partial<PricingEnrollment["plan"]> = {}): PricingEnrollment["plan"] {
  return {
    primaryCountryId: "ie",
    countries: [{ countryId: "ie" }, { countryId: "cz" }],
    ...over,
  };
}

const SERVICE: PricingService = { id: "svc_1", countryId: "ie", kind: "GENERAL" };
const CZ_SERVICE: PricingService = { id: "svc_cz", countryId: "cz", kind: "GENERAL" };

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

/**
 * §27 — phase 7. A plan covers several countries, benefits are configured per
 * country, and one shared pool defined on the PRIMARY country's row is
 * spendable in every configured covered country.
 *
 * The cases that carry money here are the two "no" answers. Both must suppress
 * the UNIT as well as the discount, or a pool defined in one country quietly
 * pays for consultations in a country that was never configured for it.
 */
describe("membership pricing — multi-country coverage", () => {
  const iePercent = benefit({ id: "ben_ie", countryId: "ie", percentOff: 20 });
  const czPercent = benefit({ id: "ben_cz", countryId: "cz", percentOff: 50 });

  it("a benefit resolves in a non-primary covered country, on THAT country's rule", () => {
    const price = resolveMembershipPrice({
      enrollment: enrollment([iePercent, czPercent], { plan: multiCountry() }),
      service: CZ_SERVICE,
      fullPriceCents: 6000,
      now: NOW,
    });
    // Czechia's own 50%, not Ireland's 20% — the booking country governs.
    assert.equal(price?.unitPriceCents, 3000);
    assert.equal(price?.benefitId, "ben_cz");
  });

  it("a country the plan does not cover gets nothing, even with a row for it", () => {
    // The row exists but the coverage row does not. Coverage is the gate.
    assert.equal(
      resolveMembershipPrice({
        enrollment: enrollment([iePercent, czPercent], {
          plan: { primaryCountryId: "ie", countries: [{ countryId: "ie" }] },
        }),
        service: CZ_SERVICE,
        fullPriceCents: 6000,
        now: NOW,
      }),
      null,
    );
  });

  it("a COVERED country with no benefit rows gets nothing — coverage is not configuration", () => {
    assert.equal(
      resolveMembershipPrice({
        enrollment: enrollment([iePercent], { plan: multiCountry() }),
        service: CZ_SERVICE,
        fullPriceCents: 6000,
        now: NOW,
      }),
      null,
    );
  });

  it("a percent applies to the booking country's PEAK price, not the base one", () => {
    const price = resolveMembershipPrice({
      enrollment: enrollment([iePercent, czPercent], { plan: multiCountry() }),
      service: CZ_SERVICE,
      fullPriceCents: 8000, // peak-adjusted by the caller
      now: NOW,
    });
    assert.equal(price?.unitPriceCents, 4000);
  });

  it("a fixed price is the booking country's own figure, in its own currency", () => {
    // No conversion anywhere (§39): the CZ row's 800 is 800 CZK-worth of cents
    // and is never compared against, or converted from, Ireland's euro row.
    const price = resolveMembershipPrice({
      enrollment: enrollment(
        [
          benefit({ id: "ben_ie", countryId: "ie", benefitType: "FIXED", percentOff: null, fixedPriceCents: 4500 }),
          benefit({ id: "ben_cz", countryId: "cz", benefitType: "FIXED", percentOff: null, fixedPriceCents: 80000 }),
        ],
        { plan: multiCountry() },
      ),
      service: CZ_SERVICE,
      fullPriceCents: 120000,
      now: NOW,
    });
    assert.equal(price?.unitPriceCents, 80000);
    assert.equal(price?.benefitId, "ben_cz");
  });
});

describe("membership pricing — the shared pool", () => {
  const iePool = benefit({
    id: "pool_ie",
    countryId: "ie",
    benefitType: "ALLOWANCE",
    percentOff: null,
    allowanceCount: 6,
  });
  const czPercent = benefit({ id: "ben_cz", countryId: "cz", percentOff: 50 });
  const holder = (benefits: PricingBenefitRow[]) =>
    enrollment(benefits, { plan: multiCountry() });

  it("resolves the pool from the PRIMARY country's row, whatever country is booked", () => {
    assert.equal(resolvePoolBenefit(holder([iePool, czPercent]), CZ_SERVICE)?.id, "pool_ie");
  });

  it("returns null for a kind with no primary allowance", () => {
    const czSpecialist: PricingService = { id: "svc_cz_spec", countryId: "cz", kind: "SPECIALIST" };
    assert.equal(resolvePoolBenefit(holder([iePool, czPercent]), czSpecialist), null);
  });

  it("never treats a NON-primary allowance row as a pool — one pool, not one per country", () => {
    const czPool = benefit({
      id: "pool_cz",
      countryId: "cz",
      benefitType: "ALLOWANCE",
      percentOff: null,
      allowanceCount: 99,
    });
    assert.equal(resolvePoolBenefit(holder([czPool]), CZ_SERVICE), null);
  });

  it("a unit spends in a non-primary country and reports the PRIMARY row as the pool", () => {
    const price = resolveMembershipPrice({
      enrollment: holder([iePool, czPercent]),
      service: CZ_SERVICE,
      fullPriceCents: 6000,
      allowanceRemaining: 2,
      now: NOW,
    });
    assert.equal(price?.unitPriceCents, 0);
    assert.equal(price?.allowanceUsed, true);
    assert.equal(price?.poolBenefitId, "pool_ie", "the counter is the primary country's");
    // …while the row recorded on the OrderItem is the governing one (§21.5b).
    assert.equal(price?.benefitId, "ben_cz");
  });

  it("an exhausted pool falls to the BOOKING country's own rule", () => {
    const price = resolveMembershipPrice({
      enrollment: holder([iePool, czPercent]),
      service: CZ_SERVICE,
      fullPriceCents: 6000,
      allowanceRemaining: 0,
      now: NOW,
    });
    assert.equal(price?.unitPriceCents, 3000);
    assert.equal(price?.basis, "PERCENT");
    assert.equal(price?.allowanceUsed, false);
  });

  it("declining the unit prices the country's rule and spends nothing (decision 44)", () => {
    const price = resolveMembershipPrice({
      enrollment: holder([iePool, czPercent]),
      service: CZ_SERVICE,
      fullPriceCents: 6000,
      allowanceRemaining: 2,
      declineUnit: true,
      now: NOW,
    });
    assert.equal(price?.unitPriceCents, 3000);
    assert.equal(price?.allowanceUsed, false, "a declined unit is not spent");
    assert.equal(price?.allowanceRemaining, 2, "and the counter is untouched");
  });

  it("EXCLUDED in the booking country suppresses the unit too, not just the discount", () => {
    // Otherwise a pool defined in Ireland routes around the one row whose
    // entire job is carving a service out of Czechia's rule.
    const czExcluded = benefit({
      id: "ben_cz_excl",
      countryId: "cz",
      serviceKind: null,
      serviceId: CZ_SERVICE.id,
      benefitType: "EXCLUDED",
      percentOff: null,
    });
    assert.equal(
      resolveMembershipPrice({
        enrollment: holder([iePool, czPercent, czExcluded]),
        service: CZ_SERVICE,
        fullPriceCents: 6000,
        allowanceRemaining: 5,
        now: NOW,
      }),
      null,
    );
  });

  it("an unconfigured covered country cannot spend a unit either", () => {
    assert.equal(
      resolveMembershipPrice({
        enrollment: holder([iePool]),
        service: CZ_SERVICE,
        fullPriceCents: 6000,
        allowanceRemaining: 5,
        now: NOW,
      }),
      null,
    );
  });
});

/**
 * "One free X" — an ALLOWANCE pinned to a single service.
 *
 * The shared kind-wide pool cannot express it: its counter is the primary
 * country's and is spendable on every service of that kind in every covered
 * country. A service-scoped row carries its OWN counter, which is sound because
 * a `Service` belongs to exactly one country — nothing is shared, so there is
 * no cross-country mapping to get wrong.
 *
 * The cases that carry money here are the precedence (a service row's pool
 * beats the kind pool for its own service) and the containment (it does NOT
 * become the pool for a sibling service of the same kind).
 */
describe("membership pricing — a service-scoped allowance", () => {
  const CZ_SIBLING: PricingService = { id: "svc_cz_2", countryId: "cz", kind: "GENERAL" };
  const iePool = benefit({
    id: "pool_ie",
    countryId: "ie",
    benefitType: "ALLOWANCE",
    percentOff: null,
    allowanceCount: 6,
  });
  const czPercent = benefit({ id: "ben_cz", countryId: "cz", percentOff: 50 });
  /** One free CZ_SERVICE — in a NON-primary country, which is the whole point. */
  const czOneFree = benefit({
    id: "pool_svc",
    countryId: "cz",
    serviceKind: null,
    serviceId: CZ_SERVICE.id,
    benefitType: "ALLOWANCE",
    percentOff: null,
    allowanceCount: 1,
  });
  const holder = (benefits: PricingBenefitRow[]) =>
    enrollment(benefits, { plan: multiCountry() });

  it("is its own pool, in a country that is not the primary", () => {
    assert.equal(resolvePoolBenefit(holder([czOneFree]), CZ_SERVICE)?.id, "pool_svc");
  });

  it("beats the kind-wide pool for its own service (§6.2)", () => {
    assert.equal(
      resolvePoolBenefit(holder([iePool, czPercent, czOneFree]), CZ_SERVICE)?.id,
      "pool_svc",
    );
  });

  it("does not become the pool for a sibling service of the same kind", () => {
    assert.equal(
      resolvePoolBenefit(holder([iePool, czPercent, czOneFree]), CZ_SIBLING)?.id,
      "pool_ie",
      "the sibling still draws on the shared kind pool",
    );
  });

  it("prices the free visit at zero and counts it against its own row", () => {
    const price = resolveMembershipPrice({
      enrollment: holder([iePool, czPercent, czOneFree]),
      service: CZ_SERVICE,
      fullPriceCents: 6000,
      allowanceRemaining: 1,
      now: NOW,
    });
    assert.equal(price?.unitPriceCents, 0);
    assert.equal(price?.allowanceUsed, true);
    assert.equal(price?.poolBenefitId, "pool_svc", "not the shared kind pool");
    // Governing and pool are the same row here, so the OrderItem audits the
    // service row rather than the country's kind rule.
    assert.equal(price?.benefitId, "pool_svc");
  });

  it("charges full price once its single unit is gone, with no fallback set", () => {
    assert.equal(
      resolveMembershipPrice({
        enrollment: holder([iePool, czPercent, czOneFree]),
        service: CZ_SERVICE,
        fullPriceCents: 6000,
        allowanceRemaining: 0,
        now: NOW,
      }),
      null,
      "the service row governs, so Czechia's 50% kind rule does NOT apply",
    );
  });

  it("takes its own fallback once exhausted, not the kind rule", () => {
    const price = resolveMembershipPrice({
      enrollment: holder([iePool, czPercent, { ...czOneFree, fallbackType: "PERCENT", fallbackPercent: 10 }]),
      service: CZ_SERVICE,
      fullPriceCents: 6000,
      allowanceRemaining: 0,
      now: NOW,
    });
    assert.equal(price?.unitPriceCents, 5400);
    assert.equal(price?.basis, "FALLBACK_PERCENT");
  });
});
