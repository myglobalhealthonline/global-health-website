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
 * Open Graph locale pair for Meta/Facebook — feeds `og:locale` +
 * `og:locale:alternate`. Meta requires `language_REGION` with an UNDERSCORE
 * (`en_IE`), unlike the hyphen hreflang uses; same region source, different
 * separator. `locale` is the page's current language; `alternateLocale` lists
 * the country's other supported languages.
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
      .map((l) => `${l}_${region}`),
  };
}
