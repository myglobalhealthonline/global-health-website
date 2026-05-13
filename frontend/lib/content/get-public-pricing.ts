import type { CountryCode } from "@/data/countries";
import { fetchPricing } from "@/lib/api/site-content-api";
import { cache } from "react";
import type { MarketingPageData } from "@/lib/content/marketing-page-data";
import { isKnownCountryCode } from "@/lib/content/merge-public-content";
import { logPublicContentFallback } from "@/lib/content/public-content-source";

export type PublicPricingPlanRecord = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  currencyCode: string;
  interval: string;
  countryCode: CountryCode;
  countryName: string;
};

function readCountry(row: unknown): { code: CountryCode; name: string } | undefined {
  if (!row || typeof row !== "object") return undefined;
  const r = row as Record<string, unknown>;
  const code = r.code;
  const name = typeof r.name === "string" ? r.name : "";
  if (!isKnownCountryCode(code) || !name) return undefined;
  return { code, name };
}

function normalizePlan(row: unknown): PublicPricingPlanRecord | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id : null;
  const slug = typeof r.slug === "string" ? r.slug : null;
  const name = typeof r.name === "string" ? r.name : null;
  const interval = typeof r.interval === "string" ? r.interval : null;
  const currencyCode = typeof r.currencyCode === "string" ? r.currencyCode : null;

  if (!id || !slug || !name || !interval || !currencyCode) return null;

  const priceCents =
    typeof r.priceCents === "number" && Number.isFinite(r.priceCents) ? r.priceCents : null;
  if (priceCents === null) return null;

  const country = readCountry(r.country);
  if (!country) return null;

  const description =
    r.description === null || r.description === undefined
      ? null
      : typeof r.description === "string"
        ? r.description
        : null;

  return {
    id,
    slug,
    name,
    description,
    priceCents,
    currencyCode: currencyCode.trim().toUpperCase(),
    interval,
    countryCode: country.code,
    countryName: country.name,
  };
}

export const getPublicPricingPlansNormalized = cache(async (): Promise<PublicPricingPlanRecord[]> => {
  const res = await fetchPricing();
  if (!res.ok) {
    logPublicContentFallback("pricing", res.message);
    return [];
  }

  const out: PublicPricingPlanRecord[] = [];
  for (const row of res.data) {
    const n = normalizePlan(row);
    if (n) out.push(n);
  }
  return out;
});

export function formatPlanPrice(plan: PublicPricingPlanRecord): string {
  const amount = plan.priceCents / 100;
  const sym = plan.currencyCode.toUpperCase();
  return `${sym} ${amount.toFixed(2)} / ${plan.interval}`;
}

/** Prepends backend pricing plans as feature cards; keeps all static marketing blocks when API is empty. */
export async function mergePricingPlansIntoMarketingPage(
  base: MarketingPageData,
): Promise<MarketingPageData> {
  const plans = await getPublicPricingPlansNormalized();
  if (plans.length === 0) return base;

  const pricingFeatures = plans.map((p) => {
    const priceLine = formatPlanPrice(p);
    const description =
      [p.description, priceLine].filter((x) => x && String(x).trim().length > 0).join(" — ") ||
      priceLine;
    return {
      title: p.name,
      description,
      href: "/book-online",
      ctaLabel: "Book consultation",
    };
  });

  return {
    ...base,
    features: [...pricingFeatures, ...(base.features ?? [])],
  };
}
