import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  doctorPublicProfilePath,
  fetchAdminCountries,
  fetchAdminDoctors,
  fetchAdminSpecialties,
  purgeAdminDoctor,
} from "@/lib/admin/admin-api";

export const dynamic = "force-dynamic";

function buildDoctorsHref(filters: Record<string, string | undefined>, patch: Record<string, string | undefined>) {
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

function spRead(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
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
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Doctor profiles</h1>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">Could not load countries: {countriesResult.message}</p>
      </section>
    );
  }

  if (!listResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Doctor profiles</h1>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">Could not load doctors: {listResult.message}</p>
      </section>
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
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="gh-h2 text-[var(--color-text-primary)]">Doctor profiles</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--color-text-muted)]">
            Public directory content only — no doctor login in this app. A separate doctor portal is out of scope here.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/doctors/create" className="gh-btn gh-btn-primary">
            Add doctor profile
          </Link>

        </div>
      </div>

      {errorMessage ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">{errorMessage}</p>
      ) : null}
      {successMessage ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-success">{successMessage}</p>
      ) : null}

      <form
        method="get"
        className="mt-6 flex flex-col gap-4 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex min-w-0 flex-col gap-2">
            <span className="gh-field-label">Country</span>
            <select name="countryId" defaultValue={filters.countryId ?? ""} className="gh-select min-w-0">
              <option value="">All</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-2">
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
          <label className="flex min-w-0 flex-col gap-2">
            <span className="gh-field-label">Active</span>
            <select name="isActive" defaultValue={statusFilter} className="gh-select min-w-0">
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-2 lg:col-span-2">
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
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="gh-btn gh-btn-primary">
            Apply filters
          </button>
          <Link href="/admin/doctors" className="gh-link text-sm text-[var(--color-text-muted)]">
            Clear filters
          </Link>
        </div>
      </form>

      <p className="mt-4 text-sm text-[var(--color-text-muted)]">
        {total === 0 ? "No profiles match filters." : `Showing ${items.length} of ${total}.`}
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold">Title</th>
              <th className="px-3 py-2 font-semibold">Country</th>
              <th className="px-3 py-2 font-semibold">Categories</th>
              <th className="px-3 py-2 font-semibold">Languages</th>
              <th className="px-3 py-2 font-semibold">Active</th>
              <th className="px-3 py-2 font-semibold">Public path</th>
              <th className="px-3 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((d) => (
              <tr key={d.id} className={`border-b border-[var(--color-border)] align-top ${d.active ? "" : "opacity-60"}`}>
                <td className="px-3 py-3 font-medium text-[var(--color-text-primary)]">{d.fullName}</td>
                <td className="px-3 py-3 text-[var(--color-text-muted)]">{d.title}</td>
                <td className="px-3 py-3 text-[var(--color-text-muted)]">{d.country.code}</td>
                <td className="max-w-[14rem] px-3 py-3 text-[var(--color-text-muted)]">
                  {d.specialties.length > 0
                    ? d.specialties.map((s) => s.specialty.name).join(", ")
                    : "—"}
                </td>
                <td className="px-3 py-3 text-[var(--color-text-muted)]">—</td>
                <td className="px-3 py-3">{d.active ? "Yes" : "No"}</td>
                <td className="px-3 py-3 font-mono text-xs text-[var(--color-text-muted)]">
                  {doctorPublicProfilePath(d.country.teamPath, d.slug)}
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-col gap-1">
                    <Link href={`/admin/doctors/${d.id}`} className="gh-link text-[var(--color-brand-primary)]">
                      View
                    </Link>
                    <Link href={`/admin/doctors/${d.id}/edit`} className="gh-link text-[var(--color-brand-primary)]">
                      Edit
                    </Link>
                    <form action={deleteDoctorAction}>
                      <input type="hidden" name="id" value={d.id} />
                      <button type="submit" className="gh-link text-left text-[var(--color-status-danger-text)]">
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <nav className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-6 text-sm">
          <div className="text-[var(--color-text-muted)]">
            Page {page} of {totalPages} · {pageSize} per page
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildDoctorsHref(filters, { page: String(Math.max(1, page - 1)) })}
              className={`gh-btn ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
            >
              Previous
            </Link>
            <Link
              href={buildDoctorsHref(filters, { page: String(Math.min(totalPages, page + 1)) })}
              className={`gh-btn ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`}
            >
              Next
            </Link>
          </div>
        </nav>
      ) : null}
    </section>
  );
}
