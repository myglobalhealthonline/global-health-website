import { countries } from "@/data/countries";
import { getPublicDoctorsForMarket } from "@/lib/content/get-public-doctors";
import { isPublicDoctorRecordIndexable } from "@/lib/content/publication-validation";

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
  return `${baseTitle} · ${currentCountry}`;
}
