import type { Metadata } from "next";
import { ConsultationListingTemplate } from "@/components/templates/ConsultationListingTemplate";
import { getTemplatePageData } from "@/lib/content/template-page-data";

export const metadata: Metadata = {
  title: "Specialist Consultation - Ireland",
  description: "Consultation listing template.",
};

export default async function Page() {
  const data = await getTemplatePageData("specialty-ie", "ie");
  return (
    <ConsultationListingTemplate
      title="Specialist Consultation - Ireland"
      description="Browse specialist online consultation options."
      mode="specialist"
      listing={data.specialistListing}
      bookingHref={data.paths.general}
      bookingLabel={data.site.common.cta.primaryBooking}
    />
  );
}
