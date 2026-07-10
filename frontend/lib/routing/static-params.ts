import { countries } from "@/data/countries";

/**
 * Cartesian product of every seeded country's URL slug × its supported
 * locales, for `[country]/[lang]` route pages that want full static
 * coverage instead of defaultLocale-only. Pure/sync/hardcoded — reads only
 * `data/countries.ts`, never the network or DB, so it's safe to call from
 * `generateStaticParams` even when the backend is unreachable at build time.
 */
export function countryLangParams(): { country: string; lang: string }[] {
  return countries.flatMap((c) =>
    c.supportedLocales.map((lang) => ({ country: c.slug, lang: lang.toLowerCase() })),
  );
}
