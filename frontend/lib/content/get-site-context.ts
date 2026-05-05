import { fetchCountries } from "@/lib/api/site-content-api";
import { getFallbackSiteContext } from "@/lib/content/fallback-site-context";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { resolveCountry } from "@/lib/routing/resolve-country";
import type { SiteContextInput } from "@/lib/routing/types";

/**
 * Phase 1 runtime adapter.
 * Frontend remains self-contained when backend is offline.
 * Backend country reads are additive and never replace fallback safety.
 */
export async function getSiteContext(input: SiteContextInput | string = {}) {
  const normalizedInput: SiteContextInput =
    typeof input === "string" ? { explicitLocale: input } : input;

  const countryContext = resolveCountry({
    host: normalizedInput.host,
    pathname: normalizedInput.pathname,
    defaultCountryCode: normalizedInput.explicitCountryCode,
  });

  const locale = resolveLocale({
    explicitLocale: normalizedInput.explicitLocale,
    headerLocale: normalizedInput.headerLocale,
    countryDefaultLocale: countryContext.country.defaultLocale,
    cookieLocale: normalizedInput.cookieLocale,
    acceptLanguageHeader: normalizedInput.acceptLanguageHeader,
  });

  const fallback = await getFallbackSiteContext(countryContext, locale);
  const backendCountries = await fetchCountries();

  if (!backendCountries.ok) {
    return fallback;
  }

  const mergedActiveCountries = fallback.activeCountries.map((country) => {
    const backendCountry = backendCountries.data.find((item) => item.code === country.code);
    if (!backendCountry) {
      return country;
    }

    return {
      ...country,
      name: backendCountry.name,
      legacyHomePath: backendCountry.legacyHomePath,
      teamPath: backendCountry.teamPath,
      generalConsultationPath: backendCountry.generalConsultationPath,
      specialistPath: backendCountry.specialistConsultationPath,
    };
  });

  return {
    ...fallback,
    activeCountries: mergedActiveCountries,
  };
}
