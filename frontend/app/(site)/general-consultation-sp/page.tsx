import type { Metadata } from "next";
import { ConsultationListingTemplate } from "@/components/templates/ConsultationListingTemplate";
import { getTemplatePageData } from "@/lib/content/template-page-data";

export const metadata: Metadata = {
  title: "General Consultation - Spain",
  description: "Consultation listing template.",
};

export default async function Page() {
  const data = await getTemplatePageData("general-consultation-sp", "sp");
  return (
    <ConsultationListingTemplate
      title="General Consultation - Spain"
      description="Browse general online consultation options."
      mode="general"
      listing={data.generalListing}
      bookingHref={data.paths.general}
      bookingLabel={data.site.common.cta.primaryBooking}
    />
  );
}
