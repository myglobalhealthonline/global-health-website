import { countries as seedCountries, type CountryCode } from "@/data/countries";
import { COUNTRY_CODE_TO_SLUG } from "@/lib/routing/country-slug";
import { hreflangRegion } from "@/lib/seo/hreflang";

/**
 * How the free-tool pages are tied together for Google across markets.
 *
 * The problem this solves: `hreflangAlternates()` builds alternates across the
 * locales of ONE country. That is right for country-specific content (a
 * market's About page, its doctors) but wrong for the tools, which are the
 * same page translated for different markets. Emitted per-country, Ireland
 * declared only Ireland URLs plus its own `x-default`, Brazil only Brazil URLs
 * plus a second `x-default` — six unconnected clusters, so nothing told Google
 * that `/brazil/pt/tools/bmi-calculator` is the Brazilian version of
 * `/ireland/en/tools/bmi-calculator`. A searcher in Brazil could therefore be
 * served the Irish page, or neither, and the near-identical pages competed
 * with each other instead of each owning its own market.
 *
 * `toolHreflangAlternates` emits ONE cluster spanning every market and locale,
 * with a single x-default.
 *
 * Deliberately NOT changing `hreflangAlternates` itself — every other public
 * route depends on its per-country behaviour.
 *
 * Every market serves every locale it supports (34 pairs today). That is a
 * deliberate call: it maximises the number of country+language queries the
 * tools can appear for. The trade-off to watch is that the six English
 * variants carry identical copy and can compete with one another; the shared
 * hreflang cluster below is what keeps Google treating them as one set rather
 * than as duplicates.
 */

/** The market/locale whose URL is the x-default for the whole cluster. */
const X_DEFAULT: { code: CountryCode; lang: string } = { code: "ie", lang: "en" };

export type ToolMarket = {
  code: CountryCode;
  slug: string;
  lang: string;
  /** BCP-47 tag, e.g. "pt-BR". Unique per market/locale pair. */
  hreflang: string;
};

const slugFor = (code: CountryCode): string =>
  COUNTRY_CODE_TO_SLUG[code] ??
  seedCountries.find((country) => country.code === code)?.slug ??
  code;

const localesOf = (country: (typeof seedCountries)[number]): string[] => {
  const defaultLang = (country.defaultLocale ?? "en").toLowerCase();
  const supported = country.supportedLocales?.map((locale) => locale.toLowerCase()) ?? [];
  // Default locale first, then the rest, de-duplicated.
  return [defaultLang, ...supported.filter((locale) => locale !== defaultLang)];
};

/** Every market/locale pair that serves tool pages, in a stable order. */
export function toolMarkets(): ToolMarket[] {
  const out: ToolMarket[] = [];
  for (const country of seedCountries) {
    for (const lang of localesOf(country)) {
      out.push({
        code: country.code,
        slug: slugFor(country.code),
        lang,
        hreflang: `${lang}-${hreflangRegion(country.code)}`,
      });
    }
  }
  return out;
}

/**
 * Does this market serve tools in this language? True whenever the market
 * supports the locale — the tools ship everywhere. Kept as a named predicate
 * so the route, the sitemap and the footer link all agree, and so narrowing
 * the set later is a one-place change.
 */
export function isToolMarket(code: string, lang: string): boolean {
  const country = seedCountries.find((c) => c.code === code.toLowerCase());
  if (!country) return false;
  return localesOf(country).includes(lang.toLowerCase());
}

/**
 * One hreflang cluster covering every market/locale that serves this tool
 * path, plus a single x-default. Paths are site-relative —
 * `buildPublicMetadata` absolutises them.
 */
export function toolHreflangAlternates(suffix: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const market of toolMarkets()) {
    out[market.hreflang] = `/${market.slug}/${market.lang}${suffix}`;
  }
  out["x-default"] = `/${slugFor(X_DEFAULT.code)}/${X_DEFAULT.lang}${suffix}`;
  return out;
}
