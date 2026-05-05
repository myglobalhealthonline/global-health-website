import { getFallbackSiteContext } from "@/lib/content/fallback-site-context";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { resolveCountry } from "@/lib/routing/resolve-country";
import type { SiteContextInput } from "@/lib/routing/types";

/**
 * Phase 1 runtime adapter.
 * Frontend remains self-contained when backend is offline.
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

  // TODO(phase 2): optionally fetch country content from `${NEXT_PUBLIC_API_URL}`.
  // Keep fallback static path as source of truth while backend business APIs are scaffold-only.
  return getFallbackSiteContext(countryContext, locale);
}
