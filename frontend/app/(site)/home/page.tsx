import type { Metadata } from "next";
import { CountryHomeTemplate } from "@/components/templates/CountryHomeTemplate";
import { getTemplatePageData } from "@/lib/content/template-page-data";

export const metadata: Metadata = {
  title: "Ireland Home",
  description: "Country homepage template for Ireland.",
};

export default async function Page() {
  const data = await getTemplatePageData("/home", "ie");

  return (
    <CountryHomeTemplate
      countryName={data.country.name}
      hero={{
        eyebrow: data.site.localeBundle.home.hero.eyebrow,
        title: data.site.localeBundle.home.hero.title,
        description: data.site.localeBundle.home.hero.description,
      }}
      primaryBooking={{ href: data.paths.general, label: data.site.common.cta.primaryBooking }}
      services={data.generalListing.slice(0, 6)}
      doctors={data.doctors}
      faqs={data.faqItems}
    />
  );
}
