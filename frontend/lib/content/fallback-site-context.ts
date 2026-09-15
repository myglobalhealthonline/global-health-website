import { buildSiteNavigationData } from "@/data/navigation";
import { brazilOnly, loadLocaleBundle } from "@/lib/i18n/load-locale";
import type { LocaleCode } from "@/lib/i18n/types";
import type { CountryRuntimeContext } from "@/lib/routing/types";
import { getCountryContent } from "./get-country-content";

export async function getFallbackSiteContext(
  countryContext: CountryRuntimeContext,
  locale: LocaleCode,
) {
  // Brazil only: header/footer navigation labels get the pt-BR layer.
  const localeBundle = loadLocaleBundle(locale, brazilOnly(countryContext.country.code));
  const countryContent = await getCountryContent(countryContext.country);

  return {
    country: countryContent.country,
    activeCountries: countryContent.activeCountries,
    supportedLocales: countryContent.supportedLocales,
    selectedLocale: locale,
    localeBundle,
    common: localeBundle.common,
    navigation: buildSiteNavigationData(
      localeBundle.common,
      countryContent.activeCountries,
      countryContext.country.code,
      locale,
    ),
    services: countryContent.services,
    doctors: countryContent.doctors,
    pricingPlans: countryContent.pricingPlans,
    badges: countryContent.badges,
    assets: countryContent.assets,
    resolution: countryContext,
  };
}
