import Link from "next/link";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { redirect } from "next/navigation";
import { revalidateTag, revalidatePath } from "next/cache";
import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
import {
  fetchAdminBlogPostById,
  patchAdminBlogPost,
  purgeAdminBlogPost,
} from "@/lib/admin/admin-api";
import { PUBLIC_BLOG_TAG } from "@/lib/content/get-public-blog";
import { AdminCard, Btn, PageHeader } from "../../../_components/atoms";
import { ConfirmDeleteButton } from "../../../_components/confirm-delete-button";
import { BlogFields } from "../../_components/blog-fields";
import { parseBlogBody, validateBlogBody } from "../../_components/blog-form-parse";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string; success?: string }>;
};

function bustBlogCaches(slug: string) {
  revalidateTag(PUBLIC_BLOG_TAG, "max");
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
}

export default async function AdminEditBlogPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};

  const result = await fetchAdminBlogPostById(id);
  if (!result.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Global"
          title="Edit blog post"
          actions={
            <Btn href="/admin/blog" variant="ghost" size="md" iconLeft={<ArrowLeft className="size-3.5" />}>
              Back
            </Btn>
          }
        />
        <AdminCard>
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            Could not load post: {result.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const post = result.data.post;

  async function updateBlogAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const body = parseBlogBody(formData);
    const validationError = validateBlogBody(body);
    if (validationError) {
      redirect(`/admin/blog/${id}/edit?error=${encodeURIComponent(validationError)}`);
    }
    const updated = await patchAdminBlogPost(id, body);
    if (!updated.ok) {
      redirect(`/admin/blog/${id}/edit?error=${encodeURIComponent(updated.message)}`);
    }
    bustBlogCaches(updated.data.post.slug);
    redirect(`/admin/blog/${id}/edit?success=${encodeURIComponent("Post saved")}`);
  }

  async function deleteBlogAction() {
    "use server";
    await requireAdminAction();
    const before = await fetchAdminBlogPostById(id);
    const deleted = await purgeAdminBlogPost(id);
    if (!deleted.ok) {
      redirect(`/admin/blog/${id}/edit?error=${encodeURIComponent(deleted.message)}`);
    }
    if (before.ok) bustBlogCaches(before.data.post.slug);
    redirect(`/admin/blog?success=${encodeURIComponent("Post deleted")}`);
  }

  return (
    <>
      <Link
        href="/admin/blog"
        className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to blog
      </Link>
      <PageHeader
        eyebrow="Global"
        title={post.title || "(untitled post)"}
        description={`${post.status} · ${post.locale} · /blog/${post.slug}`}
        actions={
          <div className="flex items-center gap-2">
            {post.status === "PUBLISHED" && post.isActive ? (
              <Btn
                href={`/blog/${post.slug}`}
                variant="ghost"
                size="md"
                iconLeft={<ExternalLink className="size-3.5" />}
              >
                View
              </Btn>
            ) : null}
            <form action={deleteBlogAction}>
              <ConfirmDeleteButton
                message="Permanently delete this blog post? This cannot be undone."
                className="gh-btn gh-btn-danger"
                ariaLabel="Delete post permanently"
              >
                <Trash2 className="mr-1.5 size-3.5" aria-hidden /> Delete
              </ConfirmDeleteButton>
            </form>
          </div>
        }
      />

      {messages.error ? (
        <AdminCard>
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">{messages.error}</p>
        </AdminCard>
      ) : null}
      {messages.success ? (
        <AdminCard>
          <p className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {messages.success}
          </p>
        </AdminCard>
      ) : null}

      <form action={updateBlogAction} className="mt-6 flex flex-col gap-6">
        <BlogFields post={post} />
        <div className="flex items-center justify-end gap-2">
          <Btn href="/admin/blog" variant="ghost" size="md">
            Cancel
          </Btn>
          <Btn type="submit" variant="primary" size="md">
            Save post
          </Btn>
        </div>
      </form>
    </>
  );
}
