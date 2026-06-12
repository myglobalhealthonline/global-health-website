import Link from "next/link";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { ArrowLeft } from "lucide-react";
import { postAdminBlogPost, fetchAdminDoctors } from "@/lib/admin/admin-api";
import { PUBLIC_BLOG_TAG } from "@/lib/content/get-public-blog";
import { AdminCard, Btn, PageHeader } from "../../_components/atoms";
import { BlogFields } from "../_components/blog-fields";
import { parseBlogBody, validateBlogBody } from "../_components/blog-form-parse";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function AdminNewBlogPage({ searchParams }: PageProps) {
  const messages = searchParams ? await searchParams : {};
  const doctorsRes = await fetchAdminDoctors({ pageSize: "200" });
  const doctors = doctorsRes.ok
    ? doctorsRes.data.items.map((d) => ({ id: d.id, fullName: d.fullName }))
    : [];

  async function createBlogAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const body = parseBlogBody(formData);
    const validationError = validateBlogBody(body);
    if (validationError) {
      redirect(`/admin/blog/new?error=${encodeURIComponent(validationError)}`);
    }
    const result = await postAdminBlogPost(body);
    if (!result.ok) {
      redirect(`/admin/blog/new?error=${encodeURIComponent(result.message)}`);
    }
    revalidateTag(PUBLIC_BLOG_TAG, "max");
    redirect(`/admin/blog/${result.data.post.id}/edit?success=${encodeURIComponent("Post created")}`);
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
        title="New blog post"
        description="Upload an .html file (or paste HTML), fill the details, set status to Published, and it appears on /blog."
      />

      {messages.error ? (
        <AdminCard>
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">{messages.error}</p>
        </AdminCard>
      ) : null}

      <form action={createBlogAction} className="mt-6 flex flex-col gap-6">
        <BlogFields isCreate doctors={doctors} />
        <div className="flex items-center justify-end gap-2">
          <Btn href="/admin/blog" variant="ghost" size="md">
            Cancel
          </Btn>
          <Btn type="submit" variant="primary" size="md">
            Create post
          </Btn>
        </div>
      </form>
    </>
  );
}
