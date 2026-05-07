import type { Metadata } from "next";
import { StaticMarketingTemplate } from "@/components/templates/StaticMarketingTemplate";
import { getMarketingPageData } from "@/lib/content/marketing-page-data";

export const metadata: Metadata = {
  title: "Gift Card",
  description: "Gift card information for eligible Global Health consultation bookings.",
};

export default function Page() {
  const data = getMarketingPageData("/gift-card");
  return <StaticMarketingTemplate {...data} />;
}
