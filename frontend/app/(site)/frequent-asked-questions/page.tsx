import type { Metadata } from "next";
import { StaticMarketingTemplate } from "@/components/templates/StaticMarketingTemplate";
import { getMarketingPageData } from "@/lib/content/marketing-page-data";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: "Answers about booking, consultation types, privacy, and follow-up.",
};

export default function Page() {
  const data = getMarketingPageData("/frequent-asked-questions");
  return <StaticMarketingTemplate {...data} />;
}
