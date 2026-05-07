import Link from "next/link";
import { redirect } from "next/navigation";
import {
  deleteAdminSpecialty,
  fetchAdminCountries,
  fetchAdminSpecialties,
  patchAdminSpecialty,
  postAdminSpecialty,
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
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Specialties</h1>
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

  async function createSpecialtyAction(formData: FormData) {
    "use server";
    const body = {
      countryId: String(formData.get("countryId") ?? "").trim(),
      slug: String(formData.get("slug") ?? "").trim(),
      name: String(formData.get("name") ?? "").trim(),
      active: formData.get("active") === "on",
    };
    const result = await postAdminSpecialty(body);
    if (!result.ok) {
      redirect(`/admin/specialties?countryId=${encodeURIComponent(body.countryId)}&error=${encodeURIComponent(result.message)}`);
    }
    redirect(`/admin/specialties?countryId=${encodeURIComponent(body.countryId)}&success=${encodeURIComponent("Specialty created")}`);
  }

  async function updateSpecialtyAction(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "").trim();
    const countryIdRaw = String(formData.get("countryId") ?? "").trim();
    const body = {
      slug: String(formData.get("slug") ?? "").trim(),
      name: String(formData.get("name") ?? "").trim(),
      active: formData.get("active") === "on",
    };
    const result = await patchAdminSpecialty(id, body);
    if (!result.ok) {
      redirect(`/admin/specialties?countryId=${encodeURIComponent(countryIdRaw)}&error=${encodeURIComponent(result.message)}`);
    }
    redirect(`/admin/specialties?countryId=${encodeURIComponent(countryIdRaw)}&success=${encodeURIComponent("Specialty updated")}`);
  }

  async function deactivateSpecialtyAction(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "").trim();
    const countryIdRaw = String(formData.get("countryId") ?? "").trim();
    const result = await deleteAdminSpecialty(id);
    if (!result.ok) {
      redirect(`/admin/specialties?countryId=${encodeURIComponent(countryIdRaw)}&error=${encodeURIComponent(result.message)}`);
    }
    redirect(`/admin/specialties?countryId=${encodeURIComponent(countryIdRaw)}&success=${encodeURIComponent("Specialty deactivated")}`);
  }

  return (
    <section className="gh-card p-6 sm:p-8">
      <h1 className="gh-h2 text-[var(--color-text-primary)]">Specialties</h1>
      <p className="gh-body mt-3 text-[var(--color-text-muted)]">
        Add and edit specialty categories by country.
      </p>

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

      <div className="mt-8 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] p-4">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Add specialty</h2>
        <form action={createSpecialtyAction} className="mt-4 grid gap-3 sm:grid-cols-4">
          <input type="hidden" name="countryId" value={selectedCountryId} />
          <input name="name" className="gh-input min-w-0" placeholder="Name" required />
          <input name="slug" className="gh-input min-w-0 font-mono text-sm" placeholder="slug" required />
          <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
            <input type="checkbox" name="active" defaultChecked className="h-4 w-4" />
            Active
          </label>
          <button type="submit" className="gh-btn gh-btn-primary">Create</button>
        </form>
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="gh-table min-w-[760px]">
          <thead>
            <tr>
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold">Slug</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!specialtiesResult.ok ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-sm text-[var(--color-status-warning-text)]">
                  Could not load specialties: {specialtiesResult.message}
                </td>
              </tr>
            ) : specialtiesResult.data.specialties.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-sm text-[var(--color-text-muted)]">
                  No specialties for this country yet.
                </td>
              </tr>
            ) : (
              specialtiesResult.data.specialties.map((s) => (
                <tr key={s.id}>
                  <td className="px-3 py-2">
                    <form action={updateSpecialtyAction} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="countryId" value={selectedCountryId} />
                      <input name="name" defaultValue={s.name} className="gh-input min-w-0" required />
                      <input name="slug" defaultValue={s.slug} className="gh-input min-w-0 font-mono text-sm" required />
                      <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
                        <input type="checkbox" name="active" defaultChecked={s.active} className="h-4 w-4" />
                        Active
                      </label>
                      <button type="submit" className="gh-btn gh-btn-soft text-xs">Save</button>
                    </form>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-[var(--color-text-muted)]">{s.slug}</td>
                  <td className="px-3 py-2 text-sm">{s.active ? "Active" : "Inactive"}</td>
                  <td className="px-3 py-2">
                    <form action={deactivateSpecialtyAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="countryId" value={selectedCountryId} />
                      <button type="submit" className="gh-btn gh-btn-danger text-xs">Deactivate</button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Link href="/admin/services" className="mt-6 inline-block gh-link text-[var(--color-brand-primary)]">
        Go to services
      </Link>
    </section>
  );
}
