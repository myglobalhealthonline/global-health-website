import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { fetchAdminCountries, postAdminSpecialty } from "@/lib/admin/admin-api";
import { ManagedImageField } from "../../_components/managed-image-field";
import { AdminCard, Btn, PageHeader } from "../../_components/atoms";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ countryId?: string; error?: string }>;
};

export default async function AdminSpecialtyNewPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const preselectedCountryId = sp.countryId?.trim() ?? "";

  const countriesResult = await fetchAdminCountries();
  if (!countriesResult.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Global"
          title="New category"
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

  const countries = countriesResult.data.countries.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
  }));

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
      redirect(
        `/admin/specialties/new?countryId=${encodeURIComponent(body.countryId)}&error=${encodeURIComponent(result.message)}`,
      );
    }
    redirect(
      `/admin/specialties?countryId=${encodeURIComponent(body.countryId)}&success=${encodeURIComponent("Category created")}`,
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
        title="New category"
        description="Create a new category card for the public listing."
        actions={
          <Btn href="/admin/specialties" variant="ghost">
            Cancel
          </Btn>
        }
      />

      {sp.error ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {sp.error}
        </p>
      ) : null}

      <AdminCard>
        <form action={createSpecialtyAction} className="grid gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Country</span>
            <select
              name="countryId"
              defaultValue={preselectedCountryId}
              className="gh-select min-w-0"
              required
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
              <input name="name" className="gh-input min-w-0" placeholder="Cardiology" required />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">Slug</span>
              <input
                name="slug"
                className="gh-input min-w-0 font-mono text-sm"
                placeholder="cardiology"
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
              className="gh-input min-h-[5rem] min-w-0 resize-y"
              placeholder="Short description shown on the public specialty card"
            />
          </label>

          <ManagedImageField
            name="imagePath"
            label="Card image"
            helperText="Shown on the public specialty cards."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">Theme color</span>
              <input
                name="cardThemeColor"
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
                defaultValue="0"
                className="gh-input min-w-0"
              />
            </label>
          </div>

          <p className="text-[12px] text-[var(--color-text-muted)]">
            The card links automatically to the first active service under this category. Edit
            consultation time and price in{" "}
            <Link
              href="/admin/specialist-consultations"
              className="text-[var(--color-brand-primary)] underline underline-offset-2"
            >
              Specialist consultations
            </Link>
            .
          </p>

          <label className="flex items-center gap-2 text-[13px] text-[var(--color-text-primary)]">
            <input type="checkbox" name="active" defaultChecked className="h-4 w-4" />
            Active
          </label>

          <div className="flex flex-wrap gap-3 border-t border-[var(--color-border)] pt-6">
            <button type="submit" className="gh-btn gh-btn-primary">
              Create category
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
