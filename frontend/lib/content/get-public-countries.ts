import {
  countries as fallbackCountries,
  type CountryCode,
  type CountryConfig,
} from "@/data/countries";
import { fetchCountries } from "@/lib/api/site-content-api";
import { cache } from "react";
import {
  isKnownCountryCode,
  mergeCountryConfigWithBackend,
  normalizeBackendLocale,
} from "@/lib/content/merge-public-content";
import { logPublicContentFallback } from "@/lib/content/public-content-source";
import type { LocaleCode } from "@/lib/i18n/types";

function parseCountryLocales(raw: unknown): LocaleCode[] {
  if (!Array.isArray(raw)) return [];
  const out: LocaleCode[] = [];
  for (const row of raw) {
    if (row && typeof row === "object" && "locale" in row) {
      const loc = normalizeBackendLocale((row as { locale: unknown }).locale);
      if (loc) out.push(loc);
    }
  }
  return out;
}

type BackendCountryOverlay = {
  name?: string;
  legacyHomePath?: string;
  teamPath?: string;
  generalConsultationPath?: string;
  specialistConsultationPath?: string;
  defaultLocale?: LocaleCode;
  supportedLocales?: LocaleCode[];
};

function extractBackendCountryOverlay(row: unknown): { code: CountryCode } & BackendCountryOverlay | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const code = r.code;
  if (!isKnownCountryCode(code)) return null;

  const name = typeof r.name === "string" ? r.name : undefined;
  const legacyHomePath = typeof r.legacyHomePath === "string" ? r.legacyHomePath : undefined;
  const teamPath = typeof r.teamPath === "string" ? r.teamPath : undefined;
  const generalConsultationPath =
    typeof r.generalConsultationPath === "string" ? r.generalConsultationPath : undefined;
  const specialistConsultationPath =
    typeof r.specialistConsultationPath === "string" ? r.specialistConsultationPath : undefined;

  const defaultLocale = normalizeBackendLocale(r.defaultLocale);
  const supportedLocales = parseCountryLocales(r.countryLocales);

  return {
    code,
    name,
    legacyHomePath,
    teamPath,
    generalConsultationPath,
    specialistConsultationPath,
    ...(defaultLocale ? { defaultLocale } : {}),
    ...(supportedLocales.length > 0 ? { supportedLocales } : {}),
  };
}

/**
 * Returns seed countries merged with `/api/countries` when the API succeeds.
 * Routing paths fall back unless the backend supplies a complete valid path set.
 */
export const getPublicCountriesMerged = cache(async (): Promise<CountryConfig[]> => {
  const res = await fetchCountries();
  if (!res.ok) {
    logPublicContentFallback("countries", res.message);
    return [...fallbackCountries];
  }

  const byCode = new Map<CountryCode, BackendCountryOverlay>();
  for (const row of res.data) {
    const extracted = extractBackendCountryOverlay(row);
    if (!extracted) continue;
    const { code, ...overlay } = extracted;
    byCode.set(code, overlay);
  }

  return fallbackCountries.map((seed) => {
    const overlay = byCode.get(seed.code);
    if (!overlay) return seed;
    return mergeCountryConfigWithBackend(seed, overlay);
  });
});
