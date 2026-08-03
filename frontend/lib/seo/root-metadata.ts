import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";
import { getSiteUrl } from "@/lib/seo/site-url";
import { buildPublicMetadata } from "@/lib/seo/page-seo";

// SEO 2026-08-04: `/` is the country gate and it takes 5,342 impressions a
// quarter at position 16.8 — almost all of them brand-adjacent queries
// ("clinic global health" 423 impressions / 0 clicks at position 8.1,
// "global health clinic" 268/1, "global health medical services" 253/1).
// A bare "Global Health" title tells a searcher who typed "global health
// clinic" nothing about what this is, which is the likeliest reason ~1,200
// top-10 impressions convert at roughly zero. Title and description now say
// "online clinic" and name the markets.
const DESCRIPTION =
  "Global Health is an online clinic: video consultations with registered doctors in Ireland, Portugal, Spain, Czechia and Romania. Same-day appointments.";

const GATE_TITLE = `${SITE_NAME} | Online Clinic & Video Doctor Consultations`;

const rootFallback = buildPublicMetadata({
  path: "/",
  title: GATE_TITLE,
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
  // `default` is what the gate and any route without its own title render;
  // `template` is unchanged, so every page that sets a title is unaffected.
  title: {
    default: GATE_TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: DESCRIPTION,
};
