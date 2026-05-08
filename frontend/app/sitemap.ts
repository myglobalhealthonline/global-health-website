import type { MetadataRoute } from "next";
import { publicRouteRegistry } from "@/lib/routing/public-route-registry";
import { getSiteUrl } from "@/lib/seo/site-url";
import { getApprovedPublicBlogPosts } from "@/lib/content/get-public-blog-posts";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const seen = new Set<string>();
  const urls: MetadataRoute.Sitemap = [];
  const approvedBlogPosts = await getApprovedPublicBlogPosts();
  const approvedBlogPathSet = new Set(approvedBlogPosts.map((post) => `/post/${post.slug}`));
  const noindexStatic = new Set([
    "/login",
    "/register",
    "/forgot-password",
    "/account",
    "/pricing-plans/list",
    "/terms-and-conditions",
    "/privacy-policy",
    "/copy-of-privacy-policy",
    "/refund-policy",
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
    if (route.path.startsWith("/post/") && !approvedBlogPathSet.has(route.path)) continue;
    if (route.path === "/blog" && approvedBlogPosts.length === 0) continue;
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
