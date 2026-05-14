import { DoctorTeamTemplate } from "@/components/templates/DoctorTeamTemplate";
import { getTemplatePageData } from "@/lib/content/template-page-data";
import { pageMetadata } from "@/lib/seo/page-seo";

export const metadata = pageMetadata("/spain-team");

export default async function Page() {
  const data = await getTemplatePageData("/spain-team", "sp");
  return (
    <DoctorTeamTemplate
      countryName={data.country.name}
      doctors={data.doctors}
      bookingHref={data.paths.general}
      bookingLabel="Book consultation"
    />
  );
}
