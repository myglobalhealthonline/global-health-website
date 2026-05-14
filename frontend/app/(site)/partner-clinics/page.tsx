import { StaticMarketingTemplate } from "@/components/templates/StaticMarketingTemplate";
import { getMarketingPageData } from "@/lib/content/marketing-page-data";
import { pageMetadata } from "@/lib/seo/page-seo";

export const metadata = pageMetadata("/partner-clinics");

export default function Page() {
  const data = getMarketingPageData("/partner-clinics");
  return <StaticMarketingTemplate {...data} />;
}
