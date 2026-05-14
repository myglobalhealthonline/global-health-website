import type { Metadata } from "next";
import { ComingSoon } from "@/components/site-stub/coming-soon";

export const metadata: Metadata = {
  title: "Global Health — Medicine without borders",
  description:
    "Online medical consultations across Ireland, Portugal, Spain, Czechia, and Romania. New site coming soon.",
};

export default function Page() {
  return <ComingSoon />;
}
