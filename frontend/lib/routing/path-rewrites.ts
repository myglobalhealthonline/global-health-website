import { COUNTRY_SLUG_TO_CODE } from "@/lib/routing/country-slug";

/**
 * Path rewriters used by the public header's country + language switchers.
 *
 * The contract: take an existing pathname like `/ireland/en/doctors/dr-x` and
 * return a new pathname with one segment swapped. If the pathname doesn't
 * match the `[country]/[lang]/…` shape we expect, the helpers return a safe
 * fallback ("/" or "/{country}" / "/{country}/{lang}") rather than corrupt
 * the URL.
 */

export type ParsedSitePath = {
  country: string | null;
  lang: string | null;
  rest: string[]; // path segments after [lang]
};

const COUNTRY_SLUGS = new Set(Object.keys(COUNTRY_SLUG_TO_CODE));
const KNOWN_LOCALES = new Set(["en", "pt", "es", "cs", "ro", "de"]);

export function parseSitePath(pathname: string): ParsedSitePath {
  const segments = (pathname || "/").split("/").filter(Boolean);
  const country = segments[0] && COUNTRY_SLUGS.has(segments[0]) ? segments[0] : null;
  const lang =
    country && segments[1] && KNOWN_LOCALES.has(segments[1]) ? segments[1] : null;
  const rest = country && lang ? segments.slice(2) : [];
  return { country, lang, rest };
}

/** Swap the `[country]` segment, defaulting the locale to the new country's default. */
export function swapCountryInPath(
  pathname: string,
  newCountrySlug: string,
  newCountryDefaultLocale: string,
): string {
  const parsed = parseSitePath(pathname);
  // If the user was inside a country page, preserve the section (rest path).
  if (parsed.country && parsed.lang) {
    const tail = parsed.rest.length > 0 ? `/${parsed.rest.join("/")}` : "";
    return `/${newCountrySlug}/${newCountryDefaultLocale}${tail}`;
  }
  return `/${newCountrySlug}/${newCountryDefaultLocale}`;
}

/** Swap the `[lang]` segment, preserving everything else. */
export function swapLangInPath(pathname: string, newLang: string): string {
  const parsed = parseSitePath(pathname);
  if (!parsed.country) return pathname;
  const tail = parsed.rest.length > 0 ? `/${parsed.rest.join("/")}` : "";
  return `/${parsed.country}/${newLang}${tail}`;
}
