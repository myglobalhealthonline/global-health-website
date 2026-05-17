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
import { registerCountrySlugs } from "@/lib/routing/country-slug";
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
  slug?: string;
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
  const slug = typeof r.slug === "string" ? r.slug : undefined;
  const legacyHomePath = typeof r.legacyHomePath === "string" ? r.legacyHomePath : undefined;
  const teamPath = typeof r.teamPath === "string" ? r.teamPath : undefined;
  const generalConsultationPath =
    typeof r.generalConsultationPath === "string" ? r.generalConsultationPath : undefined;
  const specialistConsultationPath =
    typeof r.specialistConsultationPath === "string" ? r.specialistConsultationPath : undefined;

  const defaultLocale = normalizeBackendLocale(r.defaultLocale);
  const supportedLocales = parseCountryLocales(r.countryLocales);

  return {
    code: code.toLowerCase(),
    name,
    ...(slug ? { slug } : {}),
    legacyHomePath,
    teamPath,
    generalConsultationPath,
    specialistConsultationPath,
    ...(defaultLocale ? { defaultLocale } : {}),
    ...(supportedLocales.length > 0 ? { supportedLocales } : {}),
  };
}

function synthesizeAdminCountry(
  code: CountryCode,
  overlay: BackendCountryOverlay,
): CountryConfig {
  // Country admin built from scratch in /admin/countries. We don't have a
  // hand-tuned seed, so derive slug + label from the supplied fields and
  // route everything to `/[slug]/[lang]/...` without legacy redirects.
  const slug = overlay.slug?.toLowerCase() ?? code;
  const defaultLocale = overlay.defaultLocale ?? "en";
  const supported = overlay.supportedLocales && overlay.supportedLocales.length > 0
    ? overlay.supportedLocales
    : [defaultLocale];
  return {
    code,
    name: overlay.name ?? code.toUpperCase(),
    label: code.toUpperCase(),
    slug,
    defaultLocale,
    supportedLocales: supported,
    legacyHomePath: overlay.legacyHomePath ?? `/${slug}`,
    teamPath: overlay.teamPath ?? `/${slug}/doctors`,
    generalConsultationPath:
      overlay.generalConsultationPath ?? `/${slug}/general-consultation`,
    specialistPath: overlay.specialistConsultationPath ?? `/${slug}/specialist-consultation`,
  };
}

/**
 * Returns the union of seeded countries and admin-added countries from
 * `/api/countries`. Seed acts as a hand-tuned template for the original
 * five markets (nicer slugs, legacy redirects, label casing); admin-added
 * rows synthesize a config on the fly. Both populate the slug↔code
 * registry so synchronous `countryCodeFromSlug` / `countrySlug` lookups
 * work for either kind.
 *
 * Falls back to seed-only when the API is unreachable so the global entry
 * page never blanks.
 */
export const getPublicCountriesMerged = cache(async (): Promise<CountryConfig[]> => {
  const res = await fetchCountries();
  if (!res.ok) {
    logPublicContentFallback("countries", res.message);
    registerCountrySlugs(fallbackCountries);
    return [...fallbackCountries];
  }

  const byCode = new Map<CountryCode, BackendCountryOverlay>();
  for (const row of res.data) {
    const extracted = extractBackendCountryOverlay(row);
    if (!extracted) continue;
    const { code, ...overlay } = extracted;
    byCode.set(code, overlay);
  }

  const seedCodes = new Set(fallbackCountries.map((c) => c.code));
  const merged: CountryConfig[] = fallbackCountries.map((seed) => {
    const overlay = byCode.get(seed.code);
    if (!overlay) return seed;
    return mergeCountryConfigWithBackend(seed, overlay);
  });

  for (const [code, overlay] of byCode.entries()) {
    if (seedCodes.has(code)) continue;
    merged.push(synthesizeAdminCountry(code, overlay));
  }

  registerCountrySlugs(merged);
  return merged;
});

/** Resolve a country from the live API merge (includes admin-added markets). */
export const getPublicCountryByCode = cache(
  async (code: string): Promise<CountryConfig | null> => {
    const normalized = code.toLowerCase();
    const list = await getPublicCountriesMerged();
    return list.find((c) => c.code === normalized) ?? null;
  },
);
