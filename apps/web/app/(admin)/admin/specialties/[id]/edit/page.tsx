import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchAdminSpecialtyById, fetchAdminCountries, patchAdminSpecialty } from "@/lib/admin/admin-api";
import { ManagedImageField } from "../../../_components/managed-image-field";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function AdminSpecialtyEditPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};

  const [specialtyResult, countriesResult] = await Promise.all([
    fetchAdminSpecialtyById(id),
    fetchAdminCountries(),
  ]);

  if (!countriesResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Edit category</h1>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          Could not load countries: {countriesResult.message}
        </p>
        <Link href="/admin/specialties" className="mt-6 inline-block gh-link text-sm text-[var(--color-text-muted)]">
          Back to categories
        </Link>
      </section>
    );
  }

  if (!specialtyResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Edit category</h1>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          Could not load category: {specialtyResult.message}
        </p>
        <Link href="/admin/specialties" className="mt-6 inline-block gh-link text-sm text-[var(--color-text-muted)]">
          Back to categories
        </Link>
      </section>
    );
  }

  const s = specialtyResult.data.specialty;
  const countries = countriesResult.data.countries.map((c) => ({ id: c.id, code: c.code, name: c.name }));

  async function updateSpecialtyAction(formData: FormData) {
    "use server";
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
      redirect(`/admin/specialties/${id}/edit?error=${encodeURIComponent(result.message)}`);
    }
    redirect(`/admin/specialties?countryId=${encodeURIComponent(s.countryId)}&success=${encodeURIComponent("Category updated")}`);
  }

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="gh-h2 text-[var(--color-text-primary)]">Edit category</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--color-text-muted)]">
            Update this category card&apos;s image, summary, theme color, and sort order.
          </p>
        </div>
        <Link href="/admin/specialties" className="gh-link text-sm text-[var(--color-text-muted)]">
          Back to categories
        </Link>
      </div>

      {messages.error ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">{messages.error}</p>
      ) : null}

      <form action={updateSpecialtyAction} className="mt-6 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="gh-field-label">Country</span>
            <select name="countryId" defaultValue={s.countryId} className="gh-select min-w-0" disabled>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </label>
        </div>

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
          <input name="cardThemeColor" defaultValue={s.cardThemeColor ?? ""} className="gh-input min-w-0 font-mono text-sm" placeholder="#1b4d3e" />
          <input name="sortOrder" type="number" min="0" step="1" defaultValue={s.sortOrder} className="gh-input min-w-0" />
        </div>

        <p className="text-xs text-[var(--color-text-muted)]">
          Card target resolves automatically from this specialty&apos;s active services.
        </p>

        <div className="text-xs text-[var(--color-text-muted)]">
          Resolved service: {s.primaryService?.name ?? "None yet"} | Theme: {s.cardThemeColor ?? "Default"}
        </div>

        <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
          <input type="checkbox" name="active" defaultChecked={s.active} className="h-4 w-4" />
          Active
        </label>

        <div className="flex flex-wrap gap-3">
          <button type="submit" className="gh-btn gh-btn-primary">Save</button>
          <Link href="/admin/specialties" className="gh-btn gh-btn-soft">Cancel</Link>
        </div>
      </form>
    </section>
  );
}
