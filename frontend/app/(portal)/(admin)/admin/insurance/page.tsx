import { cookies } from "next/headers";
import { fetchAdminCountries } from "@/lib/admin/admin-api";
import { InsuranceCompaniesManager } from "../_components/insurance-companies-manager";
import { COUNTRY_PREF_COOKIE } from "../_components/country-picker-constants";
import { AdminCard, PageHeader } from "../_components/atoms";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ success?: string; error?: string; edit?: string; company?: string }>;
};

/**
 * Country-scoped sidebar route for insurance companies. Resolves the active
 * country from the topbar picker cookie (same as the other country-scoped
 * pages) and renders the shared manager. The country-detail sub-page
 * (`/admin/countries/[id]/insurance-companies`) renders the same manager.
 */
export default async function InsuranceSidebarPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};

  const result = await fetchAdminCountries();
  const countries = result.ok ? result.data.countries : [];
  const jar = await cookies();
  const preferred = jar.get(COUNTRY_PREF_COOKIE)?.value;
  const active = countries.find((co) => co.slug === preferred) ?? countries[0] ?? null;

  if (!active) {
    return (
      <>
        <PageHeader eyebrow="Country" title="Insurance companies" />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Select a country in the top bar to manage its insurance companies.
          </p>
        </AdminCard>
      </>
    );
  }

  return (
    <InsuranceCompaniesManager countryId={active.id} basePath="/admin/insurance" searchParams={sp} />
  );
}
