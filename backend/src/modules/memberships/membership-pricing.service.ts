import type {
  MembershipBenefitType,
  MembershipEnrollmentStatus,
  MembershipFallbackType,
  ServiceKind,
} from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { percentDiscountAmountCents } from "../subscriptions/pricing-resolver.js";
import { holderEnrollmentId } from "./membership-card.service.js";

/**
 * Private-membership pricing (§6.2) — what one enrollment pays for one service.
 *
 * The decision is a pure function of data the caller has already loaded, so it
 * is exhaustively unit-testable and cannot accidentally re-read the DB from
 * inside a checkout transaction. `priceMembershipLine` is the thin I/O wrapper
 * that fetches the benefit row's allowance counter and calls it.
 *
 * Two rules carry the money and are easy to get subtly wrong:
 *
 *   - PERCENT applies to the PEAK-ADJUSTED price, and FIXED overrides peak
 *     entirely (§29), exactly as insurance does. The caller therefore passes
 *     the already-peak-resolved price as `fullPriceCents`.
 *   - The percent arithmetic reuses `percentDiscountAmountCents`, the same
 *     helper the corporate engine uses. Rounding the discount and subtracting
 *     is NOT the same as rounding the discounted price — at 110 with 15% off
 *     they differ by a cent — and two engines discounting the same line must
 *     never disagree. One implementation is the only way to guarantee that.
 *
 * PHASE 7 (§22) made a plan multi-country, and split one benefit row into two
 * roles that used to be the same row:
 *
 *   - the GOVERNING row is the booking country's own configuration. It decides
 *     whether there is a benefit here at all, and what the price is when no
 *     allowance unit is spent. It is what lands on `OrderItem`.
 *   - the POOL row owns the counter a unit comes off. Normally the PRIMARY
 *     country's ALLOWANCE row for the same service kind (§21.4), so a unit
 *     spends the same pool no matter which covered country the booking is in —
 *     unless a service-scoped ALLOWANCE row covers this exact service, which
 *     carries its own unshared counter. See `resolvePoolBenefit`.
 *
 * They are the same row when the governing row is itself the allowance one:
 * the booking is in the primary country under a kind-wide pool, or the row is
 * service-scoped. Everywhere else they differ, which is why `MembershipPrice`
 * carries both ids.
 *
 * Coverage is not configuration. A country with a `MembershipPlanCountry` row
 * but no benefit row governing this service gets NO benefit and NO unit (§20).
 * Units working in a country nobody configured would turn "an admin adds
 * Ireland" into a silent stream of free consultations priced against the
 * primary country's assumptions.
 */

/** How the member price was arrived at — for the UI note and the order audit. */
export type MembershipPriceBasis =
  | "ALLOWANCE"
  | "PERCENT"
  | "FIXED"
  | "FALLBACK_PERCENT"
  | "FALLBACK_FIXED";

export type MembershipPrice = {
  /**
   * The GOVERNING row — the booking country's own configuration. This is what
   * `OrderItem.membershipBenefitId` records (§21.5b), because per-country
   * reporting and the phase-6 override CHECKs both read that column.
   */
  benefitId: string;
  /**
   * The row whose COUNTER a unit comes off: this service's own service-scoped
   * ALLOWANCE row, else the primary country's ALLOWANCE row for its kind
   * (§21.4). Null when no pool applies. Equal to `benefitId` whenever the
   * governing row is itself the allowance one.
   */
  poolBenefitId: string | null;
  /** What the member pays. Never above `fullPriceCents` — see the clamp below. */
  unitPriceCents: number;
  /** `fullPriceCents - unitPriceCents`, for the OrderItem audit column. */
  discountCents: number;
  basis: MembershipPriceBasis;
  /** True when an allowance unit would pay for this line (price is then 0). */
  allowanceUsed: boolean;
  /**
   * Units left BEFORE this line spends one, whenever a pool applies (null when
   * none does). The "uses 1 of your N remaining" label reads this.
   */
  allowanceRemaining: number | null;
};

/** The benefit-row fields pricing needs. A subset, so tests can build one. */
export type PricingBenefitRow = {
  id: string;
  /** WHICH covered country this row configures (§21.3). */
  countryId: string;
  serviceKind: ServiceKind | null;
  serviceId: string | null;
  benefitType: MembershipBenefitType;
  allowanceCount: number | null;
  percentOff: number | null;
  fixedPriceCents: number | null;
  fallbackType: MembershipFallbackType;
  fallbackPercent: number | null;
  fallbackFixedCents: number | null;
  isActive: boolean;
};

