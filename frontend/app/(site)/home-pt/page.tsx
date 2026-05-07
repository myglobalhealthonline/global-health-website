import type { Metadata } from "next";
import { CountryHomeTemplate } from "@/components/templates/CountryHomeTemplate";
import { toCountryHomeTemplateProps } from "@/lib/content/home-page-presenters";
import { getTemplatePageData } from "@/lib/content/template-page-data";

export const metadata: Metadata = {
  title: "Clinic Portugal | Global Health",
  description: "Portugal online medical clinic with GP and specialist consultation booking.",
  robots: { index: false, follow: true },
};

export default async function Page() {
  const data = await getTemplatePageData("/home-pt", "pt");
  return <CountryHomeTemplate {...toCountryHomeTemplateProps(data)} />;
}
