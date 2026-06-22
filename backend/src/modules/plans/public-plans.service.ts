import { LocaleCode, Prisma } from "@prisma/client";
import type { PerkKey, PerkUnlockMode } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { normalizeDbError } from "../shared/db-errors.js";
import { resolveTranslation } from "../shared/resolve-translation.js";
import { isSubscriptionsEnabled } from "../subscriptions/feature-gate.js";

/**
 * Anonymous, read-only per-country plan catalogue for the public pricing page
 * (§29, §36.14). NOT the patient money API — it never reads a subscription,
 * credit, or Stripe object; it serialises the live `PricingPlan` rows + their
 * rules into a marketing-safe shape.
 *
 * STRICT subscriptions gate (§36.15) is enforced here too (defence in depth):
 * a country that hasn't explicitly opted in returns `enabled:false`, so the
 * route 404s exactly like the frontend feature gate.
 *
 * Marketing copy that says "selected perks unlock after N paid months" must be
 * DATA-DRIVEN (§36.17) — `perkUnlockMonths` is derived from the live rules, not
 * hardcoded to "2".
 */

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

export interface PublicPlanView {
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
  /** Admin-edited "Includes" bullets for the resolved locale. Empty → the card
   *  renders its auto-generated default bullets (§12). */
  features: string[];
  /** Soonest "after N paid months" unlock across gated perk/consultation rules,
   *  or null when nothing is gated (hide the universal note). Data-driven. */
  perkUnlockMonths: number | null;
  perks: PublicPlanPerk[];
  wellnessKits: PublicPlanWellnessKit[];
}

export interface PublicPlansResult {
  /** False when the country has not opted into subscriptions (route → 404). */
  enabled: boolean;
  plans: PublicPlanView[];
}

const publicPlanInclude = {
  perkRules: { orderBy: { perkKey: "asc" as const } },
  consultationRules: {
    where: { isActive: true },
    select: { unlockAfterPaidMonths: true },
  },
  healthTestRules: {
    where: { isActive: true },
    orderBy: { createdAt: "asc" as const },
    include: {
      healthTest: { select: { id: true, title: true, slug: true } },
    },
  },
  translations: { orderBy: { locale: "asc" as const } },
} satisfies Prisma.PricingPlanInclude;

type PublicPlanRecord = Prisma.PricingPlanGetPayload<{ include: typeof publicPlanInclude }>;

/**
 * The representative "unlock after N paid months" for a card's universal note.
 * We take the SOONEST positive gate across perk rules (mode AFTER_PAID_MONTHS)
 * and consultation rules so the single marketing number reflects real config.
 * Returns null when nothing is month-gated.
 */
function derivePerkUnlockMonths(plan: PublicPlanRecord): number | null {
  const months: number[] = [];
  for (const perk of plan.perkRules) {
    if (perk.unlockMode === "AFTER_PAID_MONTHS" && perk.unlockAfterPaidMonths && perk.unlockAfterPaidMonths > 0) {
      months.push(perk.unlockAfterPaidMonths);
    }
  }
  for (const rule of plan.consultationRules) {
    if (rule.unlockAfterPaidMonths > 0) months.push(rule.unlockAfterPaidMonths);
  }
  if (months.length === 0) return null;
  return Math.min(...months);
}

function serializePublicPlan(plan: PublicPlanRecord, requested: LocaleCode, defaultLocale: LocaleCode): PublicPlanView {
  const { tr } = resolveTranslation(plan.translations, requested, defaultLocale);
  return {
    id: plan.id,
    slug: plan.slug,
    name: tr?.name ?? plan.name,
    shortDescription: tr?.shortDescription ?? plan.shortDescription,
    longDescription: tr?.longDescription ?? plan.longDescription,
    badgeLabel: plan.badgeLabel,
    isFeatured: plan.isFeatured,
    displayOrder: plan.displayOrder,
    monthlyPriceCents: plan.monthlyPriceCents,
    currencyCode: plan.currencyCode,
    billingInterval: plan.billingInterval,
    monthlyConsultationCredits: plan.monthlyConsultationCredits,
    wellnessCreditsPerMonth: plan.wellnessCreditsPerMonth,
    features: tr?.features ?? [],
    perkUnlockMonths: derivePerkUnlockMonths(plan),
    perks: plan.perkRules.map((p) => ({
      perkKey: p.perkKey,
      unlockMode: p.unlockMode,
      unlockAfterPaidMonths: p.unlockAfterPaidMonths,
    })),
    wellnessKits: plan.healthTestRules.map((r) => ({
      healthTestId: r.healthTestId,
      name: r.healthTest.title,
      slug: r.healthTest.slug,
      requiredWellnessCredits: r.requiredWellnessCredits,
      unlockAfterPaidMonths: r.unlockAfterPaidMonths,
    })),
  };
}

/**
 * List active subscription plans for a country (anonymous pricing page).
 * Country codes are stored lowercase — match case-insensitively (contracts.md).
 */
export async function listPublicPlansByCountry(
  countryCode: string,
  requestedLocale?: LocaleCode,
): Promise<PublicPlansResult> {
  let country: { id: string; defaultLocale: LocaleCode; enabledFeatures: string[] } | null;
  try {
    country = await prisma.country.findFirst({
      where: { code: { equals: countryCode, mode: "insensitive" } },
      select: { id: true, defaultLocale: true, enabledFeatures: true },
    });
  } catch (error) {
    throw normalizeDbError(error, "Plans data is unavailable");
  }
  if (!country) return { enabled: false, plans: [] };
  if (!isSubscriptionsEnabled(country.enabledFeatures)) {
    return { enabled: false, plans: [] };
  }

  const defaultLocale = country.defaultLocale ?? LocaleCode.EN;
  const requested = requestedLocale ?? defaultLocale;

  let rows: PublicPlanRecord[];
  try {
    rows = await prisma.pricingPlan.findMany({
      where: { countryId: country.id, isActive: true },
      orderBy: [{ displayOrder: "asc" }, { monthlyPriceCents: "asc" }],
      include: publicPlanInclude,
    });
  } catch (error) {
    throw normalizeDbError(error, "Plans data is unavailable");
  }

  return {
    enabled: true,
    plans: rows.map((row) => serializePublicPlan(row, requested, defaultLocale)),
  };
}
