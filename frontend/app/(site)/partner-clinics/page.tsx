import type { Metadata } from "next";
import { StaticMarketingTemplate } from "@/components/templates/StaticMarketingTemplate";
import { getMarketingPageData } from "@/lib/content/marketing-page-data";

export const metadata: Metadata = {
  title: "Partner Clinics",
  description: "Template-driven marketing page.",
};

export default function Page() {
  const data = getMarketingPageData("/partner-clinics");
  return <StaticMarketingTemplate {...data} />;
}
