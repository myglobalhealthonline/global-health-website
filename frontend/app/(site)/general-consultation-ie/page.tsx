import type { Metadata } from "next";
import { ConsultationListingTemplate } from "@/components/templates/ConsultationListingTemplate";
import { getTemplatePageData } from "@/lib/content/template-page-data";

export const metadata: Metadata = {
  title: "General Consultation - Ireland",
  description: "Country-specific general consultation listings for Ireland.",
};

export default async function Page() {
  const data = await getTemplatePageData("/general-consultation-ie", "ie");

  return (
    <ConsultationListingTemplate
      title={data.generalConsultation.heroTitle}
      description={data.generalConsultation.heroDescription}
      mode="general"
      explanation={data.generalConsultation.explanation}
      listing={data.generalConsultation.serviceCards}
      pricing={data.generalConsultation.pricing}
      howItWorks={data.generalConsultation.howItWorks}
      trust={data.generalConsultation.trust}
      faq={data.generalConsultation.faq}
      bookingHref={data.paths.general}
      bookingLabel={data.site.common.cta.primaryBooking}
    />
  );
}
