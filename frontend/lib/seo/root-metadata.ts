import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";
import { getSiteUrl } from "@/lib/seo/site-url";
import { buildPublicMetadata } from "@/lib/seo/page-seo";

// NOTE (2026-08-04): this is the fallback for routes that set no title of
// their own — it is NOT what `/` renders. The entry gate has its own
// locale-aware metadata in app/(global)/page.tsx, sourced from each locale's
// `entryGate.seoTitle` / `seoDescription`, which already names the service and
// the markets for the brand-adjacent queries `/` ranks on. Editing the
// constants here does not change the gate's snippet; edit the locale bundles.
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
};
