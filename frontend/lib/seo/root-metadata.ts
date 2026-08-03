import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";
import { getSiteUrl } from "@/lib/seo/site-url";
import { buildPublicMetadata } from "@/lib/seo/page-seo";

const DESCRIPTION =
  "Online medical consultations with licensed clinicians across Ireland, Czechia, Portugal, Spain, and Romania.";

const rootFallback = buildPublicMetadata({
  path: "/",
  title: SITE_NAME,
  description: DESCRIPTION,
  kind: "country",
  subtitle: "Medicine Anytime Anywhere",
});

/**
 * Metadata every root layout re-exports. Lives here rather than in one
 * layout because the app has several root layouts (see RootDocument) and
 * `metadataBase` + the `%s · Global Health` title template must apply to
 * all of them identically.
 */
export const rootMetadata: Metadata = {
  ...rootFallback,
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  // `app/icon.png` / `app/apple-icon.png` already emit these via Next's file
  // convention — declared explicitly too so the <link rel="icon"> tags are
  // guaranteed to render (SEO audit Phase 4 #1). `app/favicon.ico` covers the
  // literal /favicon.ico request browsers/crawlers make regardless of the
  // <link> tags.
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
    shortcut: [{ url: "/favicon.ico" }],
    apple: [{ url: "/apple-icon.png" }],
  },
};
