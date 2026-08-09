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
 * The sibling lookups run in parallel (Promise.all), not sequentially — a
 * chain of up to five awaited roster reads was slow enough to lose the race
 * against Next's streaming-metadata head flush, landing <title>/canonical/
 * hreflang outside <head> for crawlers not covered by next.config.ts's
 * `htmlLimitedBots` (confirmed via a Screaming Frog "Outside <head>" cluster
 * on doctor + service pages). Each read is independent and `cache()`-wrapped.
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
  const others = langs.filter((lang) => lang !== current);
  const rosters = await Promise.all(
    others.map((lang) => getPublicDoctorsForMarket(config.code, lang)),
  );
  const eligibleOthers = new Set(
    others.filter((_, i) =>
      rosters[i].some((d) => d.slug === doctorSlug && isPublicDoctorRecordIndexable(d)),
    ),
  );
  const eligible = langs.filter((lang) => lang === current || eligibleOthers.has(lang));
  return indexableHreflangCluster(config, `/doctors/${doctorSlug}`, eligible);
}
