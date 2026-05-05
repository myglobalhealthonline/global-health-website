import { countries, getCountryByCode, type CountryCode } from "@/data/countries";
import { domainToCountry, legacyPrefixToCountry } from "@/lib/routing/legacy-route-map";
import type { CountryRuntimeContext, ResolveCountryInput } from "@/lib/routing/types";

const DEFAULT_COUNTRY_CODE: CountryCode = "ie";

function normalizeHost(host?: string | null): string | null {
  if (!host) return null;
  return host.toLowerCase().replace(/:\d+$/, "");
}

function normalizePathname(pathname?: string | null): string {
  if (!pathname) return "/";
  return pathname.toLowerCase().split("?")[0] ?? "/";
}

export function resolveCountry(input: ResolveCountryInput = {}): CountryRuntimeContext {
  const pathname = normalizePathname(input.pathname);
  const normalizedHost = normalizeHost(input.host);

  if (normalizedHost && domainToCountry[normalizedHost]) {
    const byDomain = getCountryByCode(domainToCountry[normalizedHost]);
    if (byDomain) return { country: byDomain, reason: "domain" };
  }

  const matchedLegacy = legacyPrefixToCountry.find(({ prefix }) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (matchedLegacy) {
    const byPath = getCountryByCode(matchedLegacy.countryCode);
    if (byPath) return { country: byPath, reason: "legacy-path" };
  }

  const fallbackCode = input.defaultCountryCode ?? DEFAULT_COUNTRY_CODE;
  const fallbackCountry = getCountryByCode(fallbackCode) ?? countries[0];
  return { country: fallbackCountry, reason: "fallback" };
}
