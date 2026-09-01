import { cache } from "react";
import { fetchPlansByCountry } from "@/lib/api/site-content-api";
import { logPublicContentFallback } from "@/lib/content/public-content-source";
import type {
  PerkKey,
  PerkUnlockMode,
  PublicPlan,
  PublicPlanPerk,
  PublicPlanWellnessKit,
} from "@/data/pricing-plans";

/**
 * Public pricing-page data layer (§36.14). Resolves the per-country plan
 * catalogue from the anonymous plans API and parses it into the typed
 * `PublicPlan` contract. The result variant distinguishes a genuine empty
 * catalogue from transport or schema failure so pricing copy fails closed.
 */

const PERK_KEYS: PerkKey[] = [
  "SPECIALIST_DISCOUNT",
  "FAMILY_USAGE",
  "WELLNESS_REDEMPTION",
  "TEST_KIT_REDEMPTION",
  "HIGHER_DISCOUNT_TIER",
];
const PERK_MODES: PerkUnlockMode[] = ["MONTH_1", "AFTER_PAID_MONTHS", "MANUAL_APPROVAL", "NOT_AVAILABLE"];

function nonEmptyStr(v: unknown): v is string {
  return typeof v === "string" && v.trim() !== "";
}
function nullableStr(v: unknown): v is string | null {
  return v === null || typeof v === "string";
}
function nonNegativeInt(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0;
}
function nullableNonNegativeInt(v: unknown): v is number | null {
  return v === null || nonNegativeInt(v);
}

function parsePerk(row: unknown): PublicPlanPerk | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const perkKey = r.perkKey;
  const unlockMode = r.unlockMode;
  if (
    !PERK_KEYS.includes(perkKey as PerkKey) ||
    !PERK_MODES.includes(unlockMode as PerkUnlockMode) ||
    !nullableNonNegativeInt(r.unlockAfterPaidMonths)
  ) return null;
  return {
    perkKey: perkKey as PerkKey,
    unlockMode: unlockMode as PerkUnlockMode,
    unlockAfterPaidMonths: r.unlockAfterPaidMonths,
  };
}

function parseKit(row: unknown): PublicPlanWellnessKit | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  if (
    !nonEmptyStr(r.healthTestId) ||
    !nonEmptyStr(r.name) ||
    !nonEmptyStr(r.slug) ||
    !nonNegativeInt(r.requiredWellnessCredits) ||
    !nonNegativeInt(r.unlockAfterPaidMonths)
  ) return null;
  return {
    healthTestId: r.healthTestId,
    name: r.name,
    slug: r.slug,
    requiredWellnessCredits: r.requiredWellnessCredits,
    unlockAfterPaidMonths: r.unlockAfterPaidMonths,
  };
}

function parsePlan(row: unknown): PublicPlan | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const perks = Array.isArray(r.perks) ? r.perks.map(parsePerk) : null;
  const wellnessKits = Array.isArray(r.wellnessKits) ? r.wellnessKits.map(parseKit) : null;
  if (
    !nonEmptyStr(r.id) ||
    !nonEmptyStr(r.slug) ||
    !nonEmptyStr(r.name) ||
    !nullableStr(r.shortDescription) ||
    !nullableStr(r.longDescription) ||
    !nullableStr(r.badgeLabel) ||
    typeof r.isFeatured !== "boolean" ||
    !nonNegativeInt(r.displayOrder) ||
    !nonNegativeInt(r.monthlyPriceCents) ||
    !nonEmptyStr(r.currencyCode) ||
    !nonEmptyStr(r.billingInterval) ||
    !nonNegativeInt(r.monthlyConsultationCredits) ||
    !nonNegativeInt(r.wellnessCreditsPerMonth) ||
    !Array.isArray(r.features) ||
    !r.features.every(nonEmptyStr) ||
    (r.hasSpecialistDiscount !== undefined && typeof r.hasSpecialistDiscount !== "boolean") ||
    !nullableNonNegativeInt(r.perkUnlockMonths) ||
    !perks ||
    perks.some((perk) => perk === null) ||
    !wellnessKits ||
    wellnessKits.some((kit) => kit === null) ||
    !(r.updatedAt === null || typeof r.updatedAt === "string")
  ) return null;
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    shortDescription: r.shortDescription,
    longDescription: r.longDescription,
    badgeLabel: r.badgeLabel,
    isFeatured: r.isFeatured,
    displayOrder: r.displayOrder,
    monthlyPriceCents: r.monthlyPriceCents,
    currencyCode: r.currencyCode,
    billingInterval: r.billingInterval,
    monthlyConsultationCredits: r.monthlyConsultationCredits,
    wellnessCreditsPerMonth: r.wellnessCreditsPerMonth,
    features: r.features,
    ...(typeof r.hasSpecialistDiscount === "boolean" && { hasSpecialistDiscount: r.hasSpecialistDiscount }),
    perkUnlockMonths: r.perkUnlockMonths,
    perks: perks as PublicPlanPerk[],
    wellnessKits: wellnessKits as PublicPlanWellnessKit[],
    updatedAt: r.updatedAt,
  };
}

export const getCountryPlansResult = cache(
  async (countryCode: string, locale?: string): Promise<
    { ok: true; plans: PublicPlan[] } | { ok: false; plans: [] }
  > => {
    const res = await fetchPlansByCountry(countryCode, locale);
    if (!res.ok) {
      // 404 (feature off) is an expected "no plans" signal, not an error worth
      // surfacing — the page already feature-gates. Log other failures.
      if (res.status !== 404) logPublicContentFallback("country-plans", res.message);
      return { ok: false, plans: [] };
    }
    if (!Array.isArray(res.data?.plans)) return { ok: false, plans: [] };
    const plans = res.data.plans.map(parsePlan);
    if (plans.some((plan) => plan === null)) return { ok: false, plans: [] };
    return { ok: true, plans: plans as PublicPlan[] };
  },
);

export const getCountryPlans = cache(async (countryCode: string, locale?: string): Promise<PublicPlan[]> =>
  (await getCountryPlansResult(countryCode, locale)).plans
);
