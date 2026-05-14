import { StaticMarketingTemplate } from "@/components/templates/StaticMarketingTemplate";
import { getMarketingPageData } from "@/lib/content/marketing-page-data";
import { pageMetadata } from "@/lib/seo/page-seo";

export const metadata = pageMetadata("/plans-pricing");

export default function Page() {
  const data = getMarketingPageData("/plans-pricing");
  return <StaticMarketingTemplate {...data} />;
}
