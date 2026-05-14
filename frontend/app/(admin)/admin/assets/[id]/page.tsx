import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  adminAssetPreviewable,
  deleteAdminAsset,
  fetchAdminAssetById,
  purgeAdminAsset,
  type AdminAssetKind,
} from "@/lib/admin/admin-api";
import { FlagBadge } from "../../_components/flag-badge";
import { AdminCard, Btn, PageHeader, Pill } from "../../_components/atoms";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
};

const cardTitleStyle = {
  margin: 0,
  fontFamily: "var(--font-display)",
  fontSize: 16,
  fontWeight: 800,
  color: "var(--color-text-primary)",
} as const;

function FieldRow({
  label,
  value,
  mono = false,
  full = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
        {label}
      </dt>
      <dd
        className="mt-1 break-all text-[14px] text-[var(--color-text-primary)]"
        style={mono ? { fontFamily: "ui-monospace, monospace", fontSize: 12.5 } : undefined}
      >
        {value}
      </dd>
    </div>
  );
}

export default async function AdminAssetDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};
  const result = await fetchAdminAssetById(id);

  async function deactivateAssetAction() {
    "use server";
    const updateResult = await deleteAdminAsset(id);
    if (!updateResult.ok) {
      redirect(`/admin/assets/${id}?error=${encodeURIComponent(updateResult.message)}`);
    }
    revalidatePath("/admin/assets");
    revalidatePath(`/admin/assets/${id}`);
    redirect(`/admin/assets/${id}?success=${encodeURIComponent("Asset deactivated")}`);
  }

  async function deleteAssetAction() {
    "use server";
    const deleteResult = await purgeAdminAsset(id);
    if (!deleteResult.ok) {
      redirect(`/admin/assets/${id}?error=${encodeURIComponent(deleteResult.message)}`);
    }
    revalidatePath("/admin/assets");
    redirect("/admin/assets");
  }

  if (!result.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Global"
          title="Asset"
          actions={
            <Btn href="/admin/assets" variant="ghost" iconLeft={<ArrowLeft className="size-3.5" />}>
              Back
            </Btn>
          }
        />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load asset: {result.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const a = result.data.asset;
  const isActive = a.isActive;
  const showPreview = adminAssetPreviewable(a.kind as AdminAssetKind, a.path);

  return (
    <>
      <Link
        href="/admin/assets"
        className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to assets
      </Link>
      <PageHeader
        eyebrow={
          a.country ? (
            <span className="inline-flex items-center gap-2">
              <FlagBadge code={a.country.code} size={14} />
              {a.country.name}
            </span>
          ) : (
            "Global asset"
          )
        }
        title={a.key}
        description={a.kind}
        actions={
          <>
            <Pill tone={isActive ? "published" : "draft"}>
              {isActive ? "Active" : "Inactive"}
            </Pill>
            <Btn href={`/admin/assets/${id}/edit`} variant="primary">
              Edit
            </Btn>
          </>
        }
      />

      {messages.error ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {messages.error}
        </p>
      ) : null}
      {messages.success ? (
        <p className="gh-status-success mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {messages.success}
        </p>
      ) : null}

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}
      >
        <div className="grid gap-4">
          {showPreview ? (
            <AdminCard>
              <h3 style={cardTitleStyle}>Preview</h3>
              <div className="mt-3 rounded-md bg-[var(--color-background-soft)] p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.path}
                  alt={a.altText ?? ""}
                  className="mx-auto block max-h-72 max-w-full rounded border border-[var(--color-border)] object-contain"
                />
              </div>
            </AdminCard>
          ) : null}

          <AdminCard>
            <h3 style={cardTitleStyle}>Asset details</h3>
            <p className="mb-4 mt-1 text-[13px] text-[var(--color-text-muted)]">
              Path + metadata. Files served via Railway Bucket when storage env vars are configured.
            </p>
            <dl className="grid gap-4 sm:grid-cols-2">
              <FieldRow label="Key" value={a.key} mono />
              <FieldRow label="Kind" value={a.kind} />
              <FieldRow
                label="Country"
                value={
                  a.country
                    ? `${a.country.name} (${a.country.code.toUpperCase()})`
                    : "—"
                }
              />
              <FieldRow
                label="Linked doctor"
                value={a.doctor ? `${a.doctor.fullName} (${a.doctor.slug})` : "—"}
              />
              <FieldRow label="Path" value={a.path} mono full />
              <FieldRow label="Alt text" value={a.altText ?? "—"} full />
              <FieldRow label="Usage note" value={a.usageNote ?? "—"} full />
            </dl>
          </AdminCard>
        </div>

        <div className="grid gap-4 self-start">
          <AdminCard>
            <h3 style={cardTitleStyle}>Visibility</h3>
            <p className="mb-4 mt-1 text-[13px] text-[var(--color-text-muted)]">
              Deactivate hides this asset from the public listing API.
            </p>
            {isActive ? (
              <form action={deactivateAssetAction}>
                <button type="submit" className="gh-btn gh-btn-danger w-full">
                  Deactivate asset
                </button>
              </form>
            ) : (
              <p className="text-[13px] text-[var(--color-text-muted)]">
                This asset is inactive. Re-enable from Edit.
              </p>
            )}
          </AdminCard>

          <AdminCard>
            <h3
              style={{
                ...cardTitleStyle,
                color: "var(--color-status-error-text)",
              }}
            >
              Danger zone
            </h3>
            <p className="mb-4 mt-1 text-[13px] text-[var(--color-text-muted)]">
              Permanent delete removes this asset record entirely.
            </p>
            <form action={deleteAssetAction}>
              <button type="submit" className="gh-btn gh-btn-danger w-full">
                Delete permanently
              </button>
            </form>
          </AdminCard>
        </div>
      </div>
    </>
  );
}
