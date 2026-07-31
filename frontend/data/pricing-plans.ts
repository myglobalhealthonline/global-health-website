/**
 * Subscription plan content is per-country and resolved at runtime from the
 * public plans API (`GET /api/countries/:code/plans`), not a static list — see
 * `lib/content/get-country-plans.ts`. This module owns the shared TypeScript
 * contract the pricing UI renders against (mirror of the backend
 * `PublicPlanView`, contracts.md / §36.14).
 */

export type PerkKey =
  | "SPECIALIST_DISCOUNT"
  | "FAMILY_USAGE"
  | "WELLNESS_REDEMPTION"
  | "TEST_KIT_REDEMPTION"
  | "HIGHER_DISCOUNT_TIER";

export type PerkUnlockMode = "MONTH_1" | "AFTER_PAID_MONTHS" | "MANUAL_APPROVAL" | "NOT_AVAILABLE";

export interface PublicPlanPerk {
  perkKey: PerkKey;
  unlockMode: PerkUnlockMode;
  unlockAfterPaidMonths: number | null;
}

export interface PublicPlanWellnessKit {
  healthTestId: string;
  name: string;
  slug: string;
  requiredWellnessCredits: number;
  unlockAfterPaidMonths: number;
}

export interface PublicPlan {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  longDescription: string | null;
  badgeLabel: string | null;
  isFeatured: boolean;
  displayOrder: number;
  monthlyPriceCents: number;
  currencyCode: string;
  billingInterval: string;
  monthlyConsultationCredits: number;
  wellnessCreditsPerMonth: number;
  /** Admin-edited "Includes" bullets (resolved locale). Empty → card uses its
   *  auto-generated defaults. */
  features: string[];
  /** At least one active rule discounts a specialist service. Gates the card's
   *  default "specialist savings" bullet — see PricingPlanCard. */
  hasSpecialistDiscount?: boolean;
  /** Soonest "after N paid months" gate; null hides the universal note. */
  perkUnlockMonths: number | null;
  perks: PublicPlanPerk[];
  wellnessKits: PublicPlanWellnessKit[];
  /** Last edit to the plan row; null when the API predates the field. Dates
   *  the /pricing sitemap entry, which has no timestamp of its own. */
  updatedAt: string | null;
}
