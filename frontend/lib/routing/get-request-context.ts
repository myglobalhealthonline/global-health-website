import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { supportedLocaleCodes, type LocaleCode } from "@/lib/i18n/types";
import { getEnabledDomainConfig } from "@/lib/routing/domain-map";
import { matchLegacyRoute } from "@/lib/routing/legacy-route-map";
import { resolveCountry } from "@/lib/routing/resolve-country";
import type { RequestRoutingContext } from "@/lib/routing/types";

function normalizePathname(pathname?: string | null): string {
  if (!pathname) return "/";
  return pathname.split("?")[0] ?? "/";
}

function getLocaleFromPath(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0]?.toLowerCase();
  if (!first) return null;
  if (supportedLocaleCodes.includes(first as LocaleCode)) {
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
