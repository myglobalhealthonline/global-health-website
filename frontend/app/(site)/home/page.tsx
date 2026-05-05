import type { Metadata } from "next";
import { CountryHomeTemplate } from "@/components/templates/CountryHomeTemplate";
import { getTemplatePageData } from "@/lib/content/template-page-data";

export const metadata: Metadata = {
  title: "Clinic Ireland | Global Health",
  description: "Ireland online medical clinic with GP and specialist consultation booking.",
};

export default async function Page() {
  const data = await getTemplatePageData("/home", "ie");

  return (
    <CountryHomeTemplate
      countryName={data.country.name}
      hero={data.countryHome.hero}
      primaryBooking={{ href: data.paths.general, label: data.countryHome.booking.ctaLabel }}
      quickActions={data.countryHome.quickActions}
      availability={data.countryHome.availability}
      about={data.countryHome.about}
      servicesTitle={data.countryHome.specialties.title}
      servicesIntro={data.countryHome.specialties.subtitle}
      servicesCta={data.countryHome.specialties.cta}
      services={data.specialistListing.slice(0, 6)}
      steps={data.countryHome.steps}
      homeDelivery={data.countryHome.homeDelivery}
      doctorsTitle="Ireland medical team"
      doctorSpotlight={data.countryHome.doctorSpotlight}
      doctors={data.doctors}
      trustTitle={data.countryHome.trust.title}
      trustSubtitle={data.countryHome.trust.subtitle}
      trustItems={data.countryHome.trust.items}
      faqTitle={data.countryHome.faqTitle}
      faqs={data.faqItems}
      bookingCta={data.countryHome.booking}
    />
  );
}
