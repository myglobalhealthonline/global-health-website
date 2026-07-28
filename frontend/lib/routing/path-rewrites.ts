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

const KNOWN_LOCALES = new Set(["en", "pt", "es", "cs", "ro", "de"]);
// Fallback regex for when the slug registry is cold on the client.
// Matches /{country-slug}/{lang}/... where country slug is 2+ letters and
// lang is a known 2-letter locale. Does not collide with locale codes.
const COUNTRY_LANG_PATH_RE = /^\/([a-z]{2,})\/([a-z]{2})(?:\/|$)/i;

export function parseSitePath(pathname: string): ParsedSitePath {
  const segments = (pathname || "/").split("/").filter(Boolean);
  // Consult the live registry on every call (the proxy reflects runtime
  // registrations) instead of snapshotting the slug set at module load,
  // which missed admin-added countries and broke href generation.
  let country: string | null =
    segments[0] && segments[0].toLowerCase() in COUNTRY_SLUG_TO_CODE
      ? segments[0]
      : null;

  // Registry cold? Use the regex fallback so switchers still work on the
  // first client render before registerCountrySlugs has run.
  if (!country) {
    const match = COUNTRY_LANG_PATH_RE.exec(pathname || "/");
    if (match) {
      const maybeSlug = match[1].toLowerCase();
      const maybeLang = match[2].toLowerCase();
      // Only treat as a country slug if it doesn't look exactly like a locale
      // code, unless the registry confirms it. This avoids mis-parsing
      // /pt/en/doctors as country=pt when it's actually a lang-first legacy path.
      if (maybeSlug.length > 2 || maybeSlug in COUNTRY_SLUG_TO_CODE) {
        country = maybeSlug;
        segments[0] = maybeSlug;
        segments[1] = maybeLang;
      }
    }
  }

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
  // No country, or a country-scoped path with NO locale segment to swap
  // (e.g. `/brazil/dr-renato`) — there is nothing to rewrite. Without the
  // `lang` guard this returned `/brazil/en`, i.e. the language switcher threw
  // the visitor off the page they were reading onto the country home, and
  // `rest` is empty in exactly that case so the page slug was silently lost.
  // Returning the path unchanged makes the switcher fall through to its
  // cookie + router.refresh() branch, which re-renders this same page.
  if (!parsed.country || !parsed.lang) return pathname;
  const tail = parsed.rest.length > 0 ? `/${parsed.rest.join("/")}` : "";
  return `/${parsed.country}/${newLang}${tail}`;
}
