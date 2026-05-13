import type { Metadata } from "next";
import { ComingSoon } from "@/components/site-stub/coming-soon";

export const metadata: Metadata = {
  title: "Global Health — Medicine without borders",
  description:
    "Online medical consultations across Ireland, Portugal, Spain, Czechia, and Romania. New site coming soon.",
};

/**
 * Catch-all so legacy Wix URLs (e.g. /ireland-team, /home-pt, /post/[slug])
 * render the coming-soon stub instead of 404 during the portal rebuild.
 */
export default function CatchAllPage() {
  return <ComingSoon />;
}
