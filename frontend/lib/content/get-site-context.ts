import { buildSiteNavigationData } from "@/data/navigation";
import { getFallbackSiteContext } from "@/lib/content/fallback-site-context";
import { getPublicAssetsNormalized } from "@/lib/content/get-public-assets";
import { getPublicCountriesMerged } from "@/lib/content/get-public-countries";
import { getPublicDoctorsNormalized } from "@/lib/content/get-public-doctors";
import { getPublicPricingPlansNormalized } from "@/lib/content/get-public-pricing";
import { getPublicServicesNormalized } from "@/lib/content/get-public-services";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { resolveCountry } from "@/lib/routing/resolve-country";
import type { SiteContextInput } from "@/lib/routing/types";

/**
 * Runtime site context: prefers backend public reads when `NEXT_PUBLIC_API_URL` is set
 * and responses succeed; otherwise falls back to static seed adapters. Never throws on API loss.
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

  const [activeCountries, apiServices, apiDoctors, apiPricing, apiAssets] = await Promise.all([
    getPublicCountriesMerged(),
    getPublicServicesNormalized(),
    getPublicDoctorsNormalized(),
    getPublicPricingPlansNormalized(),
    getPublicAssetsNormalized(),
  ]);

  const navigation = buildSiteNavigationData(fallback.common, activeCountries);

  return {
    ...fallback,
    activeCountries,
    navigation,
    services: apiServices.length > 0 ? apiServices : fallback.services,
    doctors: apiDoctors.length > 0 ? apiDoctors : fallback.doctors,
    pricingPlans: apiPricing.length > 0 ? apiPricing : fallback.pricingPlans,
    assets: apiAssets.length > 0 ? apiAssets : fallback.assets,
  };
}
