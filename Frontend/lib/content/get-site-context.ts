import { countries } from "@/data/countries";
import { buildSiteNavigationData } from "@/data/navigation";
import { getCommonLocale } from "@/lib/i18n/get-common-locale";
import type { LocaleCode } from "@/lib/i18n/types";

/**
 * Transitional content source.
 * Phase 0: uses seed files.
 * Phase 1+: replace with Prisma-backed fetches per country/domain.
 */
export async function getSiteContext(locale: LocaleCode = "en") {
  const common = getCommonLocale(locale);
  const navigation = buildSiteNavigationData(common, countries);

  return {
    locale,
    common,
    navigation,
    countries,
  };
}
