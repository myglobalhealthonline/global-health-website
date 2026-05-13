import Link from "next/link";
import { redirect } from "next/navigation";
import { AssetFields } from "../../_components/asset-fields";
import { parseAssetBodyFromForm } from "@/lib/admin/asset-form-parse";
import {
  fetchAdminAssetById,
  fetchAdminCountries,
  fetchAdminDoctors,
  patchAdminAsset,
} from "@/lib/admin/admin-api";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

export default async function AdminEditAssetPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};

  const [assetResult, countriesResult] = await Promise.all([
    fetchAdminAssetById(id),
    fetchAdminCountries(),
  ]);

  if (!countriesResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="gh-h2 text-[var(--color-text-primary)]">Edit asset</h1>
          <Link href="/admin/assets" className="gh-link text-sm text-[var(--color-text-muted)]">
            Cancel
          </Link>
        </div>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          Could not load countries: {countriesResult.message}
        </p>
      </section>
    );
  }

  if (!assetResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="gh-h2 text-[var(--color-text-primary)]">Edit asset</h1>
          <Link href="/admin/assets" className="gh-link text-sm text-[var(--color-text-muted)]">
            Cancel
          </Link>
        </div>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          Could not load asset: {assetResult.message}
        </p>
      </section>
    );
  }

  const asset = assetResult.data.asset;
  const countries = countriesResult.data.countries.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
  }));

  let doctorOptions: { id: string; fullName: string; slug: string }[] = [];
  if (asset.countryId) {
    const doctorsResult = await fetchAdminDoctors({
      countryId: asset.countryId,
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

  async function updateAssetAction(formData: FormData) {
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

    const result = await patchAdminAsset(id, body);
    if (!result.ok) {
      redirect(`/admin/assets/${id}/edit?error=${encodeURIComponent(result.message)}`);
    }

    redirect(`/admin/assets/${id}?success=${encodeURIComponent("Asset updated")}`);
  }

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Edit asset</h1>
        <Link href={`/admin/assets/${id}`} className="gh-link text-sm text-[var(--color-text-muted)]">
          Cancel
        </Link>
      </div>

      {messages.error ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          {messages.error}
        </p>
      ) : null}

      <form action={updateAssetAction} className="mt-8 flex flex-col gap-8">
        <AssetFields countries={countries} doctorOptions={doctorOptions} initial={asset} />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="gh-btn gh-btn-primary">
            Save changes
          </button>
          <Link href={`/admin/assets/${id}`} className="gh-link text-sm text-[var(--color-text-muted)]">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
