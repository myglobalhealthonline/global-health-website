import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchAdminCountries, postAdminBlogPost } from "@/lib/admin/admin-api";
import { parseBlogPostBodyFromForm } from "@/lib/admin/blog-form-parse";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function AdminNewBlogPostPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const countriesResult = await fetchAdminCountries();
  const createError = sp.error;

  if (!countriesResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="gh-h2 text-[var(--color-text-primary)]">New blog post</h1>
          <Link href="/admin/blog-posts" className="gh-link text-sm text-[var(--color-text-muted)]">
            Cancel
          </Link>
        </div>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          Could not load countries: {countriesResult.message}
        </p>
      </section>
    );
  }

  async function createAction(formData: FormData) {
    "use server";
    const body = parseBlogPostBodyFromForm(formData);
    const result = await postAdminBlogPost(body);
    if (!result.ok) {
      redirect(`/admin/blog-posts/new?error=${encodeURIComponent(result.message)}`);
    }
    redirect(`/admin/blog-posts/${result.data.post.id}?success=${encodeURIComponent("Blog post created")}`);
  }

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">New blog post</h1>
        <Link href="/admin/blog-posts" className="gh-link text-sm text-[var(--color-text-muted)]">
          Cancel
        </Link>
      </div>

      {createError ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          {createError}
        </p>
      ) : null}

      <form action={createAction} className="mt-8 flex flex-col gap-8">
        <input aria-label="Post title" name="title" className="gh-input" placeholder="Title" required />
        <input aria-label="Post slug" name="slug" className="gh-input" placeholder="slug-like-this" required />
        <textarea aria-label="Post excerpt" name="excerpt" className="gh-textarea" placeholder="Excerpt (optional)" rows={2} />
        <textarea aria-label="Post body content" name="body" className="gh-textarea" placeholder="Body/content" rows={10} required />
        <div className="grid gap-3 sm:grid-cols-2">
          <select aria-label="Post status" name="status" className="gh-select" defaultValue="DRAFT">
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </select>
          <select aria-label="Post locale" name="locale" className="gh-select" defaultValue="EN">
            {["EN", "PT", "ES", "CS", "RO", "DE"].map((locale) => (
              <option key={locale} value={locale}>
                {locale}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <select aria-label="Post country" name="countryId" className="gh-select" defaultValue="">
            <option value="">Global (no country)</option>
            {countriesResult.data.countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </select>
          <input aria-label="Publish date and time" name="publishedAt" className="gh-input" type="datetime-local" />
        </div>
        <input aria-label="Post category" name="category" className="gh-input" placeholder="Category (optional)" />
        <input aria-label="Author display name" name="authorDisplayName" className="gh-input" placeholder="Author display name (optional)" />
        <input aria-label="Cover asset ID" name="coverAssetId" className="gh-input" placeholder="Cover asset ID (optional)" />
        <input aria-label="SEO title" name="seoTitle" className="gh-input" placeholder="SEO title (optional)" />
        <textarea aria-label="SEO description" name="seoDescription" className="gh-textarea" placeholder="SEO description (optional)" rows={2} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked />
          Active
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button className="gh-btn gh-btn-primary" type="submit">
            Create post
          </button>
          <Link href="/admin/blog-posts" className="gh-link text-sm text-[var(--color-text-muted)]">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
