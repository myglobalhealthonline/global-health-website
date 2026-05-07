import type { CountryCode } from "@/data/countries";
import { fetchSpecialties } from "@/lib/api/site-content-api";
import { cache } from "react";
import { isKnownCountryCode } from "@/lib/content/merge-public-content";
import { logPublicContentFallback } from "@/lib/content/public-content-source";

export type PublicSpecialtyRecord = {
  id: string;
  slug: string;
  name: string;
  cardSummary: string | null;
  cardThemeColor: string | null;
  sortOrder: number;
  primaryServiceId: string | null;
  countryCode: CountryCode;
  imagePath: string | null;
  primaryService: {
    id: string;
    slug: string;
    name: string;
    summary: string | null;
    durationMinutes: number | null;
    basePriceCents: number | null;
    currencyCode: string | null;
    legacyPath: string | null;
  } | null;
};

function readCountryCode(row: unknown): CountryCode | undefined {
  if (!row || typeof row !== "object") return undefined;
  const code = (row as { country?: { code?: unknown } }).country?.code;
  return isKnownCountryCode(code) ? code : undefined;
}

function normalizeSpecialty(row: unknown): PublicSpecialtyRecord | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id : null;
  const slug = typeof r.slug === "string" ? r.slug : null;
  const name = typeof r.name === "string" ? r.name : null;
  const countryCode = readCountryCode(r);
  if (!id || !slug || !name || !countryCode) return null;

  const assets = Array.isArray(r.assets) ? r.assets : [];
  const imagePath = (() => {
    const first = assets[0];
    if (!first || typeof first !== "object") return null;
    return typeof (first as { path?: unknown }).path === "string" ? (first as { path: string }).path : null;
  })();

  const primaryServiceRaw = r.primaryService;
  const primaryService =
    primaryServiceRaw && typeof primaryServiceRaw === "object"
      ? {
          id: typeof (primaryServiceRaw as { id?: unknown }).id === "string" ? (primaryServiceRaw as { id: string }).id : "",
          slug: typeof (primaryServiceRaw as { slug?: unknown }).slug === "string" ? (primaryServiceRaw as { slug: string }).slug : "",
          name: typeof (primaryServiceRaw as { name?: unknown }).name === "string" ? (primaryServiceRaw as { name: string }).name : "",
          summary: typeof (primaryServiceRaw as { summary?: unknown }).summary === "string" ? (primaryServiceRaw as { summary: string }).summary : null,
          durationMinutes: typeof (primaryServiceRaw as { durationMinutes?: unknown }).durationMinutes === "number" ? (primaryServiceRaw as { durationMinutes: number }).durationMinutes : null,
          basePriceCents: typeof (primaryServiceRaw as { basePriceCents?: unknown }).basePriceCents === "number" ? (primaryServiceRaw as { basePriceCents: number }).basePriceCents : null,
          currencyCode: typeof (primaryServiceRaw as { currencyCode?: unknown }).currencyCode === "string" ? (primaryServiceRaw as { currencyCode: string }).currencyCode : null,
          legacyPath: typeof (primaryServiceRaw as { legacyPath?: unknown }).legacyPath === "string" ? (primaryServiceRaw as { legacyPath: string }).legacyPath : null,
        }
      : null;

  return {
    id,
    slug,
    name,
    cardSummary: typeof r.cardSummary === "string" ? r.cardSummary : null,
    cardThemeColor: typeof r.cardThemeColor === "string" ? r.cardThemeColor : null,
    sortOrder: typeof r.sortOrder === "number" ? r.sortOrder : 0,
    primaryServiceId: typeof r.primaryServiceId === "string" ? r.primaryServiceId : null,
    countryCode,
    imagePath,
    primaryService: primaryService && primaryService.id ? primaryService : null,
  };
}

export const getPublicSpecialtiesNormalized = cache(async (): Promise<PublicSpecialtyRecord[]> => {
  const res = await fetchSpecialties();
  if (!res.ok) {
    logPublicContentFallback("specialties", res.message);
    return [];
  }

  const out: PublicSpecialtyRecord[] = [];
  for (const row of res.data) {
    const normalized = normalizeSpecialty(row);
    if (normalized) out.push(normalized);
  }
  return out;
});

export async function getPublicSpecialtiesForCountry(countryCode: CountryCode) {
  const all = await getPublicSpecialtiesNormalized();
  return all.filter((item) => item.countryCode === countryCode).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}
