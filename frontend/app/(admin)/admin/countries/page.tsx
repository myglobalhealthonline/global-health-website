import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Edit3, Eye, GripVertical, Plus, Trash2 } from "lucide-react";
import { fetchAdminCountries, purgeAdminCountry } from "@/lib/admin/admin-api";
import { FlagBadge } from "../_components/flag-badge";
import {
  AdminCard,
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
    const id = String(formData.get("id") ?? "").trim();
    const deleteResult = await purgeAdminCountry(id);
    if (!deleteResult.ok) {
      redirect(`/admin/countries?error=${encodeURIComponent(deleteResult.message)}`);
    }
    revalidatePath("/admin/countries");
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

      <AdminCard padding={0} className="overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-5 py-3.5">
          <span className="text-[13px] text-[var(--color-text-muted)]">
            {rows.length} countries · {publishedCount} active
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <AdminTable>
            <Thead>
              <Th style={{ width: 40 }}> </Th>
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
                    <GripVertical
                      aria-hidden
                      className="size-3.5"
                      style={{ color: "var(--color-text-muted)", cursor: "grab" }}
                    />
                  </Td>
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
                    <div className="flex justify-end gap-1.5">
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
                        <IconBtn
                          ariaLabel={`Delete ${c.name}`}
                          type="submit"
                          style={{ color: "var(--color-status-error-text)" }}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </IconBtn>
                      </form>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </AdminTable>
        </div>

        {rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[var(--color-text-muted)]">
            No countries yet. Create one to get started.
          </p>
        ) : null}
      </AdminCard>
    </>
  );
}
