import { countries as seedCountries, type CountryCode, type CountryConfig } from "@/data/countries";

/**
 * Country slug ↔ code registry. Earlier this was a hand-maintained pair
 * of `Record<string, CountryCode>` objects with the five seeded markets
 * baked in; admins could create a sixth Country row in /admin/countries
 * but the public site couldn't resolve `/<new-slug>` because the slug
 * map was source-only.
 *
 * Today the registry is a mutable singleton seeded from `data/countries.ts`
 * at module load and extended by `getPublicCountriesMerged()` every time
 * the country list is fetched (server-side, per request). Sync lookups
 * (`countryCodeFromSlug`, `countrySlug`) stay sync because every server
 * page that hits these helpers also goes through `getPublicCountriesMerged`
 * earlier in its render (either directly or via a content fetcher), so
 * the registry is warm by the time the slug→code conversion runs.
 *
 * When a sync lookup falls through, we still accept an admin-added code
 * that arrives as its own slug (e.g. `/uk/en/...` when the country was
 * created with code=`uk` and no nicer slug) so a fresh deploy without a
 * cold-warm doesn't 404 the new country.
 */

const SLUG_TO_CODE = new Map<string, CountryCode>();
const CODE_TO_SLUG = new Map<CountryCode, string>();

function upsertPair(code: CountryCode, slug: string) {
  const normalizedCode = code.toLowerCase();
  const normalizedSlug = slug.toLowerCase();
  SLUG_TO_CODE.set(normalizedSlug, normalizedCode);
  CODE_TO_SLUG.set(normalizedCode, normalizedSlug);
  // Identity fallback so the code itself is always navigable, even if
  // the registry hasn't been warmed for this request yet.
  if (!SLUG_TO_CODE.has(normalizedCode)) {
    SLUG_TO_CODE.set(normalizedCode, normalizedCode);
  }
}

for (const seed of seedCountries) {
  upsertPair(seed.code, seed.slug);
}

export function registerCountrySlugs(list: Pick<CountryConfig, "code" | "slug">[]) {
  for (const c of list) {
    if (!c.code || !c.slug) continue;
    upsertPair(c.code, c.slug);
  }
}

/** URL slug → internal country code. Slug check is case-insensitive. */
export function countryCodeFromSlug(slug: string): CountryCode | null {
  const normalized = slug.toLowerCase();
  const hit = SLUG_TO_CODE.get(normalized);
  if (hit) return hit;
  // Identity fallback: when a deploy hasn't warmed the registry yet but
  // the URL segment looks like a valid country code, accept it and let
  // the downstream `getPublicCountryByCode` call do the existence check.
  if (/^[a-z][a-z0-9-]{1,7}$/.test(normalized)) return normalized;
  return null;
}

export function countrySlug(code: CountryCode): string {
  const normalized = code.toLowerCase();
  return CODE_TO_SLUG.get(normalized) ?? normalized;
}

/**
 * Legacy named exports — kept so consumers can still import the maps as
 * objects (e.g. for enumeration in the sitemap). They reflect the
 * current state of the registry; treat them as snapshots, not live
 * views.
 */
export const COUNTRY_SLUG_TO_CODE: Record<string, CountryCode> = new Proxy(
  {},
  {
    get(_, key) {
      if (typeof key !== "string") return undefined;
      return SLUG_TO_CODE.get(key.toLowerCase());
    },
    has(_, key) {
      return typeof key === "string" && SLUG_TO_CODE.has(key.toLowerCase());
    },
    ownKeys() {
      return Array.from(SLUG_TO_CODE.keys());
    },
    getOwnPropertyDescriptor(_, key) {
      if (typeof key !== "string") return undefined;
      const v = SLUG_TO_CODE.get(key.toLowerCase());
      if (v === undefined) return undefined;
      return { enumerable: true, configurable: true, writable: false, value: v };
    },
  },
) as Record<string, CountryCode>;

export const COUNTRY_CODE_TO_SLUG: Record<CountryCode, string> = new Proxy(
  {},
  {
    get(_, key) {
      if (typeof key !== "string") return undefined;
      return CODE_TO_SLUG.get(key.toLowerCase());
    },
    has(_, key) {
      return typeof key === "string" && CODE_TO_SLUG.has(key.toLowerCase());
    },
    ownKeys() {
      return Array.from(CODE_TO_SLUG.keys());
    },
    getOwnPropertyDescriptor(_, key) {
      if (typeof key !== "string") return undefined;
      const v = CODE_TO_SLUG.get(key.toLowerCase());
      if (v === undefined) return undefined;
      return { enumerable: true, configurable: true, writable: false, value: v };
    },
  },
) as Record<CountryCode, string>;