/** The enrollment fields pricing needs. */
export type PricingEnrollment = {
  id: string;
  status: MembershipEnrollmentStatus;
  /**
   * The plan's primary country, stamped for reporting attribution (§21.5).
   * NOT a restriction on where benefits apply — that is `plan.countries`.
   */
  countryId: string;
  startDate: Date;
  endDate: Date | null;
  memberType: "PRIMARY" | "DEPENDENT";
  primaryEnrollmentId: string | null;
  plan: {
    /** Where the shared allowance pool is defined (§21.4, decision 37). */
    primaryCountryId: string;
    /** Every covered country, the primary included (§21.1). */
    countries: { countryId: string }[];
  };
  level: { allowancePool: "SHARED" | "PER_PERSON"; benefits: PricingBenefitRow[] };
};

export type PricingService = {
  id: string;
  countryId: string;
  kind: ServiceKind;
};

/** Consultations only (§18). Everything else gets no membership benefit. */
const BENEFIT_KINDS: ReadonlySet<ServiceKind> = new Set<ServiceKind>([
  "GENERAL",
  "SPECIALIST",
]);

/**
 * Is this enrollment granting benefits right now? Status AND term, checked
 * live: the daily expiry sweep (§5.4) is a convenience, so a missed run must
 * not be able to leak a benefit past its end date. A future `startDate` is
 * ACTIVE but grants nothing yet (§5.2).
 */
export function enrollmentGrantsBenefits(
  enrollment: Pick<PricingEnrollment, "status" | "startDate" | "endDate">,
  now: Date,
): boolean {
  if (enrollment.status !== "ACTIVE") return false;
  if (enrollment.startDate > now) return false;
  if (enrollment.endDate && enrollment.endDate < now) return false;
  return true;
}

/**
 * The benefit row that governs this service: among the rows configuring the
 * BOOKING's country, one pinned to the service beats one targeting its kind
 * (§6.2, §22). Inactive rows are ignored entirely — an admin deactivating a
 * row means "as if it were not there", which falls back to the kind rule
 * rather than to no benefit.
 *
 * Null means this country is not configured for this service, which is a full
 * "no benefit" — including no allowance unit (§20).
 */
export function selectBenefitRow(
  benefits: PricingBenefitRow[],
  service: PricingService,
): PricingBenefitRow | null {
  const active = benefits.filter((b) => b.isActive && b.countryId === service.countryId);
  return (
    active.find((b) => b.serviceId === service.id) ??
    active.find((b) => b.serviceId === null && b.serviceKind === service.kind) ??
    null
  );
}

/**
 * The row that owns the allowance counter this booking spends from. Two shapes,
 * in the same precedence order as `selectBenefitRow` — a rule for one service
 * always beats the rule for its type (§6.2):
 *
 *   1. a SERVICE-SCOPED ALLOWANCE row for exactly this service. Its pool is its
 *      own: a `Service` belongs to one country, so there is nothing to share and
 *      no cross-country mapping to get wrong. This is what "one free X" is.
 *   2. otherwise the KIND-wide pool: the PRIMARY country's ALLOWANCE row for
 *      this service kind (§21.4, decision 37). One pool, spendable in every
 *      configured covered country.
 *
 * Both are keyed on a benefit id exactly as in phase 1, so
 * `MembershipAllowanceBalance` needs no migration and every phase-5 idempotency
 * key and concurrency guarantee survives untouched.
 *
 * The kind-wide pool is still ALWAYS the primary's row, never the booking
 * country's own kind row: that would define a SECOND shared pool, which is
 * precisely what decision 36 says does not exist. A service-scoped row is the
 * one exception, and only because it is not shared at all.
 *
 * A service-scoped row therefore takes its service OUT of the shared pool — a
 * unit spent on it comes off its own counter, and the kind-wide units stay
 * whole. That is the same "service beats kind" answer the governing row gives.
 *
 * Null means this level has no allowance reaching this service; the booking
 * country's own percent/fixed rule applies alone.
 */
export function resolvePoolBenefit(
  enrollment: Pick<PricingEnrollment, "plan" | "level">,
  service: PricingService,
): PricingBenefitRow | null {
  const allowances = enrollment.level.benefits.filter(
    (b) => b.isActive && b.benefitType === "ALLOWANCE",
  );
  return (
    // `serviceId` is globally unique and the write path pins a service row to
    // its service's own country (`assertBenefitService`), so matching the id
    // alone cannot reach another country's row.
    allowances.find((b) => b.serviceId === service.id) ??
    allowances.find(
      (b) =>
        b.countryId === enrollment.plan.primaryCountryId &&
        b.serviceId === null &&
        b.serviceKind === service.kind,
    ) ??
    null
  );
}

/** Is this service's country one the plan covers at all (§21.1)? */
function isCoveredCountry(enrollment: PricingEnrollment, countryId: string): boolean {
  return enrollment.plan.countries.some((c) => c.countryId === countryId);
}

