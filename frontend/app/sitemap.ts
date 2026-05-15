import type { MetadataRoute } from "next";
import { countries } from "@/data/countries";
import { publicRouteRegistry } from "@/lib/routing/public-route-registry";
import { COUNTRY_CODE_TO_SLUG } from "@/lib/routing/country-slug";
import { getSiteUrl } from "@/lib/seo/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const seen = new Set<string>();
  const urls: MetadataRoute.Sitemap = [];

  // Phase 1 country-first hierarchy: /{country}/{lang}/{...}.
  // The country root (/{country}) is a 301 to /{country}/{defaultLocale} and is
  // omitted from the sitemap to avoid redirect chains.
  for (const country of countries) {
    const slug = `/${COUNTRY_CODE_TO_SLUG[country.code]}`;
    const lang = (country.defaultLocale ?? "en").toLowerCase();
    const subroutes: Array<{ path: string; priority: number }> = [
      { path: `${slug}/${lang}`, priority: 0.9 },
      { path: `${slug}/${lang}/doctors`, priority: 0.8 },
      { path: `${slug}/${lang}/general-consultation`, priority: 0.8 },
      { path: `${slug}/${lang}/specialist-consultation`, priority: 0.8 },
      { path: `${slug}/${lang}/book-online`, priority: 0.6 },
    ];
    for (const sr of subroutes) {
      if (seen.has(sr.path)) continue;
      seen.add(sr.path);
      urls.push({
        url: `${base}${sr.path}`,
        changeFrequency: "weekly",
        priority: sr.priority,
      });
    }
  }

  const noindexStatic = new Set([
    "/login",
    "/register",
    "/forgot-password",
    "/account",
    "/blog",
    "/frequent-asked-questions",
    "/pricing-plans/list",
    "/terms-and-conditions",
    "/privacy",
    "/privacy-policy",
    "/copy-of-privacy-policy",
    "/return-and-refund-policy",
    "/refund-policy",
    "/cookies-policy",
    "/legal-notices",
    "/gdpr-compliance",
    "/home",
    "/home-pt",
    "/home-sp",
    "/home-cz",
    "/home-rm",
    "/ireland-team",
    "/portugal-team",
    "/spain-team",
    "/czechia-team",
    "/romania-team",
    "/general-consultation-ie",
    "/general-consultation-pt",
    "/general-consultation-sp",
    "/general-consultation-cz",
    "/general-consultation-rm",
    "/specialty-ie",
    "/specialty-pt",
    "/specialty-sp",
    "/specialty-cz",
    "/specialty-rm",
    // Intermediate (pre-[lang]) routes — now 301'd to /{country}/{lang}/...
    "/ireland",
    "/portugal",
    "/spain",
    "/czechia",
    "/romania",
    "/ireland/team",
    "/portugal/team",
    "/spain/team",
    "/czechia/team",
    "/romania/team",
    "/ireland/services",
    "/portugal/services",
    "/spain/services",
    "/czechia/services",
    "/romania/services",
    "/ireland/specialists",
    "/portugal/specialists",
    "/spain/specialists",
    "/czechia/specialists",
    "/romania/specialists",
    // Wix /service-page/* surface — collapsed to country general-consultation
    "/book-online",
  ]);

  for (const route of publicRouteRegistry) {
    if (route.path !== route.canonicalPath) continue;
    if (route.path.includes("[")) continue;
    if (route.path.startsWith("/admin") || route.path.startsWith("/account")) continue;
    if (noindexStatic.has(route.path)) continue;
    if (route.path.startsWith("/category/")) continue;
    if (route.path.startsWith("/post/")) continue;
    if (seen.has(route.path)) continue;
    seen.add(route.path);
    urls.push({
      url: `${base}${route.path}`,
      changeFrequency: "weekly",
      priority: route.path === "/" ? 1 : 0.7,
    });
  }

  return urls;
}
