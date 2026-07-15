import {
  countries as staticCountries,
  getCountryByCode,
  type CountryCode,
  type CountryConfig,
} from "@/data/countries";
import { getEnabledDomainConfig } from "@/lib/routing/domain-map";
import { legacyPrefixToCountry } from "@/lib/routing/legacy-route-map";
import type { CountryRuntimeContext, ResolveCountryInput } from "@/lib/routing/types";

const DEFAULT_COUNTRY_CODE: CountryCode = "ie";

function normalizePathname(pathname?: string | null): string {
  if (!pathname) return "/";
  return pathname.toLowerCase().split("?")[0] ?? "/";
}

function findByCode(list: CountryConfig[], code: CountryCode | null | undefined) {
  if (!code) return undefined;
  return list.find((c) => c.code === code);
}

/**
 * `input.countries`, when supplied, is the admin/DB-merged country list
 * (`getPublicCountriesMerged()`) — resolution then reflects admin-edited
 * `defaultLocale` and admin-added countries instead of only the static seed.
 * Defaults to the static seed when omitted, which is what the edge
 * middleware (`proxy.ts` → `getRequestContext`) always does — it never
 * fetches at the edge, by design.
 */
export function resolveCountry(input: ResolveCountryInput = {}): CountryRuntimeContext {
  const list = input.countries ?? staticCountries;
  const pathname = normalizePathname(input.pathname);

  // Canonical routes are `/{country-slug}/{lang}/...`. An explicit country
  // slug in the URL is the strongest signal of intent — it must win over the
  // host's domain default so a `/portugal/pt` page served from a shared (or
  // localhost) domain renders Portuguese regulators in the footer, not the
  // domain fallback. Slugs (portugal, ireland, …) don't collide with locale
  // codes, so matching the first segment here is safe.
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  if (firstSegment) {
    const byPathSlug = list.find((c) => c.slug.toLowerCase() === firstSegment);
    if (byPathSlug) return { country: byPathSlug, reason: "path-slug" };
  }

  const domainConfig = getEnabledDomainConfig(input.host);
  if (domainConfig) {
    const byDomain = findByCode(list, domainConfig.countryCode);
    if (byDomain) return { country: byDomain, reason: "domain" };
  }

  const matchedLegacy = legacyPrefixToCountry.find(({ prefix }) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (matchedLegacy) {
    const byPath = findByCode(list, matchedLegacy.countryCode);
    if (byPath) return { country: byPath, reason: "legacy-path" };
  }

  const fallbackCode = input.defaultCountryCode ?? DEFAULT_COUNTRY_CODE;
  // List-first, then the static seed (covers a fetch failure that returned
  // an unexpectedly narrow list), then the list's own first entry — never
  // throws even if every lookup misses.
  const fallbackCountry =
    findByCode(list, fallbackCode) ??
    getCountryByCode(fallbackCode) ??
    list[0] ??
    staticCountries[0];
  return { country: fallbackCountry, reason: "fallback" };
}
