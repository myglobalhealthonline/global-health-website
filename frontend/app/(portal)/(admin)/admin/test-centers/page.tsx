import { cookies } from "next/headers";
import { fetchAdminCountries } from "@/lib/admin/admin-api";
import { COUNTRY_PREF_COOKIE } from "../_components/country-picker-constants";
import { AdminCard, PageHeader } from "../_components/atoms";
import { TestCentersManager } from "./_components/test-centers-manager";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | undefined>>;
};

/**
 * Country-scoped sidebar route for test centers / exam clinics. Resolves the
 * active country from the topbar picker cookie (same as the Insurance page it
 * sits beside) and renders the shared manager.
 */
export default async function TestCentersPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};

  const result = await fetchAdminCountries();
  const countries = result.ok ? result.data.countries : [];
  const jar = await cookies();
  const preferred = jar.get(COUNTRY_PREF_COOKIE)?.value;
  const active = countries.find((co) => co.slug === preferred) ?? countries[0] ?? null;

  if (!active) {
    return (
      <>
        <PageHeader eyebrow="Country" title="Test centers" />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Select a country in the top bar to manage its test centers.
          </p>
        </AdminCard>
      </>
    );
  }

  return (
    <TestCentersManager
      countryId={active.id}
      countryCode={active.code}
      countryName={active.name}
      currencyCode={active.currency.code}
      basePath="/admin/test-centers"
      searchParams={sp}
    />
  );
}
