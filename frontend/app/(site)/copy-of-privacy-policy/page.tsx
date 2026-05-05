import type { Metadata } from "next";
import { StaticMarketingTemplate } from "@/components/templates/StaticMarketingTemplate";
import { getMarketingPageData } from "@/lib/content/marketing-page-data";

export const metadata: Metadata = {
  title: "Copy of Privacy Policy (Legacy)",
  description: "Template-driven marketing page.",
};

export default function Page() {
  const data = getMarketingPageData("/copy-of-privacy-policy");
  return <StaticMarketingTemplate {...data} />;
}
