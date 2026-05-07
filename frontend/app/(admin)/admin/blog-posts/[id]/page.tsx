import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { deleteAdminBlogPost, fetchAdminBlogPostById } from "@/lib/admin/admin-api";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
};

export default async function AdminBlogPostDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  const result = await fetchAdminBlogPostById(id);
  if (!result.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Blog post</h1>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          Could not load blog post: {result.message}
        </p>
        <Link href="/admin/blog-posts" className="mt-6 inline-block gh-link text-sm text-[var(--color-text-muted)]">
          Back to list
        </Link>
      </section>
    );
  }

  async function deactivateAction() {
    "use server";
    const deleted = await deleteAdminBlogPost(id);
    if (!deleted.ok) {
      redirect(`/admin/blog-posts/${id}?error=${encodeURIComponent(deleted.message)}`);
    }
    redirect(`/admin/blog-posts/${id}?success=${encodeURIComponent("Blog post deactivated")}`);
  }

  const { post } = result.data;
  const isActive = post.isActive;

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="gh-h2 text-[var(--color-text-primary)]">{post.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/admin/blog-posts/${id}/edit`} className="gh-btn gh-btn-primary">Edit</Link>
          <Link href="/admin/blog-posts" className="gh-link text-sm text-[var(--color-text-muted)]">Back to list</Link>
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
        <span className="text-xs text-[var(--color-text-muted)]">{post.status} · {post.locale} · {post.country?.name ?? "Global"}</span>
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Slug</dt>
          <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{post.slug}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Status</dt>
          <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{post.status}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Locale</dt>
          <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{post.locale}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Country</dt>
          <dd className="mt-1 text-sm text-[var(--color-text-primary)]">{post.country?.name ?? "Global"}</dd>
        </div>
      </dl>

      <div className="mt-6 rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Body</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-text-muted)]">{post.body}</p>
      </div>

      {isActive ? (
        <form action={deactivateAction} className="mt-8 border-t border-[var(--color-border)] pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--color-text-muted)]">Deactivating removes this post from the public blog API.</p>
            <button type="submit" className="gh-btn gh-btn-danger shrink-0">Deactivate post</button>
          </div>
        </form>
      ) : (
        <p className="mt-8 border-t border-[var(--color-border)] pt-6 text-sm text-[var(--color-text-muted)]">
          This post is inactive. Re-enable from edit.
        </p>
      )}
    </section>
  );
}
