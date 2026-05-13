import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CheckCircle2, AlertCircle } from "lucide-react";
import {
  deleteAdminContentPage,
  fetchAdminContentPageById,
  purgeAdminContentPage,
} from "@/lib/admin/admin-api";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
};

export default async function AdminContentPageDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  const pageResult = await fetchAdminContentPageById(id);
  if (!pageResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Content page</h1>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          Could not load content page: {pageResult.message}
        </p>
        <Link href="/admin/content-pages" className="mt-6 inline-block gh-link text-sm text-[var(--color-text-muted)]">
          Back to list
        </Link>
      </section>
    );
  }

  async function deactivateAction() {
    "use server";
    const result = await deleteAdminContentPage(id);
    if (!result.ok) {
      redirect(`/admin/content-pages/${id}?error=${encodeURIComponent(result.message)}`);
    }
    redirect(`/admin/content-pages/${id}?success=${encodeURIComponent("Content page deactivated")}`);
  }

  async function deleteAction() {
    "use server";
    const result = await purgeAdminContentPage(id);
    if (!result.ok) {
      redirect(`/admin/content-pages/${id}?error=${encodeURIComponent(result.message)}`);
    }
    revalidatePath("/admin/content-pages");
    redirect("/admin/content-pages");
  }

  const page = pageResult.data.page;
  const isActive = page.isActive;

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="gh-h2 text-[var(--color-text-primary)]">{page.title}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Legal copy edits may require external approval. Public routes remain fallback-safe until approved.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/admin/content-pages/${id}/edit`} className="gh-btn gh-btn-primary">Edit</Link>
          <Link href="/admin/content-pages" className="gh-link text-sm text-[var(--color-text-muted)]">Back to list</Link>
        </div>
      </div>

      {sp.error ? <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">{sp.error}</p> : null}
      {sp.success ? <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-success">{sp.success}</p> : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${
          isActive
            ? "bg-[var(--color-status-success-bg)] text-[var(--color-status-success-text)] border-[var(--color-status-success-border)]"
            : "bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning-text)] border-[var(--color-status-warning-border)]"
        }`}>
          {isActive ? <CheckCircle2 className="size-3.5" /> : <AlertCircle className="size-3.5" />}
          {isActive ? "Active" : "Inactive"}
        </span>
        <span className="text-xs text-[var(--color-text-muted)]">{page.status} · {page.locale} · {page.country?.name ?? "Global"}</span>
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Page key</dt>
          <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{page.pageKey}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Status</dt>
          <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{page.status}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Locale</dt>
          <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{page.locale}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Country</dt>
          <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{page.country?.name ?? "Global"}</dd>
        </div>
      </dl>

      <div className="mt-6 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Body</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-text-muted)]">{page.body}</p>
      </div>

      {isActive ? (
        <form action={deactivateAction} className="mt-8 border-t border-[var(--color-border)] pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--color-text-muted)]">Deactivating removes this page from the public content API.</p>
            <button type="submit" className="gh-btn gh-btn-danger shrink-0">Deactivate page</button>
          </div>
        </form>
      ) : (
        <p className="mt-8 border-t border-[var(--color-border)] pt-6 text-sm text-[var(--color-text-muted)]">
          This page is inactive. Re-enable from edit.
        </p>
      )}
      <form action={deleteAction} className="mt-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--color-text-muted)]">Permanent delete removes this content page instead of just hiding it.</p>
          <button type="submit" className="gh-btn gh-btn-danger shrink-0">Delete permanently</button>
        </div>
      </form>
    </section>
  );
}
