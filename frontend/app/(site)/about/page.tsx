import type { Metadata } from "next";
import { StaticMarketingTemplate } from "@/components/templates/StaticMarketingTemplate";
import { getMarketingPageData } from "@/lib/content/marketing-page-data";

export const metadata: Metadata = {
  title: "About Global Health",
  description: "How Global Health helps patients access online consultations across supported countries.",
};

export default function Page() {
  const data = getMarketingPageData("/about");
  return <StaticMarketingTemplate {...data} />;
}
