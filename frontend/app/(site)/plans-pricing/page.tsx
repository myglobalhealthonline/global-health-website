import type { Metadata } from "next";
import { StaticMarketingTemplate } from "@/components/templates/StaticMarketingTemplate";
import { getMarketingPageData } from "@/lib/content/marketing-page-data";

export const metadata: Metadata = {
  title: "Plans and Pricing",
  description: "Compare Global Health consultation pricing and service options.",
};

export default function Page() {
  const data = getMarketingPageData("/plans-pricing");
  return <StaticMarketingTemplate {...data} />;
}
