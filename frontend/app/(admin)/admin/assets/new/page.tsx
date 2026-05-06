import Link from "next/link";
import { redirect } from "next/navigation";
import { AssetFields } from "../_components/asset-fields";
import { parseAssetBodyFromForm } from "@/lib/admin/asset-form-parse";
import {
  fetchAdminCountries,
  fetchAdminDoctors,
  postAdminAsset,
} from "@/lib/admin/admin-api";

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
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">New asset</h1>
        <p className="mt-4 text-[var(--color-status-warning-text)]">Could not load countries: {countriesResult.message}</p>
      </section>
    );
  }

  const countries = countriesResult.data.countries.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
  }));

  if (!countryId && !scopeGlobal) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">New asset</h1>
        <p className="gh-body mt-3 text-[var(--color-text-muted)]">
          Choose a country to load doctor profiles for optional linking, or create a global asset without a country.
        </p>
        <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-2">
            <span className="gh-field-label">Country</span>
            <select name="countryId" className="gh-select min-w-[240px]" required defaultValue="">
              <option value="">Select…</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="gh-btn gh-btn-primary">
            Continue
          </button>
        </form>
        <Link
          href="/admin/assets/new?scope=global"
          className="mt-6 inline-block gh-link text-[var(--color-brand-primary)]"
        >
          Global asset (no country)
        </Link>
        <div className="mt-6">
          <Link href="/admin/assets" className="gh-link text-sm text-[var(--color-text-muted)]">
            Back to assets
          </Link>
        </div>
      </section>
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

    redirect(`/admin/assets/${result.data.asset.id}?success=${encodeURIComponent("Asset created")}`);
  }

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">New asset</h1>
        <Link href="/admin/assets/new" className="gh-link text-sm text-[var(--color-text-muted)]">
          Change scope
        </Link>
      </div>

      {createError ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          {createError}
        </p>
      ) : null}

      <form action={createAssetAction} className="mt-8 flex flex-col gap-8">
        <AssetFields countries={countries} doctorOptions={doctorOptions} />
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="gh-btn gh-btn-primary">
            Create asset
          </button>
          <Link href="/admin/assets" className="gh-link text-sm text-[var(--color-text-muted)]">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
