import type { Metadata } from "next";
import { StaticMarketingTemplate } from "@/components/templates/StaticMarketingTemplate";
import { mergePricingPlansIntoMarketingPage } from "@/lib/content/get-public-pricing";
import { getMarketingPageData } from "@/lib/content/marketing-page-data";

export const metadata: Metadata = {
  title: "Plans and Pricing",
  description: "Compare Global Health consultation pricing and service options.",
};

export default async function Page() {
  const base = getMarketingPageData("/plans-pricing");
  const data = await mergePricingPlansIntoMarketingPage(base);
  return <StaticMarketingTemplate {...data} />;
}
