import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AssetFields } from "../../_components/asset-fields";
import { parseAssetBodyFromForm } from "@/lib/admin/asset-form-parse";
import {
  fetchAdminAssetById,
  fetchAdminCountries,
  fetchAdminDoctors,
  patchAdminAsset,
} from "@/lib/admin/admin-api";
import { AdminCard, Btn, PageHeader } from "../../../_components/atoms";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

export default async function AdminEditAssetPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};

  const [assetResult, countriesResult] = await Promise.all([
    fetchAdminAssetById(id),
    fetchAdminCountries(),
  ]);

  if (!countriesResult.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Global"
          title="Edit asset"
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

  if (!assetResult.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Global"
          title="Edit asset"
          actions={
            <Btn href="/admin/assets" variant="ghost" iconLeft={<ArrowLeft className="size-3.5" />}>
              Cancel
            </Btn>
          }
        />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load asset: {assetResult.message}
          </p>
        </AdminCard>
      </>
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
    <>
      <Link
        href={`/admin/assets/${id}`}
        className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to {asset.key}
      </Link>
      <PageHeader
        eyebrow="Global"
        title={`Edit ${asset.key}`}
        description="Path, kind, alt text, and optional doctor link."
        actions={
          <Btn href={`/admin/assets/${id}`} variant="ghost">
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
        <form action={updateAssetAction} className="flex flex-col gap-8">
          <AssetFields
            countries={countries}
            doctorOptions={doctorOptions}
            initial={asset}
          />
          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] pt-6">
            <button type="submit" className="gh-btn gh-btn-primary">
              Save changes
            </button>
            <Link
              href={`/admin/assets/${id}`}
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
