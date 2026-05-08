import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CheckCircle2, AlertCircle } from "lucide-react";
import {
  adminAssetPreviewable,
  deleteAdminAsset,
  fetchAdminAssetById,
  purgeAdminAsset,
  type AdminAssetKind,
} from "@/lib/admin/admin-api";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
};

export default async function AdminAssetDetailPage({ params, searchParams }: PageProps) {
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
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Asset</h1>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          Could not load asset: {result.message}
        </p>
        <Link href="/admin/assets" className="mt-6 inline-block gh-link text-sm text-[var(--color-text-muted)]">
          Back to list
        </Link>
      </section>
    );
  }

  const a = result.data.asset;
  const isActive = a.isActive;
  const showPreview = adminAssetPreviewable(a.kind as AdminAssetKind, a.path);

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="gh-h2 text-[var(--color-text-primary)]">{a.key}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Metadata record — optional uploads via Railway Bucket use POST /api/admin/media/upload; files are served from GET /api/media/… when storage env vars are set.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/admin/assets/${id}/edit`} className="gh-btn gh-btn-primary">Edit</Link>
          <Link href="/admin/assets" className="gh-link text-sm text-[var(--color-text-muted)]">Back to list</Link>
        </div>
      </div>

      {messages.error ? <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">{messages.error}</p> : null}
      {messages.success ? <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-success">{messages.success}</p> : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${
          isActive
            ? "bg-[var(--color-status-success-bg)] text-[var(--color-status-success-text)] border-[var(--color-status-success-border)]"
            : "bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text)] border-[var(--color-status-warning-border)]"
        }`}>
          {isActive ? <CheckCircle2 className="size-3.5" /> : <AlertCircle className="size-3.5" />}
          {isActive ? "Active" : "Inactive"}
        </span>
        <span className="text-xs text-[var(--color-text-muted)]">Inactive assets are omitted from the public assets API.</span>
      </div>

      {showPreview ? (
        <div className="mt-6 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Preview</h2>
          <div className="mt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={a.path}
              alt={a.altText ?? ""}
              className="max-h-40 max-w-full rounded border border-[var(--color-border)] object-contain"
            />
          </div>
        </div>
      ) : null}

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Kind</dt>
          <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{a.kind}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Country</dt>
          <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{a.country ? `${a.country.name} (${a.country.code})` : "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Path</dt>
          <dd className="mt-1 break-all text-sm text-[var(--color-text-primary)]">{a.path}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Alt text</dt>
          <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{a.altText ?? "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Usage note</dt>
          <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{a.usageNote ?? "—"}</dd>
        </div>
        {a.doctor ? (
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Linked doctor</dt>
            <dd className="mt-1 text-sm text-[var(--color-text-primary)]">
              {a.doctor.fullName} ({a.doctor.slug})
            </dd>
          </div>
        ) : null}
      </dl>

      {isActive ? (
        <form action={deactivateAssetAction} className="mt-8 border-t border-[var(--color-border)] pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--color-text-muted)]">Deactivate hides this asset from the public listing API.</p>
            <button type="submit" className="gh-btn gh-btn-danger shrink-0">Deactivate asset</button>
          </div>
        </form>
      ) : (
        <p className="mt-8 border-t border-[var(--color-border)] pt-6 text-sm text-[var(--color-text-muted)]">
          This asset is inactive. Re-enable from edit.
        </p>
      )}
      <form action={deleteAssetAction} className="mt-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--color-text-muted)]">Permanent delete removes this asset record from admin and public responses.</p>
          <button type="submit" className="gh-btn gh-btn-danger shrink-0">Delete permanently</button>
        </div>
      </form>
    </section>
  );
}
