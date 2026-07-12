import { InsuranceCompaniesManager } from "../../../_components/insurance-companies-manager";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string; edit?: string; company?: string }>;
};

export default async function CountryInsuranceCompaniesAdmin({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  return (
    <InsuranceCompaniesManager
      countryId={id}
      basePath={`/admin/countries/${id}/insurance-companies`}
      searchParams={sp}
    />
  );
}
