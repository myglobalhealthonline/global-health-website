import Link from "next/link";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { ArrowLeft } from "lucide-react";
import { postAdminBlogPost, fetchAdminDoctors, fetchAdminServices } from "@/lib/admin/admin-api";
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
  const [doctorsRes, servicesRes] = await Promise.all([
    fetchAdminDoctors({ pageSize: "200" }),
    fetchAdminServices({ pageSize: "200" }),
  ]);
  const doctors = doctorsRes.ok
    ? doctorsRes.data.items.map((d) => ({ id: d.id, fullName: d.fullName }))
    : [];
  const services = servicesRes.ok
    ? servicesRes.data.items.map((s) => ({ id: s.id, name: `${s.name} — ${s.country.name}` }))
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
        className="mb-2 inline-flex items-center gap-1.5 text-portal-compact font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
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

      <form action={createBlogAction} className="gh-admin-blog-form mt-6">
        <BlogFields isCreate doctors={doctors} services={services} />
        <div className="gh-admin-blog-actions gh-admin-blog-actions--end">
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
