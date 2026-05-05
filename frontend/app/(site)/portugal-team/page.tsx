import type { Metadata } from "next";
import { DoctorTeamTemplate } from "@/components/templates/DoctorTeamTemplate";
import { getTemplatePageData } from "@/lib/content/template-page-data";

export const metadata: Metadata = {
  title: "Portugal Team",
  description: "Doctor/team listing template for Portugal.",
};

export default async function Page() {
  const data = await getTemplatePageData("/portugal-team", "pt");
  return (
    <DoctorTeamTemplate
      countryName={data.country.name}
      doctors={data.doctors}
      bookingHref={data.paths.general}
      bookingLabel="Book consultation"
    />
  );
}