function percentPrice(fullPriceCents: number, percent: number | null): number | null {
  if (percent == null || percent <= 0) return null;
  return Math.max(0, fullPriceCents - percentDiscountAmountCents(fullPriceCents, percent));
}

/**
 * Price one line for one enrollment. Returns null for "no benefit applies" —
 * the caller then charges the full price. Never throws on bad configuration:
 * a benefit row missing the field its type requires yields no benefit, because
 * silently charging a wrong price is worse than charging the normal one.
 *
 * @param allowanceRemaining units left on the POOL row's counter for this
 *   holder and term (§21.4). Ignored when no pool applies.
 * @param declineUnit decision 44 — the member chose the booking country's own
 *   rule over spending a scarce visit. Selects WHICH RULE, never a price:
 *   everything below is still derived server-side.
 */
export function resolveMembershipPrice(args: {
  enrollment: PricingEnrollment;
  service: PricingService;
  /** Peak-adjusted price for the slot, or the base price when no slot is known. */
  fullPriceCents: number;
  allowanceRemaining?: number;
  declineUnit?: boolean;
  now?: Date;
}): MembershipPrice | null {
  const { enrollment, service, fullPriceCents } = args;
  const now = args.now ?? new Date();

  if (!enrollmentGrantsBenefits(enrollment, now)) return null;
  // Phase 7 inverts assumption 2: a plan covers several countries, so the test
  // is membership of the covered set rather than equality with the
  // enrollment's own (reporting) country. The composite FKs keep benefit rows
  // structurally inside that set; this is the check on the SERVICE side, which
  // they cannot cover.
  if (!isCoveredCountry(enrollment, service.countryId)) return null;
  if (!BENEFIT_KINDS.has(service.kind)) return null;

  const benefit = selectBenefitRow(enrollment.level.benefits, service);
  // Two distinct "no" answers, both of which must also suppress the shared
  // pool's unit — not just the discount:
  //
  //   - no row: the country is COVERED but not CONFIGURED for this service
  //     (§20). Coverage alone grants nothing.
  //   - EXCLUDED: a real answer, not a missing one. It exists to carve one
  //     service out of a kind-wide rule, and a pool defined in another country
  //     routing around it would make the row decorative (§22).
  if (!benefit || benefit.benefitType === "EXCLUDED") return null;

  const pool = resolvePoolBenefit(enrollment, service);
  const remaining = pool ? Math.max(0, args.allowanceRemaining ?? 0) : null;

  const finish = (
    priceCents: number,
    basis: MembershipPriceBasis,
    allowance: { used: boolean; remaining: number | null },
  ): MembershipPrice => {
    // A benefit may never cost more than declining it. FIXED overrides peak,
    // so on an off-peak slot a fixed price can land above the full price — and
    // a member choosing their own membership must never pay extra for holding
    // one. Clamping here covers the fallback-fixed path too.
    const unitPriceCents = Math.min(Math.max(0, Math.round(priceCents)), fullPriceCents);
    return {
      benefitId: benefit.id,
      poolBenefitId: pool?.id ?? null,
      unitPriceCents,
      discountCents: fullPriceCents - unitPriceCents,
      basis,
      allowanceUsed: allowance.used,
      allowanceRemaining: allowance.remaining,
    };
  };

  // An included visit covers the line outright, in any configured covered
  // country (decision 38) — unless the member deliberately declined it to save
  // a scarce unit, in which case the country's own rule prices the line and
  // nothing is spent (decision 44).
  if (remaining != null && remaining > 0 && !args.declineUnit) {
    return finish(0, "ALLOWANCE", { used: true, remaining });
  }

  const spent = { used: false, remaining };

  switch (benefit.benefitType) {
    case "PERCENT": {
      const price = percentPrice(fullPriceCents, benefit.percentOff);
      return price == null ? null : finish(price, "PERCENT", spent);
    }
    case "FIXED": {
      if (benefit.fixedPriceCents == null) return null;
      return finish(benefit.fixedPriceCents, "FIXED", spent);
    }
    case "ALLOWANCE": {
      // The governing row is itself an allowance one and no unit is being
      // spent — exhausted, declined, or no pool defined. Its own fallback
      // applies, then full price (§24).
      if (benefit.fallbackType === "PERCENT") {
        const price = percentPrice(fullPriceCents, benefit.fallbackPercent);
        return price == null ? null : finish(price, "FALLBACK_PERCENT", spent);
      }
      if (benefit.fallbackType === "FIXED") {
        if (benefit.fallbackFixedCents == null) return null;
        return finish(benefit.fallbackFixedCents, "FALLBACK_FIXED", spent);
      }
      return null;
    }
    default:
      return null;
  }
}

