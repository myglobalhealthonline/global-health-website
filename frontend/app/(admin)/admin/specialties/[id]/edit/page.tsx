import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  fetchAdminSpecialtyById,
  fetchAdminCountries,
  patchAdminSpecialty,
} from "@/lib/admin/admin-api";
import { ManagedImageField } from "../../../_components/managed-image-field";
import { AdminCard, Btn, PageHeader } from "../../../_components/atoms";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

export default async function AdminSpecialtyEditPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};

  const [specialtyResult, countriesResult] = await Promise.all([
    fetchAdminSpecialtyById(id),
    fetchAdminCountries(),
  ]);

  if (!countriesResult.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Global"
          title="Edit category"
          actions={
            <Btn href="/admin/specialties" variant="ghost" iconLeft={<ArrowLeft className="size-3.5" />}>
              Cancel
            </Btn>
          }
        />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load countries: {countriesResult.message}
          </p>
        </AdminCard>
      </>
    );
  }

  if (!specialtyResult.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Global"
          title="Edit category"
          actions={
            <Btn href="/admin/specialties" variant="ghost" iconLeft={<ArrowLeft className="size-3.5" />}>
              Cancel
            </Btn>
          }
        />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load category: {specialtyResult.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const s = specialtyResult.data.specialty;
  const countries = countriesResult.data.countries.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
  }));

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
    redirect(
      `/admin/specialties?countryId=${encodeURIComponent(s.countryId)}&success=${encodeURIComponent("Category updated")}`,
    );
  }

  return (
    <>
      <Link
        href="/admin/specialties"
        className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to categories
      </Link>
      <PageHeader
        eyebrow="Global"
        title={`Edit ${s.name}`}
        description="Update card image, summary, theme color, and sort order."
        actions={
          <Btn href="/admin/specialties" variant="ghost">
            Cancel
          </Btn>
        }
      />

      {messages.error ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {messages.error}
        </p>
      ) : null}

      <AdminCard>
        <form action={updateSpecialtyAction} className="grid gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Country</span>
            <select
              name="countryId"
              defaultValue={s.countryId}
              className="gh-select min-w-0"
              disabled
            >
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code.toUpperCase()})
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">Name</span>
              <input
                name="name"
                defaultValue={s.name}
                className="gh-input min-w-0"
                required
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">Slug</span>
              <input
                name="slug"
                defaultValue={s.slug}
                className="gh-input min-w-0 font-mono text-sm"
                required
              />
            </label>
          </div>
          <p className="-mt-2 text-[12px] text-[var(--color-text-muted)]">
            Slug must be lowercase and use hyphens only.
          </p>

          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Card summary</span>
            <textarea
              name="cardSummary"
              defaultValue={s.cardSummary ?? ""}
              className="gh-input min-h-[5rem] min-w-0 resize-y"
            />
          </label>

          <ManagedImageField
            name="imagePath"
            label="Card image"
            initialPath={s.assets[0]?.path ?? ""}
            helperText="Shown on the public specialty cards."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">Theme color</span>
              <input
                name="cardThemeColor"
                defaultValue={s.cardThemeColor ?? ""}
                className="gh-input min-w-0 font-mono text-sm"
                placeholder="#1b4d3e"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">Sort order</span>
              <input
                name="sortOrder"
                type="number"
                min="0"
                step="1"
                defaultValue={s.sortOrder}
                className="gh-input min-w-0"
              />
            </label>
          </div>

          <p className="text-[12px] text-[var(--color-text-muted)]">
            Card target resolves automatically from this category&apos;s active services.{" "}
            <span className="font-bold">Resolved service:</span>{" "}
            {s.primaryService?.name ?? "None yet"} ·{" "}
            <span className="font-bold">Theme:</span> {s.cardThemeColor ?? "Default"}
          </p>

          <label className="flex items-center gap-2 text-[13px] text-[var(--color-text-primary)]">
            <input
              type="checkbox"
              name="active"
              defaultChecked={s.active}
              className="h-4 w-4"
            />
            Active
          </label>

          <div className="flex flex-wrap gap-3 border-t border-[var(--color-border)] pt-6">
            <button type="submit" className="gh-btn gh-btn-primary">
              Save changes
            </button>
            <Link
              href="/admin/specialties"
              className="text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              Cancel
            </Link>
          </div>
        </form>
      </AdminCard>
    </>
  );
}
