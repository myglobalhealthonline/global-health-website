import { prisma } from "../../db/prisma.js";
import { resolveMembershipPrice } from "./membership-pricing.service.js";
import type {
  PricingBenefitRow,
  MembershipPriceBasis,
  PricingEnrollment,
  PricingService,
} from "./membership-pricing.service.js";

/**
 * The SUPER_ADMIN goodwill override (§11.7, decision 26) — applying a level's
 * benefit rule to a patient who is not entitled to it right now.
 *
 * It exists for the cases the ordinary resolver is built to refuse: an expired
 * or suspended member, a member whose allowance is spent, and the occasional
 * pure goodwill grant to someone on no plan at all. So it deliberately bypasses
 * `enrollmentGrantsBenefits` — that gate is the thing being overridden, and it
 * would otherwise read as a bug that this path ignores it.
 *
 * Everything else still goes through `resolveMembershipPrice`, by handing it a
 * synthetic ACTIVE enrollment carrying exactly the named benefit row and one
 * allowance unit. Override pricing and real pricing therefore cannot diverge,
 * and every rule the resolver enforces still applies for free:
 *
 *   - a row that does not govern this service (wrong kind, wrong service) yields
 *     no price, so a SPECIALIST rule cannot be pushed onto a GENERAL booking;
 *   - an inactive or EXCLUDED row yields no price;
 *   - a plan in another country yields no price;
 *   - the "never more than the full price" clamp still holds.
 *
 * Two things are override-specific:
 *
 *   - **No allowance unit is ever spent** (§11.7). The synthetic unit only makes
 *     an ALLOWANCE row resolve at its €0 member price, which is what "give them
 *     the member price" has to mean; falling through to the fallback discount
 *     would quietly make it mean something else. Nothing is written to the
 *     ledger, so ledger-derived totals can never be inflated by goodwill and an
 *     exhausted member does not go further negative.
 *   - **The real enrollment is still stamped when the patient holds one**, in
 *     any state short of REMOVED, because "which of their visits were overrides"
 *     is exactly what per-member reporting is asked. It is null only for a
 *     genuine grant to someone on no plan. `membershipOverrideReason` — not the
 *     absence of an enrollment id — is the sole discriminator between goodwill
 *     and real usage (§15).
 */

/** One row the override picker can offer, already priced for this booking. */
export type MembershipOverrideOption = {
  benefitId: string;
  planName: string;
  levelName: string;
  /** What the patient would be charged if this rule were applied. */
  unitPriceCents: number;
  discountCents: number;
  basis: MembershipPriceBasis;
  /** The patient's own enrollment on that plan, if any — the stamp on the line. */
  enrollmentId: string | null;
  /** True when the patient already holds this plan, so the UI can say so. */
  patientHoldsPlan: boolean;
};

export type MembershipOverrideResolution = {
  benefitId: string;
  /** The patient's own enrollment on that plan, whatever its state. */
  enrollmentId: string | null;
  unitPriceCents: number;
  discountCents: number;
  basis: MembershipPriceBasis;
};

export class MembershipOverrideError extends Error {}

/** Enrollment states that still count as "the patient holds one" (§11.7). */
const ATTRIBUTABLE_STATUSES = ["ACTIVE", "SUSPENDED", "EXPIRED", "PENDING"] as const;

/**
 * A synthetic holder for pricing ONE named benefit row: ACTIVE, in term
 * (`startDate` in the past), holding only that row and exactly one allowance
 * unit. The override is a goodwill grant to someone who may hold no enrollment
 * at all, so there is no real one to price from.
 *
 * Phase 7: the resolver now tests the SERVICE's country against the plan's
 * covered set rather than against a single enrollment country, so the synthetic
 * holder has to carry one. The row's own country is both the primary and the
 * only covered country — which keeps the override scoped to the service's
 * market exactly as before, and lets `resolvePoolBenefit` find the row when it
 * is an allowance one. Without this every override would resolve to "does not
 * apply to this service".
 */
function syntheticOverrideHolder(benefit: PricingBenefitRow): PricingEnrollment {
  return {
    id: "override",
    status: "ACTIVE",
    countryId: benefit.countryId,
    startDate: new Date(0),
    endDate: null,
    memberType: "PRIMARY",
    primaryEnrollmentId: null,
    plan: {
      primaryCountryId: benefit.countryId,
      countries: [{ countryId: benefit.countryId }],
    },
    level: { allowancePool: "PER_PERSON", benefits: [benefit] },
  };
}

/**
 * Every level rule a SUPER_ADMIN could apply to this booking, priced. Without
 * this the override would be a free-text benefit id, and the "derived from a
 * real configured benefit rather than a typed-in number" property of §11.7
 * would rest on the admin pasting the right cuid.
 *
 * Scoped to the service's own country, so the country rule the resolver
 * enforces can never be the thing an admin discovers by being refused.
 */
