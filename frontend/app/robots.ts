import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/*", "/account", "/account/*", "/login", "/register", "/forgot-password"],
      },
    ],
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}

