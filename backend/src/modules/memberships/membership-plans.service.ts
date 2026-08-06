import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import type {
  AdminMembershipBenefitBody,
  AdminMembershipLevelCreateBody,
  AdminMembershipLevelUpdateBody,
  AdminMembershipPlanCreateBody,
  AdminMembershipPlanUpdateBody,
} from "../../validations/admin-membership-plans.schema.js";

/**
 * Plan / level / benefit configuration for private membership plans
 * (docs/plans/private-membership-plans-implementation.md §3, §4).
 *
 * Everything here is SUPER_ADMIN-gated at the route. This module owns the
 * checks that need a database lookup; the pure shape rules live in
 * `validations/admin-membership-plans.schema.ts`, and the same invariants are
 * additionally enforced by CHECK constraints in the migration, so a bad row
 * cannot arrive through a script either.
 */

export class MembershipCountryNotFoundError extends Error {
  constructor() {
    super("Country not found");
    this.name = "MembershipCountryNotFoundError";
  }
}

/**
 * §6.6. In a commission market `computeOrderCommission` derives the commission
 * as `lineTotal − doctorPayout`, so any membership line priced below the payout
 * (every €0 allowance line, and plenty of discounted ones) clamps to zero and
 * fires a critical ops alert per line. Ireland has the flag off, so launch is
 * unaffected — but the interaction has to be designed before a commission
 * market gets memberships, and until then the API refuses to create the plan.
 */
export class MembershipCommissionCountryError extends Error {
  constructor() {
    super(
      "Membership plans are not yet supported in commission-model countries — the commission and fiscal-receipt interaction is undesigned",
    );
    this.name = "MembershipCommissionCountryError";
  }
}

export class MembershipPlanNotFoundError extends Error {
  constructor() {
    super("Membership plan not found");
    this.name = "MembershipPlanNotFoundError";
  }
}

export class MembershipLevelNotFoundError extends Error {
  constructor() {
    super("Membership level not found");
    this.name = "MembershipLevelNotFoundError";
  }
}

export class MembershipBenefitNotFoundError extends Error {
  constructor() {
    super("Membership benefit not found");
    this.name = "MembershipBenefitNotFoundError";
  }
}

/** A level with enrollments (of any status, including REMOVED) is history. */
export class MembershipLevelInUseError extends Error {
  constructor() {
    super("This level still has enrollments — deactivate it instead of deleting");
    this.name = "MembershipLevelInUseError";
  }
}

/** Every plan keeps at least one level, and exactly one of them is the default. */
export class MembershipLastLevelError extends Error {
  constructor() {
    super("A plan must keep at least one level");
    this.name = "MembershipLastLevelError";
  }
}

export class MembershipLevelFamilyError extends Error {
  constructor() {
    super("maxDependents requires familyEnabled");
    this.name = "MembershipLevelFamilyError";
  }
}

/** The named service is in another country, or is not a consultation (§18). */
export class MembershipBenefitServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MembershipBenefitServiceError";
  }
}

const planListInclude = {
  country: { select: { id: true, code: true, name: true } },
  translations: { select: { locale: true, name: true }, orderBy: { locale: "asc" as const } },
  _count: { select: { levels: true, enrollments: true } },
} satisfies Prisma.MembershipPlanInclude;

const planDetailInclude = {
  country: { select: { id: true, code: true, name: true } },
  translations: { orderBy: { locale: "asc" as const } },
  levels: {
    orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
    include: {
      translations: { orderBy: { locale: "asc" as const } },
      _count: { select: { benefits: true, enrollments: true } },
    },
  },
  _count: { select: { enrollments: true } },
} satisfies Prisma.MembershipPlanInclude;

const benefitInclude = {
  service: { select: { id: true, name: true, slug: true, kind: true, basePriceCents: true, currencyCode: true } },
} satisfies Prisma.MembershipBenefitInclude;

export async function listMembershipPlans(query: {
  countryId?: string;
  includeInactive?: boolean;
}) {
  try {
    return await prisma.membershipPlan.findMany({
      where: {
        ...(query.countryId ? { countryId: query.countryId } : {}),
        ...(query.includeInactive ? {} : { isActive: true }),
      },
      include: planListInclude,
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });
  } catch (error) {
    throw normalizeDbError(error, "Membership plans are unavailable");
  }
}

