import type { CountryCode } from "@/data/countries";

/** URL slug → internal country code. Slugs are full English names for SEO/UX clarity. */
export const COUNTRY_SLUG_TO_CODE: Record<string, CountryCode> = {
  ireland: "ie",
  portugal: "pt",
  spain: "sp",
  czechia: "cz",
  romania: "rm",
};

export const COUNTRY_CODE_TO_SLUG: Record<CountryCode, string> = {
  ie: "ireland",
  pt: "portugal",
  sp: "spain",
  cz: "czechia",
  rm: "romania",
};

export function countryCodeFromSlug(slug: string): CountryCode | null {
  return COUNTRY_SLUG_TO_CODE[slug.toLowerCase()] ?? null;
}

export function countrySlug(code: CountryCode): string {
  return COUNTRY_CODE_TO_SLUG[code];
}
