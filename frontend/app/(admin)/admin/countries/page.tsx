import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { fetchAdminCountries, purgeAdminCountry } from "@/lib/admin/admin-api";
import { SITE_CACHE_TAGS } from "@/lib/api/site-content-api";
import { AdminCard, AdminSummaryStrip, Btn, PageHeader } from "../_components/atoms";
import { AdminCountriesTable } from "./_components/admin-countries-table";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ success?: string; error?: string }>;
};

export default async function AdminCountriesPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const result = await fetchAdminCountries();

  async function deleteCountryAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const id = String(formData.get("id") ?? "").trim();
    const deleteResult = await purgeAdminCountry(id);
    if (!deleteResult.ok) {
      redirect(`/admin/countries?error=${encodeURIComponent(deleteResult.message)}`);
    }
    revalidatePath("/admin/countries");
    // Bust the public countries cache so the deleted country drops off
    // the site header / country picker on next render.
    revalidateTag(SITE_CACHE_TAGS.countries(), "max");
    redirect("/admin/countries?success=Country%20deleted");
  }

  if (!result.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Global"
          title="Countries"
          description="Manage countries, locales, currencies, and key routes."
        />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load countries: {result.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const rows = result.data.countries;
  const publishedCount = rows.filter((r) => r.isActive).length;
  const configuredCurrencies = new Set(rows.map((r) => r.currency.code)).size;
  const localizedRoutes = rows.filter((r) => r.legacyHomePath && r.teamPath).length;

  return (
    <>
      <PageHeader
        eyebrow="Global"
        title="Countries"
        description="The axis of the platform. Each country has its own hero copy, currency, doctors, and services."
        actions={
          <Btn
            href="/admin/countries/new"
            variant="primary"
            size="md"
            iconLeft={<Plus className="size-3.5" aria-hidden />}
          >
            Add country
          </Btn>
        }
      />

      {sp.error ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {sp.error}
        </p>
      ) : null}
      {sp.success ? (
        <p className="gh-status-success mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {sp.success}
        </p>
      ) : null}

      <AdminSummaryStrip
        items={[
          { label: "Markets", value: rows.length, hint: "Country portals configured", tone: "brand" },
          { label: "Active", value: publishedCount, hint: "Visible to visitors", tone: "success" },
          { label: "Currencies", value: configuredCurrencies, hint: `${localizedRoutes} with key routes`, tone: "neutral" },
        ]}
      />

      <AdminCard padding={0} className="gh-admin-country-list overflow-hidden">
        {/* Toolbar */}
        <div className="gh-admin-country-toolbar flex items-center gap-3 border-b border-[var(--color-border)] px-5 py-3.5">
          <span className="text-portal-compact text-[var(--color-text-muted)]">
            {rows.length} countries · {publishedCount} active
          </span>
        </div>

        {/* Table */}
        <AdminCountriesTable rows={rows} deleteCountryAction={deleteCountryAction} />
      </AdminCard>
    </>
  );
}
