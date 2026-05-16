import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/*",
          "/account",
          "/account/*",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/verify-email",
          "/api/",
          // Legacy Wix slugs — now 301'd; keep crawlers from indexing the redirect source
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
          "/service-page/*",
          "/copy-of-*",
        ],
      },
    ],
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}

