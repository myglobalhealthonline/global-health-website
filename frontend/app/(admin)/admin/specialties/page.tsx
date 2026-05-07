import Link from "next/link";
import { redirect } from "next/navigation";
import {
  deleteAdminSpecialty,
  fetchAdminCountries,
  fetchAdminSpecialties,
  patchAdminSpecialty,
  postAdminSpecialty,
} from "@/lib/admin/admin-api";
import { ManagedImageField } from "../_components/managed-image-field";

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
      cardSummary: String(formData.get("cardSummary") ?? "").trim() || null,
      cardThemeColor: String(formData.get("cardThemeColor") ?? "").trim() || null,
      sortOrder: Number(String(formData.get("sortOrder") ?? "0").trim() || "0"),
      imagePath: String(formData.get("imagePath") ?? "").trim() || null,
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
      cardSummary: String(formData.get("cardSummary") ?? "").trim() || null,
      cardThemeColor: String(formData.get("cardThemeColor") ?? "").trim() || null,
      sortOrder: Number(String(formData.get("sortOrder") ?? "0").trim() || "0"),
      imagePath: String(formData.get("imagePath") ?? "").trim() || null,
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="gh-h2 text-[var(--color-text-primary)]">Specialties</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--color-text-muted)]">
            Manage one specialty card per listing tile. Each specialty can control its own image,
            summary, theme color, and sort order. Consultation time and price come from the service
            assigned to that specialty in the specialist consultations section.
          </p>
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

      <div className="mt-8 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] p-5">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Add specialty card</h2>
        <form action={createSpecialtyAction} className="mt-4 grid gap-4">
          <input type="hidden" name="countryId" value={selectedCountryId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <input name="name" className="gh-input min-w-0" placeholder="Name" required />
            <input name="slug" className="gh-input min-w-0 font-mono text-sm" placeholder="e.g. cardiology" required />
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">Slug must be lowercase and use hyphens only.</p>
          <textarea name="cardSummary" className="gh-input min-h-[5rem] min-w-0 resize-y" placeholder="Card summary" />
          <ManagedImageField
            name="imagePath"
            label="Card image"
            helperText="Shown on the public specialty cards."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <input name="cardThemeColor" className="gh-input min-w-0 font-mono text-sm" placeholder="#1b4d3e" />
            <input name="sortOrder" type="number" min="0" step="1" defaultValue="0" className="gh-input min-w-0" />
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            The card links automatically to the first active service under this specialty. Edit
            consultation time and price in <Link href="/admin/specialist-consultations" className="gh-link">Specialist Consultations</Link>.
          </p>
          <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
            <input type="checkbox" name="active" defaultChecked className="h-4 w-4" />
            Active
          </label>
          <button type="submit" className="gh-btn gh-btn-primary">Create</button>
        </form>
      </div>

      <div className="mt-8 space-y-5">
        {!specialtiesResult.ok ? (
          <p className="rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm text-[var(--color-status-warning-text)]">
            Could not load specialties: {specialtiesResult.message}
          </p>
        ) : specialtiesResult.data.specialties.length === 0 ? (
          <p className="rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm text-[var(--color-text-muted)]">
            No specialties for this country yet.
          </p>
        ) : (
          specialtiesResult.data.specialties.map((s) => (
            <div key={s.id} className="rounded-[var(--radius-card-sm)] border border-[var(--color-border)] p-5">
              <form action={updateSpecialtyAction} className="grid gap-4">
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="countryId" value={selectedCountryId} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <input name="name" defaultValue={s.name} className="gh-input min-w-0" required />
                  <input name="slug" defaultValue={s.slug} className="gh-input min-w-0 font-mono text-sm" required />
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">Slug must be lowercase and use hyphens only.</p>
                <textarea name="cardSummary" defaultValue={s.cardSummary ?? ""} className="gh-input min-h-[5rem] min-w-0 resize-y" />
                <ManagedImageField
                  name="imagePath"
                  label="Card image"
                  initialPath={s.assets[0]?.path ?? ""}
                  helperText="Shown on the public specialty cards."
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <input name="cardThemeColor" defaultValue={s.cardThemeColor ?? ""} className="gh-input min-w-0 font-mono text-sm" />
                  <input name="sortOrder" type="number" min="0" step="1" defaultValue={s.sortOrder} className="gh-input min-w-0" />
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Card target resolves automatically from this specialty&apos;s active services.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
                    <input type="checkbox" name="active" defaultChecked={s.active} className="h-4 w-4" />
                    Active
                  </label>
                  <button type="submit" className="gh-btn gh-btn-soft text-xs">Save</button>
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  Resolved service: {s.primaryService?.name ?? "None yet"} | Theme: {s.cardThemeColor ?? "Default"}
                </div>
              </form>

              <form action={deactivateSpecialtyAction} className="mt-4">
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="countryId" value={selectedCountryId} />
                <button type="submit" className="gh-btn gh-btn-danger text-xs">Deactivate</button>
              </form>
            </div>
          ))
        )}
      </div>

      <Link href="/admin/specialist-consultations" className="mt-6 inline-block gh-link text-[var(--color-brand-primary)]">
        Go to specialist consultations
      </Link>
    </section>
  );
}
