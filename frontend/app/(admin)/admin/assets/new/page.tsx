import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AssetFields } from "../_components/asset-fields";
import { parseAssetBodyFromForm } from "@/lib/admin/asset-form-parse";
import {
  fetchAdminCountries,
  fetchAdminDoctors,
  postAdminAsset,
} from "@/lib/admin/admin-api";
import { AdminCard, Btn, PageHeader } from "../../_components/atoms";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ countryId?: string; scope?: string; error?: string }>;
};

export default async function AdminNewAssetPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const createError = sp.error;
  const countryId = sp.countryId?.trim();
  const scopeGlobal = sp.scope === "global";

  const countriesResult = await fetchAdminCountries();
  if (!countriesResult.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Global"
          title="New asset"
          actions={
            <Btn href="/admin/assets" variant="ghost" iconLeft={<ArrowLeft className="size-3.5" />}>
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

  if (!countryId && !scopeGlobal) {
    return (
      <>
        <PageHeader
          eyebrow="Global"
          title="New asset"
          description="Choose a country to load doctor profiles for optional linking, or create a global asset without a country."
          actions={
            <Btn href="/admin/assets" variant="ghost" iconLeft={<ArrowLeft className="size-3.5" />}>
              Cancel
            </Btn>
          }
        />
        <AdminCard>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">Country</span>
              <select
                name="countryId"
                className="gh-select min-w-[240px]"
                required
                defaultValue=""
              >
                <option value="">Select…</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code.toUpperCase()})
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="gh-btn gh-btn-primary">
              Continue
            </button>
            <Link
              href="/admin/assets/new?scope=global"
              className="text-[13px] font-semibold text-[var(--color-brand-primary)] underline underline-offset-2 hover:opacity-80"
            >
              Global asset (no country)
            </Link>
          </form>
        </AdminCard>
      </>
    );
  }

  let doctorOptions: { id: string; fullName: string; slug: string }[] = [];
  if (countryId) {
    const doctorsResult = await fetchAdminDoctors({
      countryId,
      pageSize: "100",
      isActive: "true",
    });
    if (doctorsResult.ok) {
      doctorOptions = doctorsResult.data.items.map((d) => ({
        id: d.id,
        fullName: d.fullName,
        slug: d.slug,
      }));
    }
  }

  async function createAssetAction(formData: FormData) {
    "use server";

    const raw = parseAssetBodyFromForm(formData);
    const body = {
      countryId: raw.countryId,
      doctorId: raw.doctorId,
      kind: raw.kind,
      key: raw.key,
      path: raw.path,
      altText: raw.altText.trim() === "" ? null : raw.altText.trim(),
      usageNote: raw.usageNote.trim() === "" ? null : raw.usageNote.trim(),
      isActive: raw.isActive,
    };

    const result = await postAdminAsset(body);
    if (!result.ok) {
      const q = countryId
        ? `countryId=${encodeURIComponent(countryId)}`
        : "scope=global";
      redirect(`/admin/assets/new?${q}&error=${encodeURIComponent(result.message)}`);
    }

    redirect(
      `/admin/assets/${result.data.asset.id}?success=${encodeURIComponent("Asset created")}`,
    );
  }

  return (
    <>
      <Link
        href="/admin/assets"
        className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to assets
      </Link>
      <PageHeader
        eyebrow="Global"
        title="New asset"
        description={
          countryId
            ? "Configure path, kind, alt text, and optional doctor link."
            : "Global asset — not tied to a specific country."
        }
        actions={
          <Btn href="/admin/assets" variant="ghost">
            Cancel
          </Btn>
        }
      />

      {createError ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {createError}
        </p>
      ) : null}

      <AdminCard>
        <form action={createAssetAction} className="flex flex-col gap-8">
          <AssetFields countries={countries} doctorOptions={doctorOptions} />
          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] pt-6">
            <button type="submit" className="gh-btn gh-btn-primary">
              Create asset
            </button>
            <Link
              href="/admin/assets"
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
