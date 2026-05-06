import Link from "next/link";
import { redirect } from "next/navigation";
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
    return <section className="gh-card p-6 sm:p-8">Could not load blog post: {result.message}</section>;
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

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">{post.title}</h1>
        <div className="flex gap-3">
          <Link href={`/admin/blog-posts/${id}/edit`} className="gh-btn gh-btn-primary">
            Edit
          </Link>
          <Link href="/admin/blog-posts" className="gh-link">
            Back
          </Link>
        </div>
      </div>
      {sp.success ? <p className="mt-3 text-green-700">{sp.success}</p> : null}
      {sp.error ? <p className="mt-3 text-[var(--color-status-warning-text)]">{sp.error}</p> : null}
      <dl className="mt-6 grid gap-2 text-sm">
        <div><dt className="font-semibold">Slug</dt><dd>{post.slug}</dd></div>
        <div><dt className="font-semibold">Status</dt><dd>{post.status}</dd></div>
        <div><dt className="font-semibold">Locale</dt><dd>{post.locale}</dd></div>
        <div><dt className="font-semibold">Country</dt><dd>{post.country?.name ?? "Global"}</dd></div>
        <div><dt className="font-semibold">Active</dt><dd>{post.isActive ? "Yes" : "No"}</dd></div>
      </dl>
      <p className="mt-6 whitespace-pre-wrap text-sm text-[var(--color-text-primary)]">{post.body}</p>
      <form action={deactivateAction} className="mt-6">
        <button type="submit" className="gh-btn">
          Deactivate
        </button>
      </form>
    </section>
  );
}
