import { countries, getCountryByCode, type CountryCode } from "@/data/countries";
import { getEnabledDomainConfig } from "@/lib/routing/domain-map";
import { legacyPrefixToCountry } from "@/lib/routing/legacy-route-map";
import type { CountryRuntimeContext, ResolveCountryInput } from "@/lib/routing/types";

const DEFAULT_COUNTRY_CODE: CountryCode = "ie";

function normalizePathname(pathname?: string | null): string {
  if (!pathname) return "/";
  return pathname.toLowerCase().split("?")[0] ?? "/";
}

export function resolveCountry(input: ResolveCountryInput = {}): CountryRuntimeContext {
  const pathname = normalizePathname(input.pathname);

  // Canonical routes are `/{country-slug}/{lang}/...`. An explicit country
  // slug in the URL is the strongest signal of intent — it must win over the
  // host's domain default so a `/portugal/pt` page served from a shared (or
  // localhost) domain renders Portuguese regulators in the footer, not the
  // domain fallback. Slugs (portugal, ireland, …) don't collide with locale
  // codes, so matching the first segment here is safe.
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  if (firstSegment) {
    const byPathSlug = countries.find((c) => c.slug.toLowerCase() === firstSegment);
    if (byPathSlug) return { country: byPathSlug, reason: "path-slug" };
  }

  const domainConfig = getEnabledDomainConfig(input.host);
  if (domainConfig) {
    const byDomain = getCountryByCode(domainConfig.countryCode);
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
