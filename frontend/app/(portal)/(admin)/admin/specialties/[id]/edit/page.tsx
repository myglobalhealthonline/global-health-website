import Link from "next/link";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  fetchAdminSpecialtyById,
  fetchAdminCountries,
  patchAdminSpecialty,
} from "@/lib/admin/admin-api";
import { resolveCountryLocaleTabs } from "@/lib/admin/service-form-parse";
import { parseLocaleTranslations } from "@/lib/admin/translation-form-parse";
import { ManagedImageField } from "../../../_components/managed-image-field";
import { SpecialtyTranslationTabs } from "../../_components/specialty-translation-tabs";
import { AdminCard, Btn, PageHeader } from "../../../_components/atoms";
import { displayNameFrom } from "@/lib/admin/display-name";
import { SetCrumbTitle } from "@/components/crumb-title";

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
  const specialtyCountry = countriesResult.data.countries.find((c) => c.id === s.countryId);
  const { locales, defaultLocale } = resolveCountryLocaleTabs(specialtyCountry);

  async function updateSpecialtyAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const translations = parseLocaleTranslations(formData, ["name", "cardSummary"]);
    const base = translations.find((t) => t.locale === defaultLocale.toUpperCase());
    const body = {
      slug: String(formData.get("slug") ?? "").trim(),
      name: base?.name ?? "",
      cardSummary: base?.cardSummary ?? null,
      cardThemeColor: String(formData.get("cardThemeColor") ?? "").trim() || null,
      sortOrder: Number(String(formData.get("sortOrder") ?? "0").trim() || "0"),
      imagePath: String(formData.get("imagePath") ?? "").trim() || null,
      active: formData.get("active") === "on",
      translations,
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
      <SetCrumbTitle label={displayNameFrom(s.name, s.translations)} />
      <Link
        href="/admin/specialties"
        className="mb-2 inline-flex items-center gap-1.5 text-portal-compact font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to categories
      </Link>
      <PageHeader
        eyebrow="Global"
        title={`Edit ${displayNameFrom(s.name, s.translations)}`}
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
        <form action={updateSpecialtyAction} className="gh-admin-specialty-form grid gap-4">
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

          <label className="flex flex-col gap-1.5">
            <span className="gh-field-label">Slug</span>
            <input
              name="slug"
              defaultValue={s.slug}
              className="gh-input min-w-0 font-mono text-sm"
              required
            />
          </label>
          <p className="-mt-2 text-portal-meta text-[var(--color-text-muted)]">
            Slug must be lowercase and use hyphens only.
          </p>

          <SpecialtyTranslationTabs
            locales={locales}
            defaultLocale={defaultLocale}
            initialTranslations={s.translations}
            baseFallback={{ name: s.name, cardSummary: s.cardSummary }}
          />

          <ManagedImageField
            name="imagePath"
            label="Card image"
            initialPath={s.assets[0]?.path ?? ""}
            helperText="Shown on the public specialty cards."
          />

          <div className="gh-admin-support-field-grid grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">Theme color</span>
              <input
                name="cardThemeColor"
                defaultValue={s.cardThemeColor ?? ""}
                className="gh-input min-w-0 font-mono text-sm"
                placeholder="#1d4b36"
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

          <p className="text-portal-meta text-[var(--color-text-muted)]">
            Card target resolves automatically from this category&apos;s active services.{" "}
            <span className="font-bold">Resolved service:</span>{" "}
            {s.primaryService?.name ?? "None yet"} ·{" "}
            <span className="font-bold">Theme:</span> {s.cardThemeColor ?? "Default"}
          </p>

          <label className="flex items-center gap-2 text-portal-compact text-[var(--color-text-primary)]">
            <input
              type="checkbox"
              name="active"
              defaultChecked={s.active}
              className="h-4 w-4"
            />
            Active
          </label>

          <div className="gh-admin-support-actions flex flex-wrap justify-end gap-3 border-t border-[var(--color-border)] pt-6">
            <Link
              href="/admin/specialties"
              className="gh-btn gh-btn-ghost"
            >
              Cancel
            </Link>
            <button type="submit" className="gh-btn gh-btn-primary">
              Save changes
            </button>
          </div>
        </form>
      </AdminCard>
    </>
  );
}
