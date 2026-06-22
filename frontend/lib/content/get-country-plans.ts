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
 * `PublicPlan` contract. Returns `[]` on any failure (API down, country
 * 404 because subscriptions aren't enabled) — the page gates on the
 * `subscriptions` feature flag before rendering, so an empty list here means
 * "no plans", and the empty-state copy is shown.
 */

const PERK_KEYS: PerkKey[] = [
  "SPECIALIST_DISCOUNT",
  "FAMILY_USAGE",
  "WELLNESS_REDEMPTION",
  "TEST_KIT_REDEMPTION",
  "HIGHER_DISCOUNT_TIER",
];
const PERK_MODES: PerkUnlockMode[] = ["MONTH_1", "AFTER_PAID_MONTHS", "MANUAL_APPROVAL", "NOT_AVAILABLE"];

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function nullableStr(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}
function int(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}
function nullableInt(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function parsePerk(row: unknown): PublicPlanPerk | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const perkKey = r.perkKey;
  const unlockMode = r.unlockMode;
  if (!PERK_KEYS.includes(perkKey as PerkKey)) return null;
  return {
    perkKey: perkKey as PerkKey,
    unlockMode: PERK_MODES.includes(unlockMode as PerkUnlockMode)
      ? (unlockMode as PerkUnlockMode)
      : "NOT_AVAILABLE",
    unlockAfterPaidMonths: nullableInt(r.unlockAfterPaidMonths),
  };
}

function parseKit(row: unknown): PublicPlanWellnessKit | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  if (typeof r.healthTestId !== "string") return null;
  return {
    healthTestId: r.healthTestId,
    name: str(r.name),
    slug: str(r.slug),
    requiredWellnessCredits: int(r.requiredWellnessCredits),
    unlockAfterPaidMonths: int(r.unlockAfterPaidMonths),
  };
}

function parsePlan(row: unknown): PublicPlan | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  if (typeof r.id !== "string" || typeof r.slug !== "string") return null;
  return {
    id: r.id,
    slug: r.slug,
    name: str(r.name),
    shortDescription: nullableStr(r.shortDescription),
    longDescription: nullableStr(r.longDescription),
    badgeLabel: nullableStr(r.badgeLabel),
    isFeatured: r.isFeatured === true,
    displayOrder: int(r.displayOrder),
    monthlyPriceCents: int(r.monthlyPriceCents),
    currencyCode: str(r.currencyCode) || "EUR",
    billingInterval: str(r.billingInterval) || "MONTHLY",
    monthlyConsultationCredits: int(r.monthlyConsultationCredits),
    wellnessCreditsPerMonth: int(r.wellnessCreditsPerMonth),
    features: Array.isArray(r.features)
      ? r.features.filter((f): f is string => typeof f === "string" && f.trim() !== "")
      : [],
    perkUnlockMonths: nullableInt(r.perkUnlockMonths),
    perks: Array.isArray(r.perks)
      ? r.perks.map(parsePerk).filter((p): p is PublicPlanPerk => p !== null)
      : [],
    wellnessKits: Array.isArray(r.wellnessKits)
      ? r.wellnessKits.map(parseKit).filter((k): k is PublicPlanWellnessKit => k !== null)
      : [],
  };
}

export const getCountryPlans = cache(
  async (countryCode: string, locale?: string): Promise<PublicPlan[]> => {
    const res = await fetchPlansByCountry(countryCode, locale);
    if (!res.ok) {
      // 404 (feature off) is an expected "no plans" signal, not an error worth
      // surfacing — the page already feature-gates. Log other failures.
      if (res.status !== 404) logPublicContentFallback("country-plans", res.message);
      return [];
    }
    const rows = Array.isArray(res.data?.plans) ? res.data.plans : [];
    return rows.map(parsePlan).filter((p): p is PublicPlan => p !== null);
  },
);
