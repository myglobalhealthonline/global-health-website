import { countries, type CountryConfig } from "@/data/countries";
import { doctors } from "@/data/doctors";
import { services } from "@/data/services";
import type { LocaleCode } from "@/lib/i18n/types";

export type CountryContent = {
  country: CountryConfig;
  activeCountries: CountryConfig[];
  supportedLocales: LocaleCode[];
  services: readonly unknown[];
  doctors: readonly unknown[];
  pricingPlans: readonly unknown[];
  badges: readonly unknown[];
  assets: readonly unknown[];
};

/**
 * Phase 1 adapter:
 * frontend stays functional from static fallback data.
 * Future phase: fetch this from backend APIs by country+locale.
 */
export async function getCountryContent(country: CountryConfig): Promise<CountryContent> {
  return {
    country,
    activeCountries: countries,
    supportedLocales: country.supportedLocales,
    services,
    doctors,
    // Subscription plans are per-country runtime data now (get-country-plans.ts);
    // the static site-context fallback carries none.
    pricingPlans: [],
    badges: [],
    assets: [],
  };
}
