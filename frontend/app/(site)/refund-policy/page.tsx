import type { Metadata } from "next";
import { StaticMarketingTemplate } from "@/components/templates/StaticMarketingTemplate";
import { getMarketingPageData } from "@/lib/content/marketing-page-data";

export const metadata: Metadata = {
  title: "Refund Policy (Legacy)",
  description: "Template-driven marketing page.",
};

export default function Page() {
  const data = getMarketingPageData("/refund-policy");
  return <StaticMarketingTemplate {...data} />;
}
