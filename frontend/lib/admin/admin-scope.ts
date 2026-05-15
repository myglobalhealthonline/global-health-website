import "server-only";
import { cookies } from "next/headers";
import { COUNTRY_PREF_COOKIE } from "@/app/(admin)/admin/_components/country-picker-constants";
import type { AdminCountryDto } from "@/lib/admin/admin-api";

export type ActiveAdminCountry = {
  id: string;
  slug: string;
  code: string;
  name: string;
} | null;

/**
 * Read the `gh_admin_country` cookie value. Returns null if missing or if the
 * cookie has been corrupted by a malformed write (defensive: only accept
 * lowercase a–z and hyphens, which matches our real slug shape).
 */
export async function readActiveCountrySlug(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(COUNTRY_PREF_COOKIE)?.value;
  if (!value) return null;
  if (!/^[a-z-]{2,32}$/.test(value)) return null;
  return value;
}

/**
 * Resolve the active country (from cookie) against a list of admin countries.
 * Returns null if no country is picked or the slug doesn't match any country.
 */
export function resolveActiveCountry(
  slug: string | null,
  countries: AdminCountryDto[],
): ActiveAdminCountry {
  if (!slug) return null;
  const match = countries.find((c) => c.slug === slug);
  if (!match) return null;
  return {
    id: match.id,
    slug: match.slug,
    code: match.code,
    name: match.name,
  };
}

/**
 * Convenience: resolve the active country in one call. Caller must pass the
 * already-fetched countries list (we don't re-fetch to keep render fast).
 */
export async function getActiveCountry(
  countries: AdminCountryDto[],
): Promise<ActiveAdminCountry> {
  const slug = await readActiveCountrySlug();
  return resolveActiveCountry(slug, countries);
}

/**
 * Default-scope helper: if the URL doesn't already specify a country filter,
 * return the active country's id (from cookie). Otherwise return the URL value
 * verbatim — explicit URL filters always win over the cookie default.
 *
 * Use it as:
 *   const countryId = scopedCountryId(filters.countryId, activeCountry);
 */
export function scopedCountryId(
  urlCountryId: string | undefined,
  activeCountry: ActiveAdminCountry,
): string | undefined {
  if (urlCountryId !== undefined && urlCountryId !== "") return urlCountryId;
  return activeCountry?.id;
}

/**
 * Same as `scopedCountryId` but returns the country code (lowercase, e.g. "ie")
 * for endpoints that filter on country code rather than id.
 */
export function scopedCountryCode(
  urlCountryCode: string | undefined,
  activeCountry: ActiveAdminCountry,
): string | undefined {
  if (urlCountryCode !== undefined && urlCountryCode !== "") return urlCountryCode;
  return activeCountry?.code.toLowerCase();
}
