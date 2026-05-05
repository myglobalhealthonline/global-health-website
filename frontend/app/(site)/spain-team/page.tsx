import type { Metadata } from "next";
import { DoctorTeamTemplate } from "@/components/templates/DoctorTeamTemplate";
import { getTemplatePageData } from "@/lib/content/template-page-data";

export const metadata: Metadata = {
  title: "Spain Team",
  description: "Doctor/team listing template for Spain.",
};

export default async function Page() {
  const data = await getTemplatePageData("/spain-team", "sp");
  return (
    <DoctorTeamTemplate
      countryName={data.country.name}
      doctors={data.doctors}
      bookingHref={data.paths.general}
      bookingLabel={data.site.common.cta.primaryBooking}
    />
  );
}
