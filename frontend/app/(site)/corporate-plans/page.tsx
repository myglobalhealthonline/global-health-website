import type { Metadata } from "next";
import { StaticMarketingTemplate } from "@/components/templates/StaticMarketingTemplate";
import { getMarketingPageData } from "@/lib/content/marketing-page-data";

export const metadata: Metadata = {
  title: "Corporate Plans",
  description: "Corporate online healthcare access options for teams and organizations.",
};

export default function Page() {
  const data = getMarketingPageData("/corporate-plans");
  return <StaticMarketingTemplate {...data} />;
}
