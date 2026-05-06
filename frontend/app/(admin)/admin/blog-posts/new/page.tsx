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
    return <section className="gh-card p-6 sm:p-8">Could not load countries: {countriesResult.message}</section>;
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
      <h1 className="gh-h2 text-[var(--color-text-primary)]">New blog post</h1>
      {createError ? <p className="mt-4 text-amber-900">{createError}</p> : null}
      <form action={createAction} className="mt-6 grid gap-4">
        <input name="title" className="gh-input" placeholder="Title" required />
        <input name="slug" className="gh-input" placeholder="slug-like-this" required />
        <textarea name="excerpt" className="gh-textarea" placeholder="Excerpt (optional)" rows={2} />
        <textarea name="body" className="gh-textarea" placeholder="Body/content" rows={10} required />
        <div className="grid gap-3 sm:grid-cols-2">
          <select name="status" className="gh-select" defaultValue="DRAFT">
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </select>
          <select name="locale" className="gh-select" defaultValue="EN">
            {["EN", "PT", "ES", "CS", "RO", "DE"].map((locale) => (
              <option key={locale} value={locale}>
                {locale}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <select name="countryId" className="gh-select" defaultValue="">
            <option value="">Global (no country)</option>
            {countriesResult.data.countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </select>
          <input name="publishedAt" className="gh-input" type="datetime-local" />
        </div>
        <input name="category" className="gh-input" placeholder="Category (optional)" />
        <input name="authorDisplayName" className="gh-input" placeholder="Author display name (optional)" />
        <input name="coverAssetId" className="gh-input" placeholder="Cover asset ID (optional)" />
        <input name="seoTitle" className="gh-input" placeholder="SEO title (optional)" />
        <textarea name="seoDescription" className="gh-textarea" placeholder="SEO description (optional)" rows={2} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked />
          Active
        </label>
        <div className="flex gap-3">
          <button className="gh-btn gh-btn-primary" type="submit">
            Create post
          </button>
          <Link href="/admin/blog-posts" className="gh-link">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
