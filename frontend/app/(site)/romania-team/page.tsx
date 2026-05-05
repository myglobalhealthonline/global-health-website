import type { Metadata } from "next";
import { DoctorTeamTemplate } from "@/components/templates/DoctorTeamTemplate";
import { getTemplatePageData } from "@/lib/content/template-page-data";

export const metadata: Metadata = {
  title: "Romania Team",
  description: "Doctor/team listing template for Romania.",
};

export default async function Page() {
  const data = await getTemplatePageData("/romania-team", "rm");
  return (
    <DoctorTeamTemplate
      countryName={data.country.name}
      doctors={data.doctors}
      bookingHref={data.paths.general}
      bookingLabel={data.site.common.cta.primaryBooking}
    />
  );
}
