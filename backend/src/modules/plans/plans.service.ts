import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { syncPlanStripePrice } from "../billing/price-sync.service.js";
import {
  TIER_LIMITS,
  type AdminPlanCreateBody,
  type AdminPlanUpdateBody,
  type AdminPlansQuery,
} from "../../validations/admin-plans.schema.js";

export class PlanCountryNotFoundError extends Error {
  constructor() {
    super("Country not found");
    this.name = "PlanCountryNotFoundError";
  }
}

export class PlanNotFoundError extends Error {
  constructor() {
    super("Plan not found");
    this.name = "PlanNotFoundError";
  }
}

/** Stripe Price sync failed — the plan must never be left without a Price (§39). */
export class PlanPriceSyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanPriceSyncError";
  }
}

/** familyEnabled was set true on a non-PREMIUM plan (§ appointment-claim G4). */
export class PlanFamilyNotPremiumError extends Error {
  constructor() {
    super("familyEnabled is only allowed on PREMIUM plans");
    this.name = "PlanFamilyNotPremiumError";
  }
}

/** A tier bound was exceeded (credits over the 1/2/3 cap) — B9. */
export class PlanTierLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanTierLimitError";
  }
}

/** A second ACTIVE plan of the same tier already exists in the country — B9. */
export class PlanDuplicateTierError extends Error {
  constructor() {
    super("An active plan of this tier already exists for this country");
    this.name = "PlanDuplicateTierError";
  }
}

const adminPlanInclude = {
  country: { select: { id: true, code: true, name: true } },
  consultationRules: {
    orderBy: { createdAt: "asc" as const },
    include: {
      service: {
        select: { id: true, name: true, slug: true, kind: true, basePriceCents: true, currencyCode: true },
      },
    },
  },
  perkRules: { orderBy: { perkKey: "asc" as const } },
  healthTestRules: {
    orderBy: { createdAt: "asc" as const },
    include: {
      healthTest: { select: { id: true, title: true, slug: true, priceCents: true, currencyCode: true } },
    },
  },
  translations: { orderBy: { locale: "asc" as const } },
} satisfies Prisma.PricingPlanInclude;

const adminPlanListInclude = {
  country: { select: { id: true, code: true, name: true } },
  _count: { select: { consultationRules: true, perkRules: true, healthTestRules: true, subscriptions: true } },
  // display-only: lets the admin list show the EN translation's name (ponytail).
  translations: { select: { locale: true, name: true } },
} satisfies Prisma.PricingPlanInclude;

export type AdminPlanRecord = Prisma.PricingPlanGetPayload<{ include: typeof adminPlanInclude }>;
export type AdminPlanListRecord = Prisma.PricingPlanGetPayload<{ include: typeof adminPlanListInclude }>;

async function assertCountryExists(countryId: string): Promise<void> {
  const row = await prisma.country.findUnique({ where: { id: countryId }, select: { id: true } });
  if (!row) throw new PlanCountryNotFoundError();
}

