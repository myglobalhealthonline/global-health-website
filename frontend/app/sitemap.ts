import type { MetadataRoute } from "next";
import { publicRouteRegistry } from "@/lib/routing/public-route-registry";
import { getSiteUrl } from "@/lib/seo/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const seen = new Set<string>();
  const urls: MetadataRoute.Sitemap = [];

  for (const route of publicRouteRegistry) {
    if (route.path !== route.canonicalPath) continue;
    if (route.path.includes("[")) continue;
    if (route.path.startsWith("/admin") || route.path.startsWith("/account")) continue;
    if (route.path === "/login" || route.path === "/register" || route.path === "/forgot-password") continue;
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