/** Everything `resolveMembershipPrice` reads off an enrollment. */
export const pricingEnrollmentSelect = {
  id: true,
  status: true,
  countryId: true,
  startDate: true,
  endDate: true,
  memberType: true,
  primaryEnrollmentId: true,
  membershipId: true,
  userId: true,
  plan: {
    select: {
      name: true,
      primaryCountryId: true,
      countries: { select: { countryId: true } },
      translations: { select: { locale: true, name: true } },
    },
  },
  level: {
    select: {
      name: true,
      allowancePool: true,
      cardBackgroundHex: true,
      translations: { select: { locale: true, name: true } },
      benefits: {
        select: {
          id: true,
          countryId: true,
          serviceKind: true,
          serviceId: true,
          benefitType: true,
          allowanceCount: true,
          percentOff: true,
          fixedPriceCents: true,
          fallbackType: true,
          fallbackPercent: true,
          fallbackFixedCents: true,
          isActive: true,
        },
      },
    },
  },
} as const;

/**
 * Units left on the POOL row's counter for this enrollment's holder and
 * CURRENT term. No row yet just means nothing has been spent — the counter is
 * created lazily on first use (§3.5) — so an absent row reads as the full
 * allocation. `termStart` is part of the key because a renewal creates a new
 * counter rather than resetting the old one.
 *
 * Takes the pool row (§21.4), never the governing one. Passing the booking
 * country's row here would silently split one shared pool into one counter per
 * country — the exact failure the primary-country-row design exists to avoid.
 */
export async function loadAllowanceRemaining(
  enrollment: PricingEnrollment,
  benefit: Pick<PricingBenefitRow, "id" | "benefitType" | "allowanceCount">,
): Promise<number> {
  if (benefit.benefitType !== "ALLOWANCE") return 0;
  const allocated = benefit.allowanceCount ?? 0;
  const balance = await prisma.membershipAllowanceBalance.findUnique({
    where: {
      benefitId_holderEnrollmentId_termStart: {
        benefitId: benefit.id,
        holderEnrollmentId: holderEnrollmentId({
          id: enrollment.id,
          memberType: enrollment.memberType,
          primaryEnrollmentId: enrollment.primaryEnrollmentId,
          level: enrollment.level,
        }),
        termStart: enrollment.startDate,
      },
    },
    select: { allocated: true, used: true },
  });
  if (!balance) return allocated;
  return Math.max(0, balance.allocated - balance.used);
}

/**
 * I/O wrapper: resolve the pool row, read its counter, and price the line.
 * Checkout (phase 5) calls the pure function directly inside its own
 * transaction instead, so the counter read and the conditional spend cannot
 * straddle a transaction boundary.
 */
export async function priceMembershipLine(args: {
  enrollment: PricingEnrollment;
  service: PricingService;
  fullPriceCents: number;
  declineUnit?: boolean;
  now?: Date;
}): Promise<MembershipPrice | null> {
  const { allowanceRemaining } = await loadPoolRemaining(args.enrollment, args.service);
  return resolveMembershipPrice({ ...args, allowanceRemaining });
}

/**
 * Both sides of decision 44 in one call: what the line costs if the member
 * spends a unit, and what it costs if they decline and take the booking
 * country's own rule. The options endpoint emits two options exactly when the
 * two differ and a unit is genuinely available.
 *
 * Both come from `resolveMembershipPrice`, so the pair can never encode a rule
 * the checkout would not reach the same way — the alternative, deriving the
 * "declined" price separately in the options service, is two implementations
 * of one price.
 */
export async function priceMembershipOptions(args: {
  enrollment: PricingEnrollment;
  service: PricingService;
  fullPriceCents: number;
  now?: Date;
}): Promise<{ withUnit: MembershipPrice | null; withoutUnit: MembershipPrice | null }> {
  const { allowanceRemaining, unitAvailable } = await loadPoolRemaining(
    args.enrollment,
    args.service,
  );
  const withUnit = resolveMembershipPrice({ ...args, allowanceRemaining });
  // No unit on offer means there is no second option to show — the single
  // result already IS the country's own rule.
  const withoutUnit = unitAvailable
    ? resolveMembershipPrice({ ...args, allowanceRemaining, declineUnit: true })
    : null;
  return { withUnit, withoutUnit };
}

/** The pool row's remaining units for this booking, and whether one is on offer. */
async function loadPoolRemaining(
  enrollment: PricingEnrollment,
  service: PricingService,
): Promise<{ allowanceRemaining: number; unitAvailable: boolean }> {
  const pool = resolvePoolBenefit(enrollment, service);
  if (!pool) return { allowanceRemaining: 0, unitAvailable: false };
  const allowanceRemaining = await loadAllowanceRemaining(enrollment, pool);
  return { allowanceRemaining, unitAvailable: allowanceRemaining > 0 };
}
