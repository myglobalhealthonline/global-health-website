import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  fetchAdminBlogPostById,
  fetchAdminCountries,
  patchAdminBlogPost,
} from "@/lib/admin/admin-api";
import { parseBlogPostBodyFromForm } from "@/lib/admin/blog-form-parse";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

export default async function AdminEditBlogPostPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  const [postResult, countriesResult] = await Promise.all([
    fetchAdminBlogPostById(id),
    fetchAdminCountries(),
  ]);
  if (!postResult.ok) notFound();
  if (!countriesResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="gh-h2 text-[var(--color-text-primary)]">Edit blog post</h1>
          <Link href={`/admin/blog-posts/${id}`} className="gh-link text-sm text-[var(--color-text-muted)]">
            Cancel
          </Link>
        </div>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          Could not load countries: {countriesResult.message}
        </p>
      </section>
    );
  }

  async function updateAction(formData: FormData) {
    "use server";
    const body = parseBlogPostBodyFromForm(formData);
    const result = await patchAdminBlogPost(id, body);
    if (!result.ok) {
      redirect(`/admin/blog-posts/${id}/edit?error=${encodeURIComponent(result.message)}`);
    }
    redirect(`/admin/blog-posts/${id}?success=${encodeURIComponent("Blog post updated")}`);
  }

  const post = postResult.data.post;

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Edit blog post</h1>
        <Link href={`/admin/blog-posts/${id}`} className="gh-link text-sm text-[var(--color-text-muted)]">
          Cancel
        </Link>
      </div>

      {sp.error ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          {sp.error}
        </p>
      ) : null}

      <form action={updateAction} className="mt-8 flex flex-col gap-8">
        <input aria-label="Post title" name="title" className="gh-input" defaultValue={post.title} required />
        <input aria-label="Post slug" name="slug" className="gh-input" defaultValue={post.slug} required />
        <textarea aria-label="Post excerpt" name="excerpt" className="gh-textarea" defaultValue={post.excerpt ?? ""} rows={2} />
        <textarea aria-label="Post body content" name="body" className="gh-textarea" defaultValue={post.body} rows={10} required />
        <div className="grid gap-3 sm:grid-cols-2">
          <select aria-label="Post status" name="status" className="gh-select" defaultValue={post.status}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </select>
          <select aria-label="Post locale" name="locale" className="gh-select" defaultValue={post.locale}>
            {["EN", "PT", "ES", "CS", "RO", "DE"].map((locale) => (
              <option key={locale} value={locale}>
                {locale}
              </option>
            ))}
          </select>
        </div>
        <select aria-label="Post country" name="countryId" className="gh-select" defaultValue={post.countryId ?? ""}>
          <option value="">Global (no country)</option>
          {countriesResult.data.countries.map((country) => (
            <option key={country.id} value={country.id}>
              {country.name}
            </option>
          ))}
        </select>
        <input aria-label="Post category" name="category" className="gh-input" defaultValue={post.category ?? ""} />
        <input aria-label="Author display name" name="authorDisplayName" className="gh-input" defaultValue={post.authorDisplayName ?? ""} />
        <input aria-label="Cover asset ID" name="coverAssetId" className="gh-input" defaultValue={post.coverAssetId ?? ""} />
        <input aria-label="Publish date and time" name="publishedAt" className="gh-input" type="datetime-local" defaultValue={post.publishedAt ? post.publishedAt.slice(0, 16) : ""} />
        <input aria-label="SEO title" name="seoTitle" className="gh-input" defaultValue={post.seoTitle ?? ""} />
        <textarea aria-label="SEO description" name="seoDescription" className="gh-textarea" defaultValue={post.seoDescription ?? ""} rows={2} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={post.isActive} />
          Active
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button className="gh-btn gh-btn-primary" type="submit">
            Save
          </button>
          <Link href={`/admin/blog-posts/${id}`} className="gh-link text-sm text-[var(--color-text-muted)]">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
