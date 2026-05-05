import { countries } from "@/data/countries";
import { buildSiteNavigationData } from "@/data/navigation";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import type { LocaleCode } from "@/lib/i18n/types";

/**
 * Transitional content source.
 * Phase 0: uses seed files.
 * Phase 1+: replace with backend API/domain-aware runtime adapters.
 */
export async function getSiteContext(locale: LocaleCode = "en") {
  // TODO: switch to backend API data fetches via NEXT_PUBLIC_API_URL.
  const common = getCommonLocale(locale);
  const navigation = buildSiteNavigationData(common, countries);

  return {
    locale,
    common,
    navigation,
    countries,
  };
}
