import { buildSiteNavigationData } from "@/data/navigation";
import { getFallbackSiteContext } from "@/lib/content/fallback-site-context";
import { getPublicCountriesMerged } from "@/lib/content/get-public-countries";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { resolveCountry } from "@/lib/routing/resolve-country";
import type { SiteContextInput } from "@/lib/routing/types";

/**
 * Runtime site context. Returns the locale bundle (`common`) and the
 * navigation tree, both used by `(site)/layout.tsx`. The earlier version
 * also fetched services/doctors/pricing/assets here but the layout never
 * consumed those — Phase 1 page-level fetchers (`getCountryDoctors`,
 * `getCountryServices`, `getPublicPage`, etc.) own those reads now and
 * they're properly cached with revalidate tags. Dropping the layout-level
 * waterfall saves three round-trips per public page render.
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
  const activeCountries = await getPublicCountriesMerged();
  const navigation = buildSiteNavigationData(fallback.common, activeCountries);

  return {
    ...fallback,
    activeCountries,
    navigation,
  };
}
