import { type CountryConfig } from "@/data/countries";
import { COUNTRY_CODE_TO_SLUG } from "@/lib/routing/country-slug";

/**
 * Region subtag for the hreflang attribute (uppercase ISO 3166-1 alpha-2).
 *
 * Every seeded internal code already equals its ISO region
 * (`ie→IE, cz→CZ, pt→PT, es→ES, ro→RO, br→BR`), and admin-added countries are
 * constrained to lowercase alphanum, so an uppercase is the region tag.
 *
 * ponytail: no per-code override map — none needed today. If an internal code
 * ever diverges from its ISO region (e.g. `uk` → should be `GB`), add a
 * `Record<code, region>` lookup here before this `toUpperCase()`.
 */
export function hreflangRegion(code: string): string {
  return code.toUpperCase();
}

/**
 * Country's supported locales, lowercased. `CountryConfig.supportedLocales` is
 * present on the seed data, but some shapes don't expose it — fall back to the
 * default locale.
 */
function supportedLocalesOf(country: CountryConfig): string[] {
  const defaultLang = (country.defaultLocale ?? "en").toLowerCase();
  const supported = (country as unknown as { supportedLocales?: string[] }).supportedLocales ?? [
    defaultLang,
  ];
  return supported.map((l) => l.toLowerCase());
}

/**
 * Build hreflang `alternates.languages` map for a `[country]/[lang]/{suffix}` page.
 * Keys are region-qualified BCP-47 tags (`en-IE`, `pt-IE`, …) so Google targets
 * the right language *and* market; the URL path keeps the bare `[lang]` segment.
 * Includes an `x-default` pointing at the country's default-locale variant.
 *
 * Use as: `alternates: { canonical, languages: hreflangAlternates(country, suffix) }`.
 */
export function hreflangAlternates(
  country: CountryConfig,
  suffix: string = "",
): Record<string, string> {
  const slug = COUNTRY_CODE_TO_SLUG[country.code];
  const region = hreflangRegion(country.code);
  const defaultLang = (country.defaultLocale ?? "en").toLowerCase();
  const out: Record<string, string> = {};
  for (const lang of supportedLocalesOf(country)) {
    out[`${lang}-${region}`] = `/${slug}/${lang}${suffix}`;
  }
  out["x-default"] = `/${slug}/${defaultLang}${suffix}`;
  return out;
}

/**
 * `hreflangAlternates` restricted to the locales that actually render
 * `index,follow`, given a per-locale eligibility verdict the caller has already
 * computed from its own publication rule.
 *
 * hreflang is a reciprocal claim that each listed URL is a publishable
 * alternate, so a cluster containing a noindexed variant asks Google to index a
 * page that says the opposite about itself. This builder holds the URL shape
 * and the x-default convention; it deliberately does NOT decide indexability —
 * that stays with the caller's single source of truth.
 *
 * `eligibleLocales` is the set of already-verified locales, lowercase. Returns
 * `undefined` when it is empty: a record with no publishable variant anywhere
 * advertises no alternates at all, rather than an x-default pointing at a page
 * we just excluded.
 */
export function indexableHreflangCluster(
  country: CountryConfig,
  suffix: string,
  eligibleLocales: Iterable<string>,
): Record<string, string> | undefined {
  const slug = COUNTRY_CODE_TO_SLUG[country.code];
  const region = hreflangRegion(country.code);
  const defaultLang = (country.defaultLocale ?? "en").toLowerCase();
  const eligible = new Set([...eligibleLocales].map((l) => l.toLowerCase()));
  const out: Record<string, string> = {};
  // Iterate the country's configured order, not the caller's, so x-default's
  // fallback pick is deterministic rather than dependent on Set insertion.
  for (const lang of supportedLocalesOf(country)) {
    if (!eligible.has(lang)) continue;
    out[`${lang}-${region}`] = `/${slug}/${lang}${suffix}`;
  }
  if (Object.keys(out).length === 0) return undefined;
  // Prefer the market's own language. When that variant is not publishable,
  // fall to the first configured locale that is — never to an excluded one.
  out["x-default"] = out[`${defaultLang}-${region}`] ?? Object.values(out)[0];
  return out;
}

/**
 * Natural region for a language's OWN locale tag (`en` -> British English,
 * `de` -> Germany, …) — used for `og:locale:alternate` entries, which name
 * *other* language versions of the page and therefore must carry a real,
 * valid locale for that language, not the host country's region.
 *
 * ponytail: flat map for the 6 seeded site languages. Add an entry here
 * before adding a 7th to `LocaleCode`.
 */
const LANGUAGE_NATIVE_REGION: Record<string, string> = {
  es: "ES",
  en: "GB",
  pt: "PT",
  cs: "CZ",
  ro: "RO",
  de: "DE",
};

/**
 * Open Graph locale pair for Meta/Facebook — feeds `og:locale` +
 * `og:locale:alternate`. Meta requires `language_REGION` with an UNDERSCORE
 * (`en_IE`), unlike the hyphen hreflang uses. `locale` is the page's current
 * language, regionalised to THIS country (e.g. an Ireland English page is
 * intentionally `en_IE`, not `en_GB` — the content targets that market).
 * `alternateLocale` lists the *other* language versions of the same page —
 * each stamped with ITS OWN natural region, not the host country's, so a
 * Spanish page's English alternate reads `en_GB`, not the nonsensical
 * `en_ES` (and its German alternate reads `de_DE`, not `de_ES`).
 *
 * Use as: `openGraph: { …, ...ogLocales(country, lang) }`.
 */
export function ogLocales(
  country: CountryConfig,
  lang: string,
): { locale: string; alternateLocale: string[] } {
  const region = hreflangRegion(country.code);
  const current = lang.toLowerCase();
  return {
    locale: `${current}_${region}`,
    alternateLocale: supportedLocalesOf(country)
      .filter((l) => l !== current)
      .map((l) => `${l}_${LANGUAGE_NATIVE_REGION[l] ?? l.toUpperCase()}`),
  };
}
