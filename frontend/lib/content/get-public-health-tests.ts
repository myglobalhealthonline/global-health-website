import type { CountryCode } from "@/data/countries";
import { fetchHealthTests } from "@/lib/api/site-content-api";
import { cache } from "react";
import { isKnownCountryCode } from "@/lib/content/merge-public-content";
import { logPublicContentFallback } from "@/lib/content/public-content-source";

export type PublicHealthTestRecord = {
  id: string;
  countryCode: CountryCode;
  countryName: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  priceCents: number;
  currencyCode: string;
  productImagePath: string;
  galleryImagePaths: string[];
  sampleType: string | null;
  resultsTimeline: string | null;
  heroButtonLabel: string | null;
  detailIntro: string | null;
  whatThisTestCovers: string[];
  whyGetTested: string[];
  extraSections: Array<{ heading: string; body: string }> | null;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
  legacyPath: string | null;
};

function readCountry(row: unknown): { code: CountryCode; name: string } | undefined {
  if (!row || typeof row !== "object") return undefined;
  const r = row as Record<string, unknown>;
  const code = r.code;
  const name = typeof r.name === "string" ? r.name : "";
  if (!isKnownCountryCode(code) || !name) return undefined;
  return { code, name };
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function normalizeHealthTest(row: unknown): PublicHealthTestRecord | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id : null;
  const slug = typeof r.slug === "string" ? r.slug : null;
  const title = typeof r.title === "string" ? r.title : null;
  const priceCents = typeof r.priceCents === "number" && Number.isFinite(r.priceCents) ? r.priceCents : null;
  const currencyCode = typeof r.currencyCode === "string" ? r.currencyCode.trim().toUpperCase() : null;
  const productImagePath = typeof r.productImagePath === "string" ? r.productImagePath : null;
  const country = readCountry(r.country);
  if (!id || !slug || !title || priceCents === null || !currencyCode || !productImagePath || !country) return null;

  const extraSections = Array.isArray(r.extraSections)
    ? r.extraSections
        .filter((item): item is { heading: string; body: string } =>
          !!item &&
          typeof item === "object" &&
          typeof (item as { heading?: unknown }).heading === "string" &&
          typeof (item as { body?: unknown }).body === "string",
        )
        .map((item) => ({ heading: item.heading, body: item.body }))
    : null;

  return {
    id,
    countryCode: country.code,
    countryName: country.name,
    slug,
    title,
    shortDescription: typeof r.shortDescription === "string" ? r.shortDescription : null,
    priceCents,
    currencyCode,
    productImagePath,
    galleryImagePaths: toStringArray(r.galleryImagePaths),
    sampleType: typeof r.sampleType === "string" ? r.sampleType : null,
    resultsTimeline: typeof r.resultsTimeline === "string" ? r.resultsTimeline : null,
    heroButtonLabel: typeof r.heroButtonLabel === "string" ? r.heroButtonLabel : null,
    detailIntro: typeof r.detailIntro === "string" ? r.detailIntro : null,
    whatThisTestCovers: toStringArray(r.whatThisTestCovers),
    whyGetTested: toStringArray(r.whyGetTested),
    extraSections,
    sortOrder: typeof r.sortOrder === "number" && Number.isFinite(r.sortOrder) ? r.sortOrder : 0,
    seoTitle: typeof r.seoTitle === "string" ? r.seoTitle : null,
    seoDescription: typeof r.seoDescription === "string" ? r.seoDescription : null,
    legacyPath: typeof r.legacyPath === "string" ? r.legacyPath : null,
  };
}

export const getPublicHealthTestsNormalized = cache(async (): Promise<PublicHealthTestRecord[]> => {
  const res = await fetchHealthTests();
  if (!res.ok) {
    logPublicContentFallback("health-tests", res.message);
    return [];
  }
  const out: PublicHealthTestRecord[] = [];
  for (const row of res.data) {
    const normalized = normalizeHealthTest(row);
    if (normalized) out.push(normalized);
  }
  return out;
});

export async function getPublicHealthTestsForCountry(countryCode: CountryCode) {
  const all = await getPublicHealthTestsNormalized();
  return all.filter((item) => item.countryCode === countryCode);
}

export async function getPublicHealthTestBySlug(countryCode: CountryCode, slug: string) {
  const all = await getPublicHealthTestsForCountry(countryCode);
  return all.find((item) => item.slug === slug || item.legacyPath?.endsWith(`/${slug}`)) ?? null;
}

export function formatHealthTestPrice(record: Pick<PublicHealthTestRecord, "priceCents" | "currencyCode">) {
  const amount = record.priceCents / 100;
  return `${record.currencyCode} ${amount.toFixed(0)}`;
}
