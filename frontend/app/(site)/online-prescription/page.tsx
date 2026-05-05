import type { Metadata } from "next";
import { StaticMarketingTemplate } from "@/components/templates/StaticMarketingTemplate";
import { getMarketingPageData } from "@/lib/content/marketing-page-data";

export const metadata: Metadata = {
  title: "Online Prescription",
  description: "Template-driven marketing page.",
};

export default function Page() {
  const data = getMarketingPageData("/online-prescription");
  return <StaticMarketingTemplate {...data} />;
}
