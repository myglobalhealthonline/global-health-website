import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { redirect } from "next/navigation";
import { Edit3, Eye, Globe2, Plus } from "lucide-react";
import { fetchAdminCountries, purgeAdminCountry } from "@/lib/admin/admin-api";
import { SITE_CACHE_TAGS } from "@/lib/api/site-content-api";
import { ConfirmDeleteButton } from "../_components/confirm-delete-button";
import { FlagBadge } from "../_components/flag-badge";
import { PortalMobileCard } from "@/components/PortalMobileCard";
import {
  AdminCard,
  AdminEmptyState,
  AdminSummaryStrip,
  AdminTable,
  Btn,
  IconBtn,
  PageHeader,
  Pill,
  Td,
  Th,
  Thead,
  Tr,
} from "../_components/atoms";

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
          <span className="text-[13px] text-[var(--color-text-muted)]">
            {rows.length} countries · {publishedCount} active
          </span>
        </div>

        {/* Table */}
        <div className="gh-admin-country-table-wrap gh-admin-deep-table-wrap overflow-x-auto">
          <AdminTable>
            <Thead>
              <Th>Country</Th>
              <Th>Code</Th>
              <Th>Locale</Th>
              <Th>Currency</Th>
              <Th>Status</Th>
              <Th>Key routes</Th>
              <Th align="right" style={{ width: 120 }}>
                Actions
              </Th>
            </Thead>
            <tbody>
              {rows.map((c) => (
                <Tr key={c.id}>
                  <Td>
                    <span className="inline-flex items-center gap-2.5">
                      <FlagBadge code={c.slug} size={18} />
                      <span className="font-bold text-[var(--color-text-primary)]">
                        {c.name}
                      </span>
                    </span>
                  </Td>
                  <Td>
                    <span className="font-mono text-[12px] text-[var(--color-text-body)]">
                      {c.code.toUpperCase()}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-[var(--color-text-muted)]">
                      {c.defaultLocale}
                    </span>
                  </Td>
                  <Td>
                    <span className="font-mono text-[12px] text-[var(--color-text-body)]">
                      {c.currency.code}
                    </span>
                  </Td>
                  <Td>
                    <Pill tone={c.isActive ? "published" : "inactive"}>
                      {c.isActive ? "Active" : "Inactive"}
                    </Pill>
                  </Td>
                  <Td>
                    <div className="max-w-[14rem]">
                      <div className="truncate font-mono text-[11px] text-[var(--color-text-muted)]">
                        {c.legacyHomePath}
                      </div>
                      <div className="truncate font-mono text-[11px] text-[var(--color-text-muted)] opacity-70">
                        {c.teamPath}
                      </div>
                    </div>
                  </Td>
                  <Td align="right">
                    <div className="gh-admin-country-row-actions flex justify-end gap-1.5">
                      <IconBtn
                        ariaLabel={`View ${c.name}`}
                        href={`/admin/countries/${c.id}`}
                      >
                        <Eye className="size-3.5" aria-hidden />
                      </IconBtn>
                      <IconBtn
                        ariaLabel={`Edit ${c.name}`}
                        href={`/admin/countries/${c.id}/edit`}
                      >
                        <Edit3 className="size-3.5" aria-hidden />
                      </IconBtn>
                      <form action={deleteCountryAction} className="inline-flex">
                        <input type="hidden" name="id" value={c.id} />
                        <ConfirmDeleteButton
                          title={`Delete ${c.name}?`}
                          message={`Delete ${c.name}? This deactivates the country and cannot be undone from this action.`}
                          ariaLabel={`Delete ${c.name}`}
                          requireTypedConfirmation={c.slug}
                        />
                      </form>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </AdminTable>
        </div>

        {rows.length > 0 ? (
          <div className="gh-admin-mobile-list">
            {rows.map((c) => (
              <PortalMobileCard
                key={c.id}
                tone={c.isActive ? "success" : "neutral"}
                leading={<FlagBadge code={c.slug} size={20} />}
                title={c.name}
                subtitle={c.legacyHomePath}
                statusPill={
                  <Pill tone={c.isActive ? "published" : "inactive"}>
                    {c.isActive ? "Active" : "Inactive"}
                  </Pill>
                }
                meta={[
                  { label: "Code", value: c.code.toUpperCase() },
                  { label: "Locale", value: c.defaultLocale },
                  { label: "Currency", value: c.currency.code },
                  { label: "Team route", value: c.teamPath },
                ]}
                actions={
                  <>
                    <IconBtn ariaLabel={`View ${c.name}`} href={`/admin/countries/${c.id}`}>
                      <Eye className="size-3.5" aria-hidden />
                    </IconBtn>
                    <IconBtn ariaLabel={`Edit ${c.name}`} href={`/admin/countries/${c.id}/edit`}>
                      <Edit3 className="size-3.5" aria-hidden />
                    </IconBtn>
                  </>
                }
              />
            ))}
          </div>
        ) : null}

        {rows.length === 0 ? (
          <AdminEmptyState
            icon={<Globe2 className="size-8" aria-hidden />}
            title="No markets configured"
            description="Create a country to unlock localized services, doctors, legal pages, currencies, and booking routes."
            action={<Btn href="/admin/countries/new" variant="soft" size="sm">Add country</Btn>}
          />
        ) : null}
      </AdminCard>
    </>
  );
}
