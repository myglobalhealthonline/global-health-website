import { countries, type CountryConfig } from "@/data/countries";
import { COUNTRY_CODE_TO_SLUG } from "@/lib/routing/country-slug";

/**
 * Build hreflang `alternates.languages` map for a `[country]/[lang]/{suffix}` page.
 * Returns one entry per locale supported by the country, plus an `x-default`
 * pointing at the country's default-locale variant.
 *
 * Use as: `alternates: { canonical, languages: hreflangAlternates(country, suffix) }`.
 */
export function hreflangAlternates(
  country: CountryConfig,
  suffix: string = "",
): Record<string, string> {
  const slug = COUNTRY_CODE_TO_SLUG[country.code];
  const defaultLang = (country.defaultLocale ?? "en").toLowerCase();
  const out: Record<string, string> = {};
  // CountryConfig.supportedLocales is present on the seed data, but some
  // shapes don't expose it — fall back to {defaultLocale}.
  const supported = (country as unknown as { supportedLocales?: string[] }).supportedLocales ?? [
    defaultLang,
  ];
  for (const raw of supported) {
    const lang = raw.toLowerCase();
    out[lang] = `/${slug}/${lang}${suffix}`;
  }
  out["x-default"] = `/${slug}/${defaultLang}${suffix}`;
  return out;
}

/** Build hreflang for the global entry page (/) — points to each country root. */
export function hreflangForRoot(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of countries) {
    const slug = COUNTRY_CODE_TO_SLUG[c.code];
    const lang = (c.defaultLocale ?? "en").toLowerCase();
    out[lang] = `/${slug}/${lang}`;
  }
  out["x-default"] = "/";
  return out;
}
