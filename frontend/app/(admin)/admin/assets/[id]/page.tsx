import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  adminAssetPreviewable,
  deleteAdminAsset,
  fetchAdminAssetById,
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

  if (!result.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Asset</h1>
        <p className="mt-4 text-[var(--color-status-warning-text)]">Could not load asset: {result.message}</p>
        <Link href="/admin/assets" className="mt-6 inline-block gh-link text-[var(--color-brand-primary)]">
          Back to assets
        </Link>
      </section>
    );
  }

  const a = result.data.asset;
  const showPreview = adminAssetPreviewable(a.kind as AdminAssetKind, a.path);

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">{a.key}</h1>
        <div className="flex flex-wrap gap-4">
          <Link href={`/admin/assets/${id}/edit`} className="gh-btn gh-btn-primary">
            Edit
          </Link>
          <Link href="/admin/assets" className="gh-link text-[var(--color-text-muted)]">
            Back to list
          </Link>
        </div>
      </div>

      <p className="mt-4 text-sm text-[var(--color-text-muted)]">
        Metadata record — optional uploads via Railway Bucket use POST /api/admin/media/upload; files are served from GET /api/media/… when storage env vars are set.
      </p>

      {messages.error ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          {messages.error}
        </p>
      ) : null}
      {messages.success ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-success">
          {messages.success}
        </p>
      ) : null}

      <p className="mt-4 text-sm text-[var(--color-text-muted)]">
        Status:{" "}
        <span className={a.isActive ? "text-[var(--color-status-success-text)]" : "text-[var(--color-status-warning-text)]"}>{a.isActive ? "Active" : "Inactive"}</span>
        {" — inactive assets are omitted from the public assets API."}
      </p>

      {showPreview ? (
        <div className="mt-6">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Preview</span>
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
          <dd className="mt-1 break-all font-mono text-xs text-[var(--color-text-primary)]">{a.path}</dd>
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

      {a.isActive ? (
        <form action={deactivateAssetAction} className="mt-10 border-t border-[var(--color-border)] pt-8">
          <p className="text-sm text-[var(--color-text-muted)]">Deactivate hides this asset from the public listing API.</p>
          <button type="submit" className="mt-4 gh-btn gh-btn-danger">
            Deactivate asset
          </button>
        </form>
      ) : (
        <p className="mt-10 border-t border-[var(--color-border)] pt-8 text-sm text-[var(--color-text-muted)]">
          Asset is inactive. Re-enable from edit.
        </p>
      )}
    </section>
  );
}
