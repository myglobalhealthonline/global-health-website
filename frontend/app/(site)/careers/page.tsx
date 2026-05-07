import type { Metadata } from "next";
import { StaticMarketingTemplate } from "@/components/templates/StaticMarketingTemplate";
import { getMarketingPageData } from "@/lib/content/marketing-page-data";

export const metadata: Metadata = {
  title: "Careers",
  description: "Career opportunities supporting online healthcare access at Global Health.",
};

export default function Page() {
  const data = getMarketingPageData("/careers");
  return <StaticMarketingTemplate {...data} />;
}
