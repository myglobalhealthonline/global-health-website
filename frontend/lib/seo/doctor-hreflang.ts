import type { CountryConfig } from "@/data/countries";
import { getPublicDoctorsForMarket } from "@/lib/content/get-public-doctors";
import { isPublicDoctorRecordIndexable } from "@/lib/content/publication-validation";
import { indexableHreflangCluster } from "@/lib/seo/hreflang";

/**
 * hreflang cluster for a doctor profile.
 *
 * A noindexed profile participates in no cluster at all — not as a target and
 * not as a source. hreflang is a reciprocal claim between publishable
 * alternates, so a page that tells Google to skip it has nothing to assert
 * about its siblings, and the siblings already advertise each other. Returning
 * early also means the 173 noindex doctor locale pages do no market-roster
 * reads at all.
 *
 * For an indexable page, membership comes from the SAME
 * `isPublicDoctorRecordIndexable` decision the robots tag and `app/sitemap.ts`
 * use — there is no second, hreflang-specific publication rule:
 *   • the CURRENT locale is included by construction; the caller only reaches
 *     here when this page renders index,follow, so it can never advertise
 *     itself while telling Google not to index it;
 *   • OTHER locales are judged by the market roster, the identical source
 *     `sitemap.ts` reads, so every advertised target is guaranteed to also be a
 *     submitted URL.
 *
 * Falling out of that, without needing a rule of their own: a retired doctor
 * (410 at the edge, absent from the roster), a slug that only resolves in
 * another market, and a de-accented alias slug are all simply never found in a
 * market's roster and so are never advertised.
 *
 * ponytail: the sibling lookups are sequential, one awaited roster read per
 * extra locale (at most five). Each is `cache()`-wrapped and the rosters are
 * already warm for any market being crawled, so this has not been worth a
 * Promise.all yet — revisit if doctor-page TTFB is ever measured as a problem.
 */
export async function doctorHreflangCluster(
  config: CountryConfig,
  doctorSlug: string,
  currentLang: string,
  currentIndexable: boolean,
): Promise<Record<string, string> | undefined> {
  if (!currentIndexable) return undefined;

  const current = currentLang.toLowerCase();
  const defaultLocale = (config.defaultLocale ?? "en").toLowerCase();
  const langs = (config.supportedLocales ?? [defaultLocale]).map((l) => l.toLowerCase());
  const eligible: string[] = [];
  for (const lang of langs) {
    if (lang === current) {
      eligible.push(lang);
      continue;
    }
    const roster = await getPublicDoctorsForMarket(config.code, lang);
    if (roster.some((d) => d.slug === doctorSlug && isPublicDoctorRecordIndexable(d))) {
      eligible.push(lang);
    }
  }
  return indexableHreflangCluster(config, `/doctors/${doctorSlug}`, eligible);
}
