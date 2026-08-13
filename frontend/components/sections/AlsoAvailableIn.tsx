import Link from "next/link";
import type { CountryConfig } from "@/data/countries";
import { indexableHreflangCluster } from "@/lib/seo/hreflang";
import { localizedLanguageLabel } from "@/lib/content/languages";

/**
 * Cross-silo internal linking (SEO audit 3.7). Surfaces a page's hreflang
 * cluster as real, crawlable `<a>` links instead of letting it live only in
 * `<head>`, so PageRank earned by one locale's article can flow to its
 * sibling-language version of the same page. Must render in the raw server
 * HTML (no client JS) — the footer locale-switcher bug this project already
 * paid for once was exactly a JS-only link row.
 *
 * Deliberately does NOT cross country silos (Ireland → Spain): the hreflang
 * map only clusters same-country, same-content, different-language variants —
 * there's no reliable slug-equivalence mapping across separately authored
 * per-country content to link to instead.
 *
 * `eligibleLocales` is REQUIRED, not optional (international-locale batch,
 * 2026-08-09): this used to build its link set from the unfiltered
 * `hreflangAlternates(country, suffix)`, which advertises every locale the
 * COUNTRY supports regardless of whether THIS page has a real translation in
 * it. Once `/health/[slug]` and service pages started noindexing
 * fallback-locale renders (`resolveTranslation`'s exact-locale ->
 * country-default fallback), that made this component the one surface still
 * capable of putting a crawlable link to a fallback/noindexed variant into
 * server HTML — exactly the bug the noindex fix closed everywhere else.
 * Callers pass the SAME eligible-locale set their own robots/hreflang
 * decision already computed (`eligibleLandingLocales` for `/health/`,
 * `indexableServiceLocales` for `/services/`) — no second eligibility rule
 * invented here.
 *
 * Visually hidden on purpose (2026-08-09): the PageRank-flow value comes
 * entirely from the `<a href>` being present in server HTML — a crawler
 * follows it whether or not a human ever sees it rendered. `sr-only` keeps
 * the real anchor tags (and screen-reader / keyboard access) without a
 * visible link-dump section on every page.
 */
export function AlsoAvailableIn({
  country,
  lang,
  suffix = "",
  title,
  eligibleLocales,
}: {
  country: CountryConfig;
  lang: string;
  suffix?: string;
  title: string;
  /** Locales THIS page is genuinely available in — the same set its own
   *  robots/hreflang decision already computed. */
  eligibleLocales: Iterable<string>;
}) {
  const current = lang.toLowerCase();
  const cluster = indexableHreflangCluster(country, suffix, eligibleLocales);
  if (!cluster) return null;
  const links = Object.entries(cluster)
    .filter(([tag]) => tag !== "x-default")
    .map(([tag, href]) => ({ tag, targetLang: tag.split("-")[0], href }))
    .filter((l) => l.targetLang !== current);

  if (links.length === 0) return null;

  return (
    <nav aria-label={title} className="sr-only">
      <h2>{title}</h2>
      <ul>
        {links.map((l) => (
          <li key={l.tag}>
            <Link href={l.href} hrefLang={l.tag}>
              {localizedLanguageLabel(l.targetLang, current)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
