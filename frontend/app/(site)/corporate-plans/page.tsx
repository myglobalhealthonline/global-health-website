import { StaticMarketingTemplate } from "@/components/templates/StaticMarketingTemplate";
import { getMarketingPageData } from "@/lib/content/marketing-page-data";
import { pageMetadata } from "@/lib/seo/page-seo";

export const metadata = pageMetadata("/corporate-plans");

export default function Page() {
  const data = getMarketingPageData("/corporate-plans");
  return <StaticMarketingTemplate {...data} />;
}
