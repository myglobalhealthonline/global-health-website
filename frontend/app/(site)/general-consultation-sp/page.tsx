import type { Metadata } from "next";
import { ConsultationListingTemplate } from "@/components/templates/ConsultationListingTemplate";
import { getTemplatePageData } from "@/lib/content/template-page-data";

export const metadata: Metadata = {
  title: "General Consultation - Spain",
  description: "Country-specific general consultation listings for Spain.",
};

export default async function Page() {
  const data = await getTemplatePageData("/general-consultation-sp", "sp");

  return (
    <ConsultationListingTemplate
      title={data.generalConsultation.heroTitle}
      description={data.generalConsultation.heroDescription}
      mode="general"
      primaryCtaLabel={data.generalConsultation.primaryCtaLabel}
      secondaryCta={data.generalConsultation.secondaryCta}
      explanation={data.generalConsultation.explanation}
      listing={data.generalConsultation.serviceCards}
      pricing={data.generalConsultation.pricing}
      howItWorks={data.generalConsultation.howItWorks}
      trust={data.generalConsultation.trust}
      faq={data.generalConsultation.faq}
      bookingHref={data.paths.general}
      bookingLabel={data.generalConsultation.primaryCtaLabel}
    />
  );
}