export async function getMembershipPlanById(planId: string) {
  try {
    return await prisma.membershipPlan.findUnique({
      where: { id: planId },
      include: planDetailInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Membership plans are unavailable");
  }
}

/**
 * Creates the plan and its implicit default level in one transaction
 * (decision 2 — a plan without tiers still needs somewhere to hang benefits,
 * and the import needs a level to fall back on when the CSV has no `level`
 * column). Admins can rename it or add siblings afterwards.
 */
export async function createMembershipPlan(body: AdminMembershipPlanCreateBody) {
  const country = await prisma.country.findUnique({
    where: { id: body.countryId },
    select: { id: true, commissionReceiptEnabled: true },
  });
  if (!country) throw new MembershipCountryNotFoundError();
  if (country.commissionReceiptEnabled) throw new MembershipCommissionCountryError();

  try {
    return await prisma.$transaction(async (tx) => {
      const plan = await tx.membershipPlan.create({
        data: {
          countryId: body.countryId,
          slug: body.slug,
          name: body.name,
          internalNotes: body.internalNotes,
          isActive: body.isActive,
          payerName: body.payerName,
          payerEmail: body.payerEmail,
          payerPhone: body.payerPhone,
          payerAmountCents: body.payerAmountCents ?? null,
          payerCurrency: body.payerCurrency,
          payerNotes: body.payerNotes,
        },
      });
      await tx.membershipLevel.create({
        data: {
          planId: plan.id,
          countryId: plan.countryId,
          slug: "standard",
          name: "Standard",
          isDefault: true,
        },
      });
      return tx.membershipPlan.findUniqueOrThrow({
        where: { id: plan.id },
        include: planDetailInclude,
      });
    });
  } catch (error) {
    throw normalizeDbError(error, "Membership plans are unavailable");
  }
}

export async function updateMembershipPlan(planId: string, body: AdminMembershipPlanUpdateBody) {
  const existing = await prisma.membershipPlan.findUnique({
    where: { id: planId },
    select: { id: true },
  });
  if (!existing) throw new MembershipPlanNotFoundError();

  try {
    await prisma.membershipPlan.update({ where: { id: planId }, data: body });
    return await prisma.membershipPlan.findUniqueOrThrow({
      where: { id: planId },
      include: planDetailInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Membership plans are unavailable");
  }
}

/**
 * Soft stop. Deactivating leaves every enrollment row intact — §17: suspension
 * and expiry affect new bookings only, and removal is soft. Pricing re-checks
 * the plan's `isActive` live, so nothing already booked changes price.
 */
export async function deactivateMembershipPlan(planId: string) {
  const existing = await prisma.membershipPlan.findUnique({
    where: { id: planId },
    select: { id: true },
  });
  if (!existing) throw new MembershipPlanNotFoundError();
  try {
    return await prisma.membershipPlan.update({
      where: { id: planId },
      data: { isActive: false },
      include: planDetailInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Membership plans are unavailable");
  }
}

// ─── Levels ──────────────────────────────────────────────────────────────────

export async function createMembershipLevel(planId: string, body: AdminMembershipLevelCreateBody) {
  const plan = await prisma.membershipPlan.findUnique({
    where: { id: planId },
    select: { id: true, countryId: true },
  });
  if (!plan) throw new MembershipPlanNotFoundError();

  try {
    // countryId is copied from the plan, never taken from the request — the
    // composite FK would reject a mismatch anyway, but this keeps the caller
    // from having to know the rule.
    return await prisma.membershipLevel.create({
      data: {
        planId: plan.id,
        countryId: plan.countryId,
        slug: body.slug,
        name: body.name,
        sortOrder: body.sortOrder,
        isActive: body.isActive,
        familyEnabled: body.familyEnabled,
        maxDependents: body.maxDependents,
        allowancePool: body.allowancePool,
      },
      include: { translations: true, _count: { select: { benefits: true, enrollments: true } } },
    });
  } catch (error) {
    throw normalizeDbError(error, "Membership levels are unavailable");
  }
}

export async function updateMembershipLevel(levelId: string, body: AdminMembershipLevelUpdateBody) {
  const existing = await prisma.membershipLevel.findUnique({
    where: { id: levelId },
    select: { id: true, familyEnabled: true, maxDependents: true },
  });
  if (!existing) throw new MembershipLevelNotFoundError();

  // The Zod refine cannot see fields the request omitted, so re-check the rule
  // against the merged row: raising maxDependents without also enabling family
  // (or disabling family while dependents are still allowed) must both fail.
  const familyEnabled = body.familyEnabled ?? existing.familyEnabled;
  const maxDependents = body.maxDependents ?? existing.maxDependents;
  if (maxDependents > 0 && !familyEnabled) throw new MembershipLevelFamilyError();

  try {
    return await prisma.membershipLevel.update({
      where: { id: levelId },
      data: body,
      include: { translations: true, _count: { select: { benefits: true, enrollments: true } } },
    });
  } catch (error) {
    throw normalizeDbError(error, "Membership levels are unavailable");
  }
}

/**
 * Hard delete, allowed only while the level has never been used. Anything with
 * enrollments — including REMOVED ones, which are history rather than deletions
 * — must be deactivated instead, so the audit trail and any allowance ledger
 * hanging off it survive.
 */
export async function deleteMembershipLevel(levelId: string) {
  const level = await prisma.membershipLevel.findUnique({
    where: { id: levelId },
    select: { id: true, planId: true, isDefault: true, _count: { select: { enrollments: true } } },
  });
  if (!level) throw new MembershipLevelNotFoundError();
  if (level._count.enrollments > 0) throw new MembershipLevelInUseError();

  const siblings = await prisma.membershipLevel.count({ where: { planId: level.planId } });
  if (siblings <= 1) throw new MembershipLastLevelError();

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.membershipLevel.delete({ where: { id: levelId } });
      if (level.isDefault) {
        // The partial unique index enforces "at most one default"; it cannot
        // enforce "at least one". Promote the next level so the import always
        // has a fallback target.
        const next = await tx.membershipLevel.findFirst({
          where: { planId: level.planId },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          select: { id: true },
        });
        if (next) {
          await tx.membershipLevel.update({ where: { id: next.id }, data: { isDefault: true } });
        }
      }
      return { id: levelId };
    });
  } catch (error) {
    throw normalizeDbError(error, "Membership levels are unavailable");
  }
}

// ─── Benefits ────────────────────────────────────────────────────────────────

export async function listMembershipBenefits(levelId: string) {
  const level = await prisma.membershipLevel.findUnique({
    where: { id: levelId },
    select: { id: true },
  });
  if (!level) throw new MembershipLevelNotFoundError();
  try {
    return await prisma.membershipBenefit.findMany({
      where: { levelId },
      include: benefitInclude,
      orderBy: [{ serviceKind: "asc" }, { createdAt: "asc" }],
    });
  } catch (error) {
    throw normalizeDbError(error, "Membership benefits are unavailable");
  }
}

/**
 * The service-targeting rules that need a lookup: the service must live in the
 * level's country and be a consultation. The composite FK covers the country
 * half at the storage layer; this returns a 400 with a usable message instead
 * of a foreign-key error.
 */
async function assertBenefitService(countryId: string, serviceId: string | null): Promise<void> {
  if (!serviceId) return;
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { id: true, countryId: true, kind: true },
  });
  if (!service) throw new MembershipBenefitServiceError("Service not found");
  if (service.countryId !== countryId) {
    throw new MembershipBenefitServiceError("Service belongs to a different country than this plan");
  }
  if (service.kind !== "GENERAL" && service.kind !== "SPECIALIST") {
    throw new MembershipBenefitServiceError(
      "Membership benefits cover consultations only (general or specialist)",
    );
  }
}

function benefitData(body: AdminMembershipBenefitBody) {
  // Null out the columns the chosen type does not use, so a row edited from
  // ALLOWANCE to PERCENT does not keep a stale allowanceCount that the pricing
  // resolver might later read.
  return {
    serviceKind: body.serviceKind ?? null,
    serviceId: body.serviceId ?? null,
    benefitType: body.benefitType,
    allowanceCount: body.benefitType === "ALLOWANCE" ? (body.allowanceCount ?? null) : null,
    percentOff: body.benefitType === "PERCENT" ? (body.percentOff ?? null) : null,
    fixedPriceCents: body.benefitType === "FIXED" ? (body.fixedPriceCents ?? null) : null,
    fallbackType: body.fallbackType,
    fallbackPercent: body.fallbackType === "PERCENT" ? (body.fallbackPercent ?? null) : null,
    fallbackFixedCents: body.fallbackType === "FIXED" ? (body.fallbackFixedCents ?? null) : null,
    isActive: body.isActive,
  };
}

export async function createMembershipBenefit(levelId: string, body: AdminMembershipBenefitBody) {
  const level = await prisma.membershipLevel.findUnique({
    where: { id: levelId },
    select: { id: true, countryId: true },
  });
  if (!level) throw new MembershipLevelNotFoundError();
  await assertBenefitService(level.countryId, body.serviceId ?? null);

  try {
    return await prisma.membershipBenefit.create({
      data: { levelId: level.id, countryId: level.countryId, ...benefitData(body) },
      include: benefitInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Membership benefits are unavailable");
  }
}

export async function updateMembershipBenefit(benefitId: string, body: AdminMembershipBenefitBody) {
  const existing = await prisma.membershipBenefit.findUnique({
    where: { id: benefitId },
    select: { id: true, countryId: true },
  });
  if (!existing) throw new MembershipBenefitNotFoundError();
  await assertBenefitService(existing.countryId, body.serviceId ?? null);

  try {
    return await prisma.membershipBenefit.update({
      where: { id: benefitId },
      data: benefitData(body),
      include: benefitInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Membership benefits are unavailable");
  }
}

export async function deleteMembershipBenefit(benefitId: string) {
  const existing = await prisma.membershipBenefit.findUnique({
    where: { id: benefitId },
    select: { id: true },
  });
  if (!existing) throw new MembershipBenefitNotFoundError();
  try {
    await prisma.membershipBenefit.delete({ where: { id: benefitId } });
    return { id: benefitId };
  } catch (error) {
    throw normalizeDbError(error, "Membership benefits are unavailable");
  }
}

/** Resolves the plan a level belongs to — used by the route for audit context. */
export async function getLevelPlanId(levelId: string): Promise<string | null> {
  const level = await prisma.membershipLevel.findUnique({
    where: { id: levelId },
    select: { planId: true },
  });
  return level?.planId ?? null;
}
