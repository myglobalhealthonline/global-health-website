import type { MetadataRoute } from "next";
import { countries } from "@/data/countries";
import { COUNTRY_CODE_TO_SLUG } from "@/lib/routing/country-slug";
import { getSiteUrl } from "@/lib/seo/site-url";
import { getPublicDoctorsNormalized } from "@/lib/content/get-public-doctors";

/**
 * Phase 1 sitemap. Emits only canonical, indexable routes.
 *   • Country home + the four section routes per country
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

  for (const country of countries) {
    const slug = `/${COUNTRY_CODE_TO_SLUG[country.code]}`;
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

  // Doctor profile pages — one per active doctor, in their country/language.
  try {
    const allDoctors = await getPublicDoctorsNormalized();
    for (const d of allDoctors) {
      const slug = COUNTRY_CODE_TO_SLUG[d.countryCode];
      const country = countries.find((c) => c.code === d.countryCode);
      const lang = (country?.defaultLocale ?? "en").toLowerCase();
      if (!slug) continue;
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
