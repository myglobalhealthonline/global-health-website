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

/**
 * Anything wrong with a plan's covered-country list (§26): removing the
 * primary, adding a country twice, or configuring one the plan does not cover.
 */
export class MembershipPlanCountryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MembershipPlanCountryError";
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
  primaryCountry: { select: { id: true, code: true, name: true } },
  translations: { select: { locale: true, name: true }, orderBy: { locale: "asc" as const } },
  _count: { select: { levels: true, enrollments: true } },
} satisfies Prisma.MembershipPlanInclude;

const planDetailInclude = {
  primaryCountry: { select: { id: true, code: true, name: true } },
  /**
   * Every covered country, primary included (§21.1). Coverage is not
   * configuration: a country listed here with no benefit rows gives members
   * nothing (§20), which is why the level editor badges it (§26).
   */
  countries: {
    select: { countryId: true, country: { select: { id: true, code: true, name: true } } },
    orderBy: { createdAt: "asc" as const },
  },
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
        // "Plans for this country" now means plans that COVER it, not plans
        // whose PRIMARY it is — otherwise a Czech-primary plan covering
        // Ireland would be invisible on the Irish admin list, which is the
        // whole point of decision 34.
        //
        // Note the spread hides this from `tsc`: the object widens, so a stale
        // `countryId` here would have type-checked and thrown at runtime.
        ...(query.countryId ? { countries: { some: { countryId: query.countryId } } } : {}),
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
          primaryCountryId: body.countryId,
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
      // The primary country's coverage row, created with the plan and never
      // deletable while it lives (§21.1). Benefit rows point at this table, so
      // without it the plan could not be configured for its own country.
      await tx.membershipPlanCountry.create({
        data: { planId: plan.id, countryId: plan.primaryCountryId },
      });
      await tx.membershipLevel.create({
        data: {
          planId: plan.id,
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

// ─── Covered countries (§26) ─────────────────────────────────────────────────

/**
 * Add a covered country to a live plan (decision 34).
 *
 * **Immediate and free:** every existing member of the plan gains benefits in
 * that country the moment the row lands, with no per-member action — an
 * admin-visible cost event, which is why the form says so before the call.
 *
 * Coverage is still not configuration. Until benefit rows exist for the new
 * country, members get nothing there (§20) — the level editor badges exactly
 * that state, and `copyPrimaryKindRules` is the one-click way out of it.
 *
 * Commission markets are refused for the same reason plan creation refuses them
 * (§6.6, open item 3): a €0 allowance line in a commission country clamps the
 * commission to zero and fires a per-line ops alert. Adding the country is the
 * other door into that, and it was open.
 */
export async function addPlanCountry(planId: string, countryId: string) {
  const plan = await prisma.membershipPlan.findUnique({
    where: { id: planId },
    select: { id: true, primaryCountryId: true },
  });
  if (!plan) throw new MembershipPlanNotFoundError();

  const country = await prisma.country.findUnique({
    where: { id: countryId },
    select: { id: true, commissionReceiptEnabled: true },
  });
  if (!country) throw new MembershipCountryNotFoundError();
  if (country.commissionReceiptEnabled) throw new MembershipCommissionCountryError();

  const existing = await prisma.membershipPlanCountry.findUnique({
    where: { planId_countryId: { planId, countryId } },
    select: { id: true },
  });
  if (existing) throw new MembershipPlanCountryError("This plan already covers that country");

  try {
    await prisma.membershipPlanCountry.create({ data: { planId, countryId } });
    return await prisma.membershipPlan.findUniqueOrThrow({
      where: { id: planId },
      include: planDetailInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Membership plans are unavailable");
  }
}

/**
 * Stop covering a country. New bookings there get no benefit; anything already
 * booked keeps its price, because an order line's price is snapshotted on the
 * `OrderItem` and nothing re-derives it (§26, mirroring decision 17).
 *
 * **It also deletes that country's benefit rows** — `MembershipBenefit_plan_
 * country_fkey` is `ON DELETE CASCADE`, so the configuration goes with the
 * coverage. The count is returned so the UI can say so rather than leaving an
 * admin to discover it by re-adding the country to an empty tab.
 *
 * No allowance counter is at risk: a pool is always the PRIMARY country's row
 * (§21.4) and the primary can never be removed, so no `MembershipAllowance
 * Balance` hangs off anything this deletes.
 */
export async function removePlanCountry(planId: string, countryId: string) {
  const plan = await prisma.membershipPlan.findUnique({
    where: { id: planId },
    select: { id: true, primaryCountryId: true },
  });
  if (!plan) throw new MembershipPlanNotFoundError();
  if (countryId === plan.primaryCountryId) {
    throw new MembershipPlanCountryError(
      "The primary country cannot be removed — it is fixed at creation and every enrollment is attributed to it",
    );
  }

  const existing = await prisma.membershipPlanCountry.findUnique({
    where: { planId_countryId: { planId, countryId } },
    select: { id: true },
  });
  if (!existing) throw new MembershipPlanCountryError("This plan does not cover that country");

  try {
    const removedBenefits = await prisma.membershipBenefit.count({
      where: { planId, countryId },
    });
    await prisma.membershipPlanCountry.delete({ where: { id: existing.id } });
    const updated = await prisma.membershipPlan.findUniqueOrThrow({
      where: { id: planId },
      include: planDetailInclude,
    });
    return { plan: updated, removedBenefits };
  } catch (error) {
    throw normalizeDbError(error, "Membership plans are unavailable");
  }
}

export type CopyPrimaryRulesResult = {
  copied: number;
  /** `FIXED` rows: the amount is in the primary country's currency (§22). */
  skippedFixed: number;
  /** The target country already configures that kind — left alone. */
  skippedExisting: number;
};

/**
 * Copy the primary country's kind-level benefit rules onto a covered country
 * (§26). Explicit, never automatic — adding a country must not silently start
 * pricing consultations.
 *
 * **Additive only.** A row is inserted only where the target has none for that
 * kind; nothing is ever overwritten or deleted, because a one-click action that
 * can silently replace configured benefits is one somebody eventually regrets.
 *
 * `FIXED` rows are skipped: their amounts are stored in the primary country's
 * currency and there is no conversion anywhere (§39). The two skip reasons are
 * reported separately — "your rules, left alone" and "we cannot convert money"
 * are different answers and an admin needs to tell them apart.
 *
 * `ALLOWANCE` rows ARE copied, and that is correct: the copy is what makes the
 * country *configured*, so units become spendable there (decision 38). Its own
 * `allowanceCount` never defines a pool — that is always the primary's row
 * (§21.4) — but the row has to exist for the country to be reachable at all.
 */
export async function copyPrimaryKindRules(
  planId: string,
  countryId: string,
): Promise<CopyPrimaryRulesResult> {
  const plan = await prisma.membershipPlan.findUnique({
    where: { id: planId },
    select: { id: true, primaryCountryId: true },
  });
  if (!plan) throw new MembershipPlanNotFoundError();
  if (countryId === plan.primaryCountryId) {
    throw new MembershipPlanCountryError("The primary country is the source of this copy");
  }
  const covered = await prisma.membershipPlanCountry.findUnique({
    where: { planId_countryId: { planId, countryId } },
    select: { id: true },
  });
  if (!covered) throw new MembershipPlanCountryError("This plan does not cover that country");

  try {
    const source = await prisma.membershipBenefit.findMany({
      where: { planId, countryId: plan.primaryCountryId, serviceKind: { not: null } },
    });
    const existing = await prisma.membershipBenefit.findMany({
      where: { planId, countryId, serviceKind: { not: null } },
      select: { levelId: true, serviceKind: true },
    });
    const taken = new Set(existing.map((r) => `${r.levelId}:${r.serviceKind}`));

    const result: CopyPrimaryRulesResult = { copied: 0, skippedFixed: 0, skippedExisting: 0 };
    const rows: Prisma.MembershipBenefitCreateManyInput[] = [];
    for (const row of source) {
      if (row.benefitType === "FIXED") {
        result.skippedFixed += 1;
        continue;
      }
      if (taken.has(`${row.levelId}:${row.serviceKind}`)) {
        result.skippedExisting += 1;
        continue;
      }
      rows.push({
        levelId: row.levelId,
        planId,
        countryId,
        serviceKind: row.serviceKind,
        serviceId: null,
        benefitType: row.benefitType,
        allowanceCount: row.allowanceCount,
        percentOff: row.percentOff,
        fixedPriceCents: row.fixedPriceCents,
        // A FIXED fallback is money in the primary's currency too, so it is
        // dropped rather than copied — the row survives with no fallback,
        // which prices at full once the allowance is out.
        fallbackType: row.fallbackType === "FIXED" ? "NONE" : row.fallbackType,
        fallbackPercent: row.fallbackType === "PERCENT" ? row.fallbackPercent : null,
        fallbackFixedCents: null,
        isActive: row.isActive,
      });
    }
    if (rows.length > 0) {
      const created = await prisma.membershipBenefit.createMany({ data: rows });
      result.copied = created.count;
    }
    return result;
  } catch (error) {
    throw normalizeDbError(error, "Membership benefits are unavailable");
  }
}

// ─── Levels ──────────────────────────────────────────────────────────────────

export async function createMembershipLevel(planId: string, body: AdminMembershipLevelCreateBody) {
  const plan = await prisma.membershipPlan.findUnique({
    where: { id: planId },
    select: { id: true, primaryCountryId: true },
  });
  if (!plan) throw new MembershipPlanNotFoundError();

  try {
    // A level no longer carries a country: since phase 7 it spans every
    // country the plan covers, and it is the BENEFIT rows underneath it that
    // are per-country (§21.2).
    return await prisma.membershipLevel.create({
      data: {
        planId: plan.id,
        slug: body.slug,
        name: body.name,
        sortOrder: body.sortOrder,
        isActive: body.isActive,
        familyEnabled: body.familyEnabled,
        maxDependents: body.maxDependents,
        allowancePool: body.allowancePool,
        cardBackgroundHex: body.cardBackgroundHex ?? null,
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
 * country the BENEFIT ROW configures (§21.3, no longer "the level's country" —
 * a level spans countries now) and be a consultation. The composite FK covers
 * the country half at the storage layer; this returns a 400 with a usable
 * message instead of a foreign-key error.
 */
async function assertBenefitService(countryId: string, serviceId: string | null): Promise<void> {
  if (!serviceId) return;
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { id: true, countryId: true, kind: true },
  });
  if (!service) throw new MembershipBenefitServiceError("Service not found");
  if (service.countryId !== countryId) {
    throw new MembershipBenefitServiceError(
      "Service belongs to a different country than this benefit row",
    );
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

/**
 * Which covered country a benefit row configures (§21.3). Defaults to the
 * plan's primary, so a caller that does not care — and every caller written
 * before phase 7 — keeps configuring the primary country exactly as it did.
 *
 * An uncovered country is refused here with a usable message; the composite FK
 * would reject it anyway, but as a foreign-key error nobody can act on.
 */
async function resolveBenefitCountry(
  planId: string,
  primaryCountryId: string,
  requested: string | null | undefined,
): Promise<string> {
  if (!requested || requested === primaryCountryId) return primaryCountryId;
  const covered = await prisma.membershipPlanCountry.findUnique({
    where: { planId_countryId: { planId, countryId: requested } },
    select: { countryId: true },
  });
  if (!covered) {
    throw new MembershipBenefitServiceError("This plan does not cover that country");
  }
  return covered.countryId;
}

export async function createMembershipBenefit(levelId: string, body: AdminMembershipBenefitBody) {
  const level = await prisma.membershipLevel.findUnique({
    where: { id: levelId },
    select: { id: true, planId: true, plan: { select: { primaryCountryId: true } } },
  });
  if (!level) throw new MembershipLevelNotFoundError();
  const countryId = await resolveBenefitCountry(
    level.planId,
    level.plan.primaryCountryId,
    body.countryId,
  );
  await assertBenefitService(countryId, body.serviceId ?? null);

  try {
    return await prisma.membershipBenefit.create({
      data: { levelId: level.id, planId: level.planId, countryId, ...benefitData(body) },
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
  // The row's country is fixed once created: moving a row between countries
  // would silently re-point whichever pool or rule it participates in. The
  // editor deletes and re-adds instead.
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
