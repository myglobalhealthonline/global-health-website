import Link from "next/link";
import { redirect } from "next/navigation";
import {
  deleteAdminSpecialty,
  fetchAdminCountries,
  fetchAdminSpecialties,
} from "@/lib/admin/admin-api";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    countryId?: string;
    success?: string;
    error?: string;
  }>;
};

export default async function AdminSpecialtiesPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const countryId = sp.countryId?.trim() ?? "";

  const countriesResult = await fetchAdminCountries();
  if (!countriesResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Categories</h1>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          Could not load countries: {countriesResult.message}
        </p>
      </section>
    );
  }

  const countries = countriesResult.data.countries.map((c) => ({ id: c.id, code: c.code, name: c.name }));
  const selectedCountryId = countryId || countries[0]?.id || "";

  const specialtiesResult = selectedCountryId
    ? await fetchAdminSpecialties(selectedCountryId)
    : { ok: true as const, data: { specialties: [] } };

  async function deactivateSpecialtyAction(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "").trim();
    const countryIdRaw = String(formData.get("countryId") ?? "").trim();
    const result = await deleteAdminSpecialty(id);
    if (!result.ok) {
      redirect(`/admin/specialties?countryId=${encodeURIComponent(countryIdRaw)}&error=${encodeURIComponent(result.message)}`);
    }
    redirect(`/admin/specialties?countryId=${encodeURIComponent(countryIdRaw)}&success=${encodeURIComponent("Category deactivated")}`);
  }

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="gh-h2 text-[var(--color-text-primary)]">Categories</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--color-text-muted)]">
            Manage one category card per listing tile. Each category can control its own image,
            summary, theme color, and sort order. Consultation time and price come from the service
            assigned to that category in the specialist consultations section.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/specialties/new" className="gh-btn gh-btn-primary">
            New category
          </Link>
        </div>
      </div>

      {sp.error ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">{sp.error}</p>
      ) : null}
      {sp.success ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-success">{sp.success}</p>
      ) : null}

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-2">
          <span className="gh-field-label">Country</span>
          <select name="countryId" defaultValue={selectedCountryId} className="gh-select min-w-[240px]">
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="gh-btn gh-btn-primary">Load</button>
      </form>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold">Slug</th>
              <th className="px-3 py-2 font-semibold">Sort</th>
              <th className="px-3 py-2 font-semibold">Active</th>
              <th className="px-3 py-2 font-semibold">Resolved service</th>
              <th className="px-3 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!specialtiesResult.ok ? (
              <tr>
                <td colSpan={6} className="px-3 py-3 text-sm text-[var(--color-status-warning-text)]">
                  Could not load categories: {specialtiesResult.message}
                </td>
              </tr>
            ) : specialtiesResult.data.specialties.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-3 text-sm text-[var(--color-text-muted)]">
                  No categories for this country yet.
                </td>
              </tr>
            ) : (
              specialtiesResult.data.specialties.map((s) => (
                <tr
                  key={s.id}
                  className={`border-b border-[var(--color-border)] align-top ${s.active ? "" : "opacity-60"}`}
                >
                  <td className="px-3 py-3 font-medium text-[var(--color-text-primary)]">{s.name}</td>
                  <td className="px-3 py-3 font-mono text-xs text-[var(--color-text-muted)]">{s.slug}</td>
                  <td className="px-3 py-3 text-[var(--color-text-muted)]">{s.sortOrder}</td>
                  <td className="px-3 py-3">{s.active ? "Yes" : "No"}</td>
                  <td className="px-3 py-3 text-[var(--color-text-muted)]">
                    {s.primaryService?.name ?? "None yet"}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1">
                      <Link href={`/admin/specialties/${s.id}/edit`} className="gh-link text-[var(--color-brand-primary)]">
                        Edit
                      </Link>
                      {s.active ? (
                        <form action={deactivateSpecialtyAction}>
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="countryId" value={selectedCountryId} />
                          <button type="submit" className="gh-link text-left text-[var(--color-status-danger-text)]">
                            Deactivate
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Link href="/admin/specialist-consultations" className="mt-6 inline-block gh-link text-[var(--color-brand-primary)]">
        Go to specialist consultations
      </Link>
    </section>
  );
}
