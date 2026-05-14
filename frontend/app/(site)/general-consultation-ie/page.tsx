import { ConsultationListingTemplate } from "@/components/templates/ConsultationListingTemplate";
import { getTemplatePageData } from "@/lib/content/template-page-data";
import { pageMetadata } from "@/lib/seo/page-seo";

export const metadata = pageMetadata("/general-consultation-ie");

export default async function Page() {
  const data = await getTemplatePageData("/general-consultation-ie", "ie");

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
