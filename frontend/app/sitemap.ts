import type { MetadataRoute } from "next";
import { getPublicCountriesMerged } from "@/lib/content/get-public-countries";
import { countrySlug } from "@/lib/routing/country-slug";
import { getSiteUrl } from "@/lib/seo/site-url";
import { getPublicDoctorsNormalized } from "@/lib/content/get-public-doctors";
import { getPublicServicesForCountry } from "@/lib/content/get-public-services";
import { getCountryHealthTests } from "@/lib/content/get-country-collections";
import { fetchLandingSlugs } from "@/lib/api/site-content-api";
import { listBlogPosts } from "@/lib/content/get-public-blog";
import { hreflangRegion } from "@/lib/seo/hreflang";

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

  /** Enabled locales for a country, lowercase, default first. */
  const countryLangs = (country: (typeof countries)[number]): string[] => {
    const defaultLang = (country.defaultLocale ?? "en").toLowerCase();
    const langs =
      country.supportedLocales && country.supportedLocales.length > 0
        ? country.supportedLocales.map((l) => l.toLowerCase())
        : [defaultLang];
    return [defaultLang, ...langs.filter((l) => l !== defaultLang)];
  };

  /** Push one URL per enabled locale with hreflang alternates. */
  const pushLocalized = (
    country: (typeof countries)[number],
    path: string,
    priority: number,
    extra?: Partial<MetadataRoute.Sitemap[number]>,
  ) => {
    const slug = `/${country.slug || countrySlug(country.code)}`;
    const region = hreflangRegion(country.code);
    const langs = countryLangs(country);
    const languages: Record<string, string> = {};
    for (const lang of langs) {
      languages[`${lang}-${region}`] = `${base}${slug}/${lang}${path}`;
    }
    languages["x-default"] = `${base}${slug}/${langs[0]}${path}`;
    for (const lang of langs) {
      urls.push({
        url: `${base}${slug}/${lang}${path}`,
        changeFrequency: "weekly",
        priority,
        alternates: { languages },
        ...extra,
      });
    }
  };

  // Country home + section pages — every enabled locale, with hreflang
  // alternates so Google indexes each translated variant.
  for (const country of countries) {
    pushLocalized(country, "", 0.9);
    pushLocalized(country, "/doctors", 0.8);
    pushLocalized(country, "/gp-consultation-online", 0.8);
    pushLocalized(country, "/see-a-specialist", 0.8);
    pushLocalized(country, "/book", 0.85);
    pushLocalized(country, "/lab-tests", 0.7);
    pushLocalized(country, "/pricing", 0.6);
  }

  // Service detail pages — active public GP/specialist services per country.
  // (PRESCRIPTION/HOME_DELIVERY kinds stay out: hidden from the public site
  // for Ads compliance.)
  for (const country of countries) {
    try {
      const services = await getPublicServicesForCountry(country.code);
      for (const s of services) {
        if (s.kind !== "GENERAL" && s.kind !== "SPECIALIST") continue;
        pushLocalized(country, `/services/${s.slug}`, 0.7);
      }
    } catch {
      // Service list unavailable — keep the rest of the sitemap.
    }
  }

  // Lab-test detail pages.
  for (const country of countries) {
    try {
      const tests = await getCountryHealthTests(country.code);
      for (const t of tests) {
        pushLocalized(country, `/lab-tests/${t.slug}`, 0.6);
      }
    } catch {
      // Test list unavailable — keep the rest of the sitemap.
    }
  }

  // SEO landing pages — published condition/audience pages per country.
  // Indexed here (Rule 6) but deliberately absent from nav + listing pages.
  // One entry per enabled locale, each carrying hreflang alternates so Google
  // indexes the translated variants and understands they are the same page.
  for (const country of countries) {
    try {
      const res = await fetchLandingSlugs(country.code);
      if (!res.ok) continue;
      const slug = `/${country.slug || countrySlug(country.code)}`;
      const defaultLang = (country.defaultLocale ?? "en").toLowerCase();
      const region = hreflangRegion(country.code);
      const langs =
        country.supportedLocales && country.supportedLocales.length > 0
          ? country.supportedLocales.map((l) => l.toLowerCase())
          : [defaultLang];
      for (const page of res.data.landingPages) {
        const languages: Record<string, string> = {};
        for (const lang of langs) {
          languages[`${lang}-${region}`] = `${base}${slug}/${lang}/health/${page.slug}`;
        }
        languages["x-default"] = `${base}${slug}/${defaultLang}/health/${page.slug}`;
        for (const lang of langs) {
          urls.push({
            url: `${base}${slug}/${lang}/health/${page.slug}`,
            lastModified: page.updatedAt,
            changeFrequency: "monthly",
            priority: 0.6,
            alternates: { languages },
          });
        }
      }
    } catch {
      // Landing list unavailable for this country — skip, keep the rest.
    }
  }

  // Static legal / global pages.
  urls.push(
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/faq`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/blog`, changeFrequency: "weekly", priority: 0.6 },
  );

  // Blog posts — published, admin-managed. [] when API unavailable.
  try {
    const posts = await listBlogPosts();
    for (const p of posts) {
      urls.push({
        url: `${base}/blog/${p.slug}`,
        lastModified: p.publishedAt,
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  } catch {
    // Blog list unavailable — sitemap still emits the rest.
  }

  // Doctor profile pages — every enabled locale with hreflang alternates,
  // matching the section/service entries above.
  try {
    const byCode = new Map(countries.map((c) => [c.code, c]));
    const allDoctors = await getPublicDoctorsNormalized();
    for (const d of allDoctors) {
      const country = byCode.get(d.countryCode);
      if (!country) continue;
      pushLocalized(country, `/doctors/${d.slug}`, 0.7);
    }
  } catch {
    // Doctor list unavailable — sitemap still emits the country tree.
  }

  return urls;
}
