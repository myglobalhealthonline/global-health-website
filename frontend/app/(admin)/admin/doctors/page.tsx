import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Edit3, Eye, Plus, Trash2 } from "lucide-react";
import {
  doctorPublicProfilePath,
  fetchAdminCountries,
  fetchAdminDoctors,
  fetchAdminSpecialties,
  purgeAdminDoctor,
} from "@/lib/admin/admin-api";
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

function buildDoctorsHref(
  filters: Record<string, string | undefined>,
  patch: Record<string, string | undefined>,
) {
  const merged: Record<string, string> = {};
  for (const [k, v] of Object.entries({ ...filters, ...patch })) {
    if (v !== undefined && v !== "") {
      merged[k] = v;
    }
  }
  const params = new URLSearchParams(merged);
  const qs = params.toString();
  return qs ? `/admin/doctors?${qs}` : "/admin/doctors";
}

function spRead(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const v = sp[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminDoctorsPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const filters: Record<string, string | undefined> = {
    page: spRead(sp, "page"),
    pageSize: spRead(sp, "pageSize"),
    countryId: spRead(sp, "countryId"),
    specialtyId: spRead(sp, "specialtyId"),
    isActive: spRead(sp, "isActive"),
    search: spRead(sp, "search"),
  };

  const [listResult, countriesResult] = await Promise.all([
    fetchAdminDoctors(filters),
    fetchAdminCountries(),
  ]);

  if (!countriesResult.ok) {
    return (
      <>
        <PageHeader eyebrow="Global" title="Doctor profiles" />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load countries: {countriesResult.message}
          </p>
        </AdminCard>
      </>
    );
  }

  if (!listResult.ok) {
    return (
      <>
        <PageHeader eyebrow="Global" title="Doctor profiles" />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load doctors: {listResult.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const { items, pagination } = listResult.data;
  const { page, pageSize, total, totalPages } = pagination;
  const countries = countriesResult.data.countries;
  const filterCountryId = filters.countryId;

  let specialtyOptions: { id: string; name: string; slug: string }[] = [];
  if (filterCountryId) {
    const spRes = await fetchAdminSpecialties(filterCountryId);
    if (spRes.ok) {
      specialtyOptions = spRes.data.specialties;
    }
  }

  const statusFilter = filters.isActive ?? "";
  const successMessage = spRead(sp, "success");
  const errorMessage = spRead(sp, "error");

  async function deleteDoctorAction(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "").trim();
    const result = await purgeAdminDoctor(id);
    if (!result.ok) {
      redirect(`/admin/doctors?error=${encodeURIComponent(result.message)}`);
    }
    revalidatePath("/admin/doctors");
    redirect("/admin/doctors?success=Doctor%20profile%20deleted");
  }

  return (
    <>
      <PageHeader
        eyebrow="Global"
        title="Doctors"
        description="Public clinician directory. Doctors are profiles only — patient-facing login is a separate portal."
        actions={
          <Btn
            href="/admin/doctors/create"
            variant="primary"
            size="md"
            iconLeft={<Plus className="size-3.5" aria-hidden />}
          >
            Add doctor
          </Btn>
        }
      />

      {errorMessage ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {errorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <p className="gh-status-success mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {successMessage}
        </p>
      ) : null}

      {/* Filters card */}
      <AdminCard padding={0} className="mb-4 overflow-hidden">
        <form method="get" className="px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="gh-field-label">Country</span>
              <select
                name="countryId"
                defaultValue={filters.countryId ?? ""}
                className="gh-select min-w-0"
              >
                <option value="">All</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="gh-field-label">Category</span>
              <select
                name="specialtyId"
                defaultValue={filters.specialtyId ?? ""}
                className="gh-select min-w-0"
                disabled={!filterCountryId}
              >
                <option value="">Any</option>
                {specialtyOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="gh-field-label">Status</span>
              <select
                name="isActive"
                defaultValue={statusFilter}
                className="gh-select min-w-0"
              >
                <option value="">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="gh-field-label">Search</span>
              <input
                type="search"
                name="search"
                defaultValue={filters.search ?? ""}
                placeholder="Name, title, bio"
                className="gh-input min-w-0"
                maxLength={120}
              />
            </label>
          </div>
          <input type="hidden" name="page" value="1" />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="submit" className="gh-btn gh-btn-primary" style={{ minHeight: 36 }}>
              Apply filters
            </button>
            <Link
              href="/admin/doctors"
              className="text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              Clear filters
            </Link>
            <span className="ml-auto text-[12px] text-[var(--color-text-muted)]">
              {total === 0
                ? "No profiles match filters."
                : `Showing ${items.length} of ${total} profiles.`}
            </span>
          </div>
        </form>
      </AdminCard>

      {/* Table card */}
      <AdminCard padding={0} className="overflow-hidden">
        <div className="overflow-x-auto">
          <AdminTable>
            <Thead>
              <Th>Name</Th>
              <Th>Title</Th>
              <Th>Country</Th>
              <Th>Categories</Th>
              <Th>Status</Th>
              <Th>Public path</Th>
              <Th align="right" style={{ width: 120 }}>
                Actions
              </Th>
            </Thead>
            <tbody>
              {items.map((d) => (
                <Tr key={d.id}>
                  <Td>
                    <span className="font-bold text-[var(--color-text-primary)]">
                      {d.fullName}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-[var(--color-text-muted)]">{d.title}</span>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-2">
                      <FlagBadge code={d.country.code} size={14} />
                      <span className="text-[12px] uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                        {d.country.code}
                      </span>
                    </span>
                  </Td>
                  <Td>
                    <span className="block max-w-[14rem] truncate text-[13px] text-[var(--color-text-muted)]">
                      {d.specialties.length > 0
                        ? d.specialties.map((s) => s.specialty.name).join(", ")
                        : "—"}
                    </span>
                  </Td>
                  <Td>
                    <Pill tone={d.active ? "published" : "draft"}>
                      {d.active ? "Active" : "Inactive"}
                    </Pill>
                  </Td>
                  <Td>
                    <span className="block max-w-[180px] truncate font-mono text-[11px] text-[var(--color-text-muted)]">
                      {doctorPublicProfilePath(d.country.teamPath, d.slug)}
                    </span>
                  </Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1.5">
                      <IconBtn
                        ariaLabel={`View ${d.fullName}`}
                        href={`/admin/doctors/${d.id}`}
                      >
                        <Eye className="size-3.5" aria-hidden />
                      </IconBtn>
                      <IconBtn
                        ariaLabel={`Edit ${d.fullName}`}
                        href={`/admin/doctors/${d.id}/edit`}
                      >
                        <Edit3 className="size-3.5" aria-hidden />
                      </IconBtn>
                      <form action={deleteDoctorAction} className="inline-flex">
                        <input type="hidden" name="id" value={d.id} />
                        <IconBtn
                          ariaLabel={`Delete ${d.fullName}`}
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

        {items.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[var(--color-text-muted)]">
            No doctor profiles match these filters.
          </p>
        ) : null}

        {totalPages > 1 ? (
          <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-background-soft)] px-5 py-3 text-[13px]">
            <div className="text-[var(--color-text-muted)]">
              Page {page} of {totalPages} · {pageSize} per page
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildDoctorsHref(filters, {
                  page: String(Math.max(1, page - 1)),
                })}
                className={`gh-btn gh-btn-soft text-[13px] ${
                  page <= 1 ? "pointer-events-none opacity-40" : ""
                }`}
                style={{ minHeight: 36, padding: "0 14px" }}
              >
                Previous
              </Link>
              <Link
                href={buildDoctorsHref(filters, {
                  page: String(Math.min(totalPages, page + 1)),
                })}
                className={`gh-btn gh-btn-primary text-[13px] ${
                  page >= totalPages ? "pointer-events-none opacity-40" : ""
                }`}
                style={{ minHeight: 36, padding: "0 14px" }}
              >
                Next
              </Link>
            </div>
          </nav>
        ) : null}
      </AdminCard>
    </>
  );
}
