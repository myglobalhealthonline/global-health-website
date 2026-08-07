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
 */

/** How the member price was arrived at — for the UI note and the order audit. */
export type MembershipPriceBasis =
  | "ALLOWANCE"
  | "PERCENT"
  | "FIXED"
  | "FALLBACK_PERCENT"
  | "FALLBACK_FIXED";

export type MembershipPrice = {
  benefitId: string;
  /** What the member pays. Never above `fullPriceCents` — see the clamp below. */
  unitPriceCents: number;
  /** `fullPriceCents - unitPriceCents`, for the OrderItem audit column. */
  discountCents: number;
  basis: MembershipPriceBasis;
  /** True when an allowance unit would pay for this line (price is then 0). */
  allowanceUsed: boolean;
  /**
   * Units left BEFORE this line spends one, for ALLOWANCE rows (null
   * otherwise). The "uses 1 of your N remaining" label reads this.
   */
  allowanceRemaining: number | null;
};

/** The benefit-row fields pricing needs. A subset, so tests can build one. */
export type PricingBenefitRow = {
  id: string;
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
  countryId: string;
  startDate: Date;
  endDate: Date | null;
  memberType: "PRIMARY" | "DEPENDENT";
  primaryEnrollmentId: string | null;
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
 * The benefit row that governs this service: a row pinned to the service beats
 * a row targeting its kind (§6.2). Inactive rows are ignored entirely — an
 * admin deactivating a row means "as if it were not there", which falls back to
 * the kind rule rather than to no benefit.
 */
export function selectBenefitRow(
  benefits: PricingBenefitRow[],
  service: PricingService,
): PricingBenefitRow | null {
  const active = benefits.filter((b) => b.isActive);
  return (
    active.find((b) => b.serviceId === service.id) ??
    active.find((b) => b.serviceId === null && b.serviceKind === service.kind) ??
    null
  );
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
 * @param allowanceRemaining units left on the governing benefit's counter for
 *   this holder and term. Ignored unless the row is ALLOWANCE.
 */
export function resolveMembershipPrice(args: {
  enrollment: PricingEnrollment;
  service: PricingService;
  /** Peak-adjusted price for the slot, or the base price when no slot is known. */
  fullPriceCents: number;
  allowanceRemaining?: number;
  now?: Date;
}): MembershipPrice | null {
  const { enrollment, service, fullPriceCents } = args;
  const now = args.now ?? new Date();

  if (!enrollmentGrantsBenefits(enrollment, now)) return null;
  // Assumption 2: a member booking outside their plan's country gets nothing.
  // The composite FKs make the level/benefit rows structurally same-country;
  // this is the check on the SERVICE side, which they cannot cover.
  if (service.countryId !== enrollment.countryId) return null;
  if (!BENEFIT_KINDS.has(service.kind)) return null;

  const benefit = selectBenefitRow(enrollment.level.benefits, service);
  // EXCLUDED is a real answer, not a missing one: it exists to carve one
  // service out of a kind-wide rule, so it must stop here rather than fall
  // through to the kind row.
  if (!benefit || benefit.benefitType === "EXCLUDED") return null;

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
      unitPriceCents,
      discountCents: fullPriceCents - unitPriceCents,
      basis,
      allowanceUsed: allowance.used,
      allowanceRemaining: allowance.remaining,
    };
  };

  const noAllowance = { used: false, remaining: null };

  switch (benefit.benefitType) {
    case "PERCENT": {
      const price = percentPrice(fullPriceCents, benefit.percentOff);
      return price == null ? null : finish(price, "PERCENT", noAllowance);
    }
    case "FIXED": {
      if (benefit.fixedPriceCents == null) return null;
      return finish(benefit.fixedPriceCents, "FIXED", noAllowance);
    }
    case "ALLOWANCE": {
      const remaining = Math.max(0, args.allowanceRemaining ?? 0);
      if (remaining > 0) {
        return finish(0, "ALLOWANCE", { used: true, remaining });
      }
      // Exhausted → the row's own fallback, then full price (§24).
      const spent = { used: false, remaining: 0 };
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
  plan: { select: { name: true, translations: { select: { locale: true, name: true } } } },
  level: {
    select: {
      name: true,
      allowancePool: true,
      translations: { select: { locale: true, name: true } },
      benefits: {
        select: {
          id: true,
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
 * Units left on a benefit's counter for this enrollment's holder and CURRENT
 * term. No row yet just means nothing has been spent — the counter is created
 * lazily on first use (§3.5) — so an absent row reads as the full allocation.
 * `termStart` is part of the key because a renewal creates a new counter
 * rather than resetting the old one.
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
 * I/O wrapper: resolve the benefit row, read its counter if it is an allowance
 * one, and price the line. Checkout (phase 5) calls the pure function directly
 * inside its own transaction instead, so the counter read and the conditional
 * spend cannot straddle a transaction boundary.
 */
export async function priceMembershipLine(args: {
  enrollment: PricingEnrollment;
  service: PricingService;
  fullPriceCents: number;
  now?: Date;
}): Promise<MembershipPrice | null> {
  const benefit = selectBenefitRow(args.enrollment.level.benefits, args.service);
  const allowanceRemaining = benefit
    ? await loadAllowanceRemaining(args.enrollment, benefit)
    : 0;
  return resolveMembershipPrice({ ...args, allowanceRemaining });
}
