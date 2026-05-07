import type { Metadata } from "next";
import { ConsultationListingTemplate } from "@/components/templates/ConsultationListingTemplate";
import { getTemplatePageData } from "@/lib/content/template-page-data";

export const metadata: Metadata = {
  title: "Specialist Consultation - Spain",
  description: "Find specialist consultation options in Spain.",
  robots: { index: false, follow: true },
};

export default async function Page() {
  const data = await getTemplatePageData("specialty-sp", "sp");
  return (
    <ConsultationListingTemplate
      title="Specialist Consultation - Spain"
      description="Browse specialist online consultation options."
      mode="specialist"
      listing={data.specialistListing}
      bookingHref={data.paths.general}
      bookingLabel={data.site.common.cta.primaryBooking}
    />
  );
}
