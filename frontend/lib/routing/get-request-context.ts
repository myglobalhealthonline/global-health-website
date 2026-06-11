import { countries } from "@/data/countries";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { supportedLocaleCodes, type LocaleCode } from "@/lib/i18n/types";
import { getEnabledDomainConfig } from "@/lib/routing/domain-map";
import { matchLegacyRoute } from "@/lib/routing/legacy-route-map";
import { resolveCountry } from "@/lib/routing/resolve-country";
import type { RequestRoutingContext } from "@/lib/routing/types";

// Country URL segments (both code and slug forms, e.g. "pt"/"portugal").
// Several country codes (pt, es, ro, de, cs→cz) collide with locale codes,
// so a first path segment that names a country must never be read as a lang.
const countryPathSegments = new Set(
  countries.flatMap((c) => [c.code.toLowerCase(), c.slug.toLowerCase()]),
);

function normalizePathname(pathname?: string | null): string {
  if (!pathname) return "/";
  return pathname.split("?")[0] ?? "/";
}

function getLocaleFromPath(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0]?.toLowerCase();
  const second = segments[1]?.toLowerCase();

  // /{country}/{lang}/... — lang lives in the SECOND segment. Check it
  // first: country codes like "pt" double as locale codes, so matching
  // the first segment would stamp Portuguese for /pt/en/doctors.
  if (second && supportedLocaleCodes.includes(second as LocaleCode)) {
    return second;
  }

  // /{lang}/... lang-first legacy shape — only when the first segment
  // isn't a country code/slug.
  if (
    first &&
    supportedLocaleCodes.includes(first as LocaleCode) &&
    !countryPathSegments.has(first)
  ) {
    return first;
  }

  return null;
}

export function getRequestContext(input: {
  host?: string | null;
  pathname?: string | null;
  acceptLanguageHeader?: string | null;
  localeCookie?: string | null;
}): RequestRoutingContext {
  const pathname = normalizePathname(input.pathname);
  const domainConfig = getEnabledDomainConfig(input.host);

  const countryResolution = resolveCountry({
    host: input.host,
    pathname,
    defaultCountryCode: domainConfig?.countryCode,
  });

  const explicitLocale = getLocaleFromPath(pathname);
  const locale = resolveLocale({
    explicitLocale,
    cookieLocale: input.localeCookie,
    acceptLanguageHeader: input.acceptLanguageHeader,
    countryDefaultLocale: countryResolution.country.defaultLocale ?? domainConfig?.defaultLocale ?? "en",
  });

  const matchedLegacyRoute = matchLegacyRoute(pathname);

  return {
    host: input.host?.toLowerCase().replace(/:\d+$/, "") ?? null,
    pathname,
    countryCode: countryResolution.country.code,
    locale,
    isLegacyRoute: Boolean(matchedLegacyRoute),
    matchedLegacyRoute,
  };
}
