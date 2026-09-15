import { countries } from "@/data/countries";
import { getPublicDoctorsForMarket } from "@/lib/content/get-public-doctors";
import { isPublicDoctorRecordIndexable } from "@/lib/content/publication-validation";
import type { CountryConfig } from "@/data/countries";
import { localeDisplayName } from "@/lib/i18n/locale-display";
import type { LocaleCode } from "@/lib/i18n/types";
import { fitSearchTitle, SEARCH_TITLE_LIMIT } from "@/lib/seo/page-seo";

/**
 * Country names this doctor slug is genuinely publishable in, across every
 * seeded market — the SAME `isPublicDoctorRecordIndexable` predicate the
 * profile page's `noindex` tag and `app/sitemap.ts` already use. There is no
 * second, title-specific publication rule and no hardcoded doctor list: a
 * doctor is "in" a market purely because that market's roster contains their
 * slug and the record clears the indexability bar.
 *
 * One roster read per market, at its default locale — country-level
 * publication fields (bio, credentials, editorialChecklist) don't vary by
 * locale, so checking every locale per market would just repeat the same
 * verdict at 6x the cost.
 */
export async function doctorIndexableCountryNames(doctorSlug: string): Promise<string[]> {
  const rosters = await Promise.all(
    countries.map((c) => getPublicDoctorsForMarket(c.code, c.defaultLocale)),
  );
  const names: string[] = [];
  countries.forEach((c, i) => {
    const doc = rosters[i].find((d) => d.slug === doctorSlug);
    if (doc && isPublicDoctorRecordIndexable(doc)) names.push(c.name);
  });
  return names;
}

function titleMentionsCountry(title: string, country: string): boolean {
  const escaped = country.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Unicode-aware boundary, not `\b`: JS's `\b`/`\w` are ASCII-only, so it
  // silently never matched diacritic-leading names ("Česko") — invisible
  // until this function started receiving localized country names, since
  // every English country name is plain ASCII.
  return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "iu").test(title);
}

/**
 * Market-specific SERP `<title>` for a doctor genuinely published in more
 * than one country. Doctors listed in exactly one market (the overwhelming
 * majority) are returned unchanged — this only differentiates the small set
 * of cross-listed clinicians whose admin `seoTitle` is currently shared
 * verbatim across both country pages. Nothing else about the page (H1, slug,
 * canonical, hreflang, structured data) is touched.
 *
 * `localizedCountryName` — the current locale's own translation of the
 * country (e.g. `common.countryNames.cz` = "Česko" on a `cs` route),
 * already loaded by every caller for other UI copy. An admin `seoTitle`
 * written in the page's language sometimes names the country in that
 * language rather than the site's English `currentCountry` value (SEO-002
 * audit: "... Global Health Česká republika" already naming Czechia before
 * this function's English-only check appended "· Czechia" again). Checking
 * both forms catches that without a translation table — it only matches the
 * site's own existing per-locale label, not arbitrary free-text phrasing an
 * admin might use instead.
 */
export function withMarketTitle(
  baseTitle: string,
  currentCountry: string,
  indexableCountryNames: string[],
  localizedCountryName?: string | null,
): string {
  if (indexableCountryNames.length <= 1) return baseTitle;
  if (titleMentionsCountry(baseTitle, currentCountry)) return baseTitle;
  if (localizedCountryName && titleMentionsCountry(baseTitle, localizedCountryName)) {
    return baseTitle;
  }
  return withReservedSuffix(baseTitle, ` · ${currentCountry}`);
}

/**
 * Append a disambiguating suffix without letting the 60-char search budget in
 * `buildPublicMetadata` drop it again: that budget removes trailing segments
 * first, which is exactly where the suffix sits. The base is fitted into the
 * room left over instead (2026-09-15 metadata budget batch).
 */
function withReservedSuffix(baseTitle: string, suffix: string): string {
  return `${fitSearchTitle(baseTitle, SEARCH_TITLE_LIMIT - Array.from(suffix).length)}${suffix}`;
}

/**
 * Locale-variant titles of the same doctor in the same market. Reads the
 * sibling locale rosters `doctorHreflangCluster` already loads (both are
 * `cache()`-wrapped, so a request pays for them once).
 */
export async function doctorSiblingLocaleTitles(
  config: CountryConfig,
  doctorSlug: string,
  currentLang: string,
  fallbackTitle: (doctor: { fullName: string; title: string }) => string,
): Promise<string[]> {
  const current = currentLang.toLowerCase();
  const defaultLocale = (config.defaultLocale ?? "en").toLowerCase();
  const others = (config.supportedLocales ?? [defaultLocale])
    .map((l) => l.toLowerCase())
    .filter((lang) => lang !== current);
  const rosters = await Promise.all(others.map((lang) => getPublicDoctorsForMarket(config.code, lang)));
  return rosters.flatMap((roster) => {
    const doc = roster.find((d) => d.slug === doctorSlug && isPublicDoctorRecordIndexable(d));
    return doc ? [doc.seoTitle ?? fallbackTitle(doc)] : [];
  });
}

/**
 * Language disambiguation for a doctor whose title is identical in two locales
 * of one market — job titles often translate the same in es and pt
 * ("Psicóloga", "Pediatra consultor"). 2026-09-15 OpenSEO audit: 8
 * duplicate-title rows, e.g. /ireland/es and /ireland/pt/doctors/dr-emmanuel-dabup.
 * Only a real collision (after the search budget) gets the language name, in
 * that language ("Español", "Português"); every other title is unchanged.
 */
export function withLanguageTitle(
  title: string,
  locale: string,
  siblingLocaleTitles: readonly string[],
): string {
  const fitted = fitSearchTitle(title);
  if (!siblingLocaleTitles.some((other) => fitSearchTitle(other) === fitted)) return title;
  return withReservedSuffix(title, ` · ${localeDisplayName(locale as LocaleCode)}`);
}