export async function listAdminPlans(query: AdminPlansQuery): Promise<AdminPlanListRecord[]> {
  const where: Prisma.PricingPlanWhereInput = {};
  if (query.countryId) where.countryId = query.countryId;
  if (query.countryCode) where.country = { code: query.countryCode.toLowerCase() };
  if (!query.includeInactive) where.isActive = true;
  try {
    return await prisma.pricingPlan.findMany({
      where,
      orderBy: [{ country: { name: "asc" } }, { displayOrder: "asc" }, { monthlyPriceCents: "asc" }],
      include: adminPlanListInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Plans data is unavailable");
  }
}

export async function getAdminPlanById(id: string): Promise<AdminPlanRecord | null> {
  try {
    return await prisma.pricingPlan.findUnique({ where: { id }, include: adminPlanInclude });
  } catch (error) {
    throw normalizeDbError(error, "Plan data is unavailable");
  }
}

function planWriteData(input: AdminPlanCreateBody | AdminPlanUpdateBody) {
  return {
    ...(input.slug !== undefined && { slug: input.slug }),
    ...(input.name !== undefined && { name: input.name }),
    ...(input.shortDescription !== undefined && { shortDescription: input.shortDescription }),
    ...(input.longDescription !== undefined && { longDescription: input.longDescription }),
    ...(input.monthlyPriceCents !== undefined && { monthlyPriceCents: input.monthlyPriceCents }),
    ...(input.currencyCode !== undefined && { currencyCode: input.currencyCode }),
    ...(input.billingInterval !== undefined && { billingInterval: input.billingInterval }),
    ...(input.isActive !== undefined && { isActive: input.isActive }),
    ...(input.displayOrder !== undefined && { displayOrder: input.displayOrder }),
    ...(input.isFeatured !== undefined && { isFeatured: input.isFeatured }),
    ...(input.badgeLabel !== undefined && { badgeLabel: input.badgeLabel }),
    ...(input.notesTerms !== undefined && { notesTerms: input.notesTerms }),
    ...(input.monthlyConsultationCredits !== undefined && {
      monthlyConsultationCredits: input.monthlyConsultationCredits,
    }),
    ...(input.wellnessCreditsPerMonth !== undefined && {
      wellnessCreditsPerMonth: input.wellnessCreditsPerMonth,
    }),
    ...(input.familyEnabled !== undefined && { familyEnabled: input.familyEnabled }),
    ...(input.benefitsUnlockAfterPaidMonths !== undefined && {
      benefitsUnlockAfterPaidMonths: input.benefitsUnlockAfterPaidMonths,
    }),
    // VAT removed from these plans — always force EXEMPT, never persist a rate.
    vatMode: "EXEMPT" as const,
    vatRatePct: null,
  };
}

/**
 * Create a plan and immediately sync its Stripe Price (§39 — a plan must never
 * exist without a Price). If the price sync fails, the just-created row is
 * rolled back so no price-less plan is left behind, and the failure is surfaced.
 */
export async function createAdminPlan(input: AdminPlanCreateBody): Promise<AdminPlanRecord> {
  await assertCountryExists(input.countryId);

  // B9: at most one ACTIVE plan per (country, tier). Pre-check for a friendly
  // 409; the partial unique index is the hard backstop against races.
  if (input.isActive) {
    const dupe = await prisma.pricingPlan.findFirst({
      where: { countryId: input.countryId, planType: input.planType, isActive: true },
      select: { id: true },
    });
    if (dupe) throw new PlanDuplicateTierError();
  }

  let createdId: string;
  try {
    const plan = await prisma.pricingPlan.create({
      data: {
        countryId: input.countryId,
        slug: input.slug,
        planType: input.planType,
        name: input.name,
        shortDescription: input.shortDescription,
        longDescription: input.longDescription,
        monthlyPriceCents: input.monthlyPriceCents,
        currencyCode: input.currencyCode,
        billingInterval: input.billingInterval,
        isActive: input.isActive,
        displayOrder: input.displayOrder,
        isFeatured: input.isFeatured,
        badgeLabel: input.badgeLabel,
        notesTerms: input.notesTerms,
        monthlyConsultationCredits: input.monthlyConsultationCredits,
        // Wellness is strictly Premium-only — force 0 on Essential/Comprehensive.
        wellnessCreditsPerMonth:
          input.planType === "PREMIUM" ? input.wellnessCreditsPerMonth : 0,
        // Family usage is Premium-only too — force false on other tiers (the
        // create schema refine already rejects familyEnabled=true here, this is
        // belt-and-suspenders mirroring the wellness guard).
        familyEnabled: input.planType === "PREMIUM" ? input.familyEnabled : false,
        benefitsUnlockAfterPaidMonths: input.benefitsUnlockAfterPaidMonths,
        // VAT removed — always EXEMPT, no rate.
        vatMode: "EXEMPT",
        vatRatePct: null,
      },
      select: { id: true },
    });
    createdId = plan.id;
  } catch (error) {
    throw normalizeDbError(error, "Plans data is unavailable");
  }

  try {
    await syncPlanStripePrice(createdId);
  } catch (error) {
    // Roll back the price-less plan so the catalogue stays consistent.
    await prisma.pricingPlan.delete({ where: { id: createdId } }).catch(() => {});
    throw new PlanPriceSyncError(
      `Stripe Price sync failed for the new plan: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }

  return prisma.pricingPlan.findUniqueOrThrow({ where: { id: createdId }, include: adminPlanInclude });
}

/**
 * Update a plan. When the amount or currency changes a NEW immutable Stripe
 * Price is synced (§22) — failure is surfaced as a hard error so the admin can
 * retry (the reconciliation job also flags price-sync drift, §39).
 */
export async function updateAdminPlan(
  id: string,
  body: AdminPlanUpdateBody,
): Promise<AdminPlanRecord | null> {
  const existing = await prisma.pricingPlan.findUnique({
    where: { id },
    select: { id: true, countryId: true, monthlyPriceCents: true, currencyCode: true, planType: true },
  });
  if (!existing) return null;

  // Tier bounds (B8/B9). planType is immutable and read from the row, so a
  // forged body can't lift the caps. Family already guarded above.
  const limits = TIER_LIMITS[existing.planType];
  if (body.familyEnabled === true && !limits.familyAllowed) {
    throw new PlanFamilyNotPremiumError();
  }
  if (
    body.monthlyConsultationCredits !== undefined &&
    body.monthlyConsultationCredits > limits.maxCredits
  ) {
    throw new PlanTierLimitError(
      `monthlyConsultationCredits exceeds the ${existing.planType} tier cap (${limits.maxCredits})`,
    );
  }

  // B9: block reactivating a plan when another active plan of the same tier
  // already exists for the country.
  if (body.isActive === true) {
    const dupe = await prisma.pricingPlan.findFirst({
      where: {
        countryId: existing.countryId,
        planType: existing.planType,
        isActive: true,
        id: { not: existing.id },
      },
      select: { id: true },
    });
    if (dupe) throw new PlanDuplicateTierError();
  }

  const priceChanged =
    (body.monthlyPriceCents !== undefined && body.monthlyPriceCents !== existing.monthlyPriceCents) ||
    (body.currencyCode !== undefined && body.currencyCode !== existing.currencyCode);

  // B8: wellness is Premium-only on the UPDATE path too (create already forces
  // it). Force 0 for non-Premium tiers regardless of what the body sent.
  const data = planWriteData(body);
  if (!limits.wellnessAllowed) {
    data.wellnessCreditsPerMonth = 0;
  }

  try {
    await prisma.pricingPlan.update({ where: { id }, data });
  } catch (error) {
    throw normalizeDbError(error, "Plans data is unavailable");
  }

  if (priceChanged) {
    try {
      await syncPlanStripePrice(id);
    } catch (error) {
      throw new PlanPriceSyncError(
        `Stripe Price sync failed after the price change: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  }

  return prisma.pricingPlan.findUniqueOrThrow({ where: { id }, include: adminPlanInclude });
}

/**
 * Deactivate-only delete (§25.1). Never hard-deletes — existing subscribers'
 * snapshots, rules, and Stripe Prices must survive. Soft `isActive:false`.
 */
export async function deactivateAdminPlan(id: string): Promise<AdminPlanRecord | null> {
  const existing = await prisma.pricingPlan.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  try {
    await prisma.pricingPlan.update({ where: { id }, data: { isActive: false } });
    return prisma.pricingPlan.findUniqueOrThrow({ where: { id }, include: adminPlanInclude });
  } catch (error) {
    throw normalizeDbError(error, "Plans data is unavailable");
  }
}

export async function reorderAdminPlans(
  items: Array<{ id: string; displayOrder: number }>,
): Promise<void> {
  if (items.length === 0) return;
  try {
    await prisma.$transaction(
      items.map(({ id, displayOrder }) =>
        prisma.pricingPlan.update({ where: { id }, data: { displayOrder } }),
      ),
    );
  } catch (error) {
    throw normalizeDbError(error, "Could not reorder plans");
  }
}
