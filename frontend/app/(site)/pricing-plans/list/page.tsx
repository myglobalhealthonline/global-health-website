import type { Metadata } from "next";
import { StaticMarketingTemplate } from "@/components/templates/StaticMarketingTemplate";
import { mergePricingPlansIntoMarketingPage } from "@/lib/content/get-public-pricing";
import { getMarketingPageData } from "@/lib/content/marketing-page-data";

export const metadata: Metadata = {
  title: "Pricing Plans List",
  description: "Template-driven marketing page.",
};

export default async function Page() {
  const base = getMarketingPageData("/pricing-plans/list");
  const data = await mergePricingPlansIntoMarketingPage(base);
  return <StaticMarketingTemplate {...data} />;
}
