import { buildSiteNavigationData } from "@/data/navigation";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import type { LocaleCode } from "@/lib/i18n/types";
import type { CountryRuntimeContext } from "@/lib/routing/types";
import { getCountryContent } from "./get-country-content";

export async function getFallbackSiteContext(
  countryContext: CountryRuntimeContext,
  locale: LocaleCode,
) {
  const localeBundle = loadLocaleBundle(locale);
  const countryContent = await getCountryContent(countryContext.country);

  return {
    country: countryContent.country,
    activeCountries: countryContent.activeCountries,
    supportedLocales: countryContent.supportedLocales,
    selectedLocale: locale,
    localeBundle,
    common: localeBundle.common,
    navigation: buildSiteNavigationData(localeBundle.common, countryContent.activeCountries),
    services: countryContent.services,
    doctors: countryContent.doctors,
    pricingPlans: countryContent.pricingPlans,
    badges: countryContent.badges,
    assets: countryContent.assets,
    resolution: countryContext,
  };
}