export async function listMembershipOverrideOptions(args: {
  service: PricingService;
  fullPriceCents: number;
  patientEmail: string;
  now?: Date;
}): Promise<MembershipOverrideOption[]> {
  const now = args.now ?? new Date();
  const candidates = await prisma.membershipBenefit.findMany({
    where: {
      countryId: args.service.countryId,
      isActive: true,
      benefitType: { not: "EXCLUDED" },
      level: { isActive: true, plan: { isActive: true } },
      OR: [
        { serviceId: args.service.id },
        { serviceId: null, serviceKind: args.service.kind },
      ],
    },
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
      level: {
        select: { name: true, planId: true, plan: { select: { name: true } } },
      },
    },
    orderBy: [{ level: { plan: { name: "asc" } } }, { level: { sortOrder: "asc" } }],
  });
  if (candidates.length === 0) return [];

  // Attribution for every candidate plan in one query, rather than the
  // per-benefit lookup `resolveMembershipOverride` does for its single row.
  const enrollments = await prisma.membershipEnrollment.findMany({
    where: {
      planId: { in: [...new Set(candidates.map((c) => c.level.planId))] },
      email: args.patientEmail.trim().toLowerCase(),
      status: { in: [...ATTRIBUTABLE_STATUSES] },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, planId: true, status: true },
  });
  const enrollmentByPlan = new Map<string, string>();
  for (const row of enrollments) {
    const held = enrollmentByPlan.get(row.planId);
    // Same preference as the single-row path: ACTIVE wins, else most recent.
    if (!held || row.status === "ACTIVE") enrollmentByPlan.set(row.planId, row.id);
  }

  const options: MembershipOverrideOption[] = [];
  for (const candidate of candidates) {
    const { level, ...benefitRow } = candidate;
    const price = resolveMembershipPrice({
      enrollment: syntheticOverrideHolder(benefitRow),
      service: args.service,
      fullPriceCents: args.fullPriceCents,
      allowanceRemaining: 1,
      now,
    });
    // A row that prices to nothing here would also be refused at booking, so
    // offering it would only produce a 422 later.
    if (!price) continue;
    const enrollmentId = enrollmentByPlan.get(level.planId) ?? null;
    options.push({
      benefitId: price.benefitId,
      planName: level.plan.name,
      levelName: level.name,
      unitPriceCents: price.unitPriceCents,
      discountCents: price.discountCents,
      basis: price.basis,
      enrollmentId,
      patientHoldsPlan: enrollmentId != null,
    });
  }
  return options;
}

export async function resolveMembershipOverride(args: {
  benefitId: string;
  service: PricingService;
  /** Peak-resolved price for the slot — what the patient would otherwise pay. */
  fullPriceCents: number;
  /** Patient's email; lowercased here, the linking key everywhere (§5). */
  patientEmail: string;
  now?: Date;
}): Promise<MembershipOverrideResolution> {
  const now = args.now ?? new Date();

  const benefit = await prisma.membershipBenefit.findUnique({
    where: { id: args.benefitId },
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
      level: { select: { planId: true } },
    },
  });
  if (!benefit) {
    throw new MembershipOverrideError("That membership benefit no longer exists");
  }
  // Called out rather than left to the resolver, which drops inactive rows
  // silently and would report this as "does not apply to this service".
  if (!benefit.isActive) {
    throw new MembershipOverrideError("That membership benefit is no longer active");
  }

  const { level, ...benefitRow } = benefit;
  const syntheticEnrollment = syntheticOverrideHolder(benefitRow);

  const price = resolveMembershipPrice({
    enrollment: syntheticEnrollment,
    service: args.service,
    fullPriceCents: args.fullPriceCents,
    allowanceRemaining: 1,
    now,
  });
  if (!price) {
    throw new MembershipOverrideError(
      "That benefit does not apply to this service — check its country, service kind and target",
    );
  }

  // Attribution only: this lookup never affects the price, so a patient with no
  // account and no enrollment overrides exactly like one who has both.
  const candidates = await prisma.membershipEnrollment.findMany({
    where: {
      planId: level.planId,
      email: args.patientEmail.trim().toLowerCase(),
      status: { in: [...ATTRIBUTABLE_STATUSES] },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true },
  });
  // An ACTIVE row is the truest attribution when several exist; otherwise the
  // most recent, which is the one an admin is looking at. Picked here rather
  // than with an `orderBy` on status, which would sort by the enum's declared
  // order (PENDING first) and quietly prefer the wrong row.
  const enrollment = candidates.find((row) => row.status === "ACTIVE") ?? candidates[0] ?? null;

  return {
    benefitId: price.benefitId,
    enrollmentId: enrollment?.id ?? null,
    unitPriceCents: price.unitPriceCents,
    discountCents: price.discountCents,
    basis: price.basis,
  };
}
