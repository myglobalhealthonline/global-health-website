import type { MetadataRoute } from "next";
import { publicRouteRegistry } from "@/lib/routing/public-route-registry";
import { getSiteUrl } from "@/lib/seo/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const seen = new Set<string>();
  const urls: MetadataRoute.Sitemap = [];
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
    "/home-pt",
    "/home-sp",
    "/home-cz",
    "/home-rm",
    "/general-consultation-pt",
    "/general-consultation-sp",
    "/general-consultation-cz",
    "/general-consultation-rm",
    "/specialty-pt",
    "/specialty-sp",
    "/specialty-cz",
    "/specialty-rm",
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
