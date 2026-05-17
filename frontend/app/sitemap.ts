import type { MetadataRoute } from "next";
import { getPublicCountriesMerged } from "@/lib/content/get-public-countries";
import { countrySlug } from "@/lib/routing/country-slug";
import { getSiteUrl } from "@/lib/seo/site-url";
import { getPublicDoctorsNormalized } from "@/lib/content/get-public-doctors";

/**
 * Phase 1 sitemap. Emits only canonical, indexable routes.
 *   • Country home + the four section routes per country (live admin list,
 *     not the hardcoded five — see `getPublicCountriesMerged`)
 *   • Doctor profile pages
 *
 * Excluded:
 *   • The global entry `/` — it's a country picker, not a content target.
 *   • The country root `/{country}` — redirects to `/{country}/{defaultLocale}`.
 *   • Auth + account routes.
 *   • Every legacy Wix slug (handled by proxy 308s and disallowed in robots.txt).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const urls: MetadataRoute.Sitemap = [];

  const countries = await getPublicCountriesMerged();

  for (const country of countries) {
    const slug = `/${country.slug || countrySlug(country.code)}`;
    const lang = (country.defaultLocale ?? "en").toLowerCase();
    urls.push(
      { url: `${base}${slug}/${lang}`, changeFrequency: "weekly", priority: 0.9 },
      { url: `${base}${slug}/${lang}/doctors`, changeFrequency: "weekly", priority: 0.8 },
      {
        url: `${base}${slug}/${lang}/general-consultation`,
        changeFrequency: "weekly",
        priority: 0.8,
      },
      {
        url: `${base}${slug}/${lang}/specialist-consultation`,
        changeFrequency: "weekly",
        priority: 0.8,
      },
      { url: `${base}${slug}/${lang}/book-online`, changeFrequency: "monthly", priority: 0.6 },
    );
  }

  // Static legal / global pages.
  urls.push(
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  );

  // Doctor profile pages — one per active doctor, in their country/language.
  try {
    const byCode = new Map(countries.map((c) => [c.code, c]));
    const allDoctors = await getPublicDoctorsNormalized();
    for (const d of allDoctors) {
      const country = byCode.get(d.countryCode);
      if (!country) continue;
      const slug = country.slug || countrySlug(d.countryCode);
      const lang = (country.defaultLocale ?? "en").toLowerCase();
      urls.push({
        url: `${base}/${slug}/${lang}/doctors/${d.slug}`,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch {
    // Doctor list unavailable — sitemap still emits the country tree.
  }

  return urls;
}
