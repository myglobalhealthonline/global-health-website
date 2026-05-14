import { DoctorTeamTemplate } from "@/components/templates/DoctorTeamTemplate";
import { getTemplatePageData } from "@/lib/content/template-page-data";
import { pageMetadata } from "@/lib/seo/page-seo";

export const metadata = pageMetadata("/ireland-team");

export default async function Page() {
  const data = await getTemplatePageData("/ireland-team", "ie");
  return (
    <DoctorTeamTemplate
      countryName={data.country.name}
      doctors={data.doctors}
      bookingHref={data.paths.general}
      bookingLabel="Book consultation"
    />
  );
}
