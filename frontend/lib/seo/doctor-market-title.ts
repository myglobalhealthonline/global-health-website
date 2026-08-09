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
  return new RegExp(`\\b${escaped}\\b`, "i").test(title);
}

/**
 * Market-specific SERP `<title>` for a doctor genuinely published in more
 * than one country. Doctors listed in exactly one market (the overwhelming
 * majority) are returned unchanged — this only differentiates the small set
 * of cross-listed clinicians whose admin `seoTitle` is currently shared
 * verbatim across both country pages. Nothing else about the page (H1, slug,
 * canonical, hreflang, structured data) is touched.
 */
export function withMarketTitle(
  baseTitle: string,
  currentCountry: string,
  indexableCountryNames: string[],
): string {
  if (indexableCountryNames.length <= 1) return baseTitle;
  if (titleMentionsCountry(baseTitle, currentCountry)) return baseTitle;
  return `${baseTitle} · ${currentCountry}`;
}
