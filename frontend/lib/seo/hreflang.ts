import { countries, type CountryConfig } from "@/data/countries";
import { COUNTRY_CODE_TO_SLUG } from "@/lib/routing/country-slug";

/**
 * Internal country code → ISO 3166-1 alpha-2 region used in the hreflang
 * attribute (`<lang>-<REGION>`, e.g. `en-IE`). Only `rm` (Romania) diverges
 * from a plain uppercase of the internal code; the other seeded markets
 * already match their ISO region. Admin-added countries fall back to the
 * uppercased internal code (best effort — an admin choosing a non-ISO code
 * accepts a non-ISO region tag).
 */
const CODE_TO_REGION: Record<string, string> = {
  ie: "IE",
  cz: "CZ",
  pt: "PT",
  es: "ES",
  rm: "RO",
};

/** Region subtag for the hreflang attribute (uppercase ISO 3166-1 alpha-2). */
export function hreflangRegion(code: string): string {
  return CODE_TO_REGION[code.toLowerCase()] ?? code.toUpperCase();
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
  // CountryConfig.supportedLocales is present on the seed data, but some
  // shapes don't expose it — fall back to {defaultLocale}.
  const supported = (country as unknown as { supportedLocales?: string[] }).supportedLocales ?? [
    defaultLang,
  ];
  for (const raw of supported) {
    const lang = raw.toLowerCase();
    out[`${lang}-${region}`] = `/${slug}/${lang}${suffix}`;
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
    out[`${lang}-${hreflangRegion(c.code)}`] = `/${slug}/${lang}`;
  }
  out["x-default"] = "/";
  return out;
}
