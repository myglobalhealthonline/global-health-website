import Link from "next/link";
import { redirect } from "next/navigation";
import {
  fetchAdminCountries,
  postAdminContentPage,
} from "@/lib/admin/admin-api";
import { parseContentPageBodyFromForm } from "@/lib/admin/content-page-form-parse";

export const dynamic = "force-dynamic";

type PageProps = { searchParams?: Promise<{ error?: string }> };

export default async function AdminNewContentPagePage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const countriesResult = await fetchAdminCountries();
  if (!countriesResult.ok) {
    return <section className="gh-card p-6 sm:p-8">Could not load countries: {countriesResult.message}</section>;
  }

  async function createAction(formData: FormData) {
    "use server";
    const body = parseContentPageBodyFromForm(formData);
    const result = await postAdminContentPage(body);
    if (!result.ok) {
      redirect(`/admin/content-pages/new?error=${encodeURIComponent(result.message)}`);
    }
    redirect(`/admin/content-pages/${result.data.page.id}?success=${encodeURIComponent("Content page created")}`);
  }

  return (
    <section className="gh-card p-6 sm:p-8">
      <h1 className="gh-h2 text-[var(--color-text-primary)]">New content page</h1>
      <p className="mt-3 text-sm text-amber-900">
        Legal/static pages should stay fallback-safe in public routes until approved copy exists.
      </p>
      {sp.error ? <p className="mt-3 text-amber-900">{sp.error}</p> : null}
      <form action={createAction} className="mt-6 grid gap-4">
        <input aria-label="Content page key" className="gh-input" name="pageKey" placeholder="privacy-policy" required />
        <input aria-label="Content page title" className="gh-input" name="title" placeholder="Title" required />
        <textarea aria-label="Content page body" className="gh-textarea" name="body" placeholder="Body/content" rows={12} required />
        <div className="grid gap-3 sm:grid-cols-2">
          <select aria-label="Content page status" className="gh-select" name="status" defaultValue="DRAFT">
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </select>
          <select aria-label="Content page locale" className="gh-select" name="locale" defaultValue="EN">
            {["EN", "PT", "ES", "CS", "RO", "DE"].map((locale) => (
              <option key={locale} value={locale}>{locale}</option>
            ))}
          </select>
        </div>
        <select aria-label="Content page country" className="gh-select" name="countryId" defaultValue="">
          <option value="">Global (no country)</option>
          {countriesResult.data.countries.map((country) => (
            <option key={country.id} value={country.id}>{country.name}</option>
          ))}
        </select>
        <input aria-label="SEO title" className="gh-input" name="seoTitle" placeholder="SEO title (optional)" />
        <textarea aria-label="SEO description" className="gh-textarea" name="seoDescription" placeholder="SEO description (optional)" rows={2} />
        <input aria-label="Last reviewed date and time" className="gh-input" name="lastReviewedAt" type="datetime-local" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked />
          Active
        </label>
        <div className="flex gap-3">
          <button className="gh-btn gh-btn-primary" type="submit">Create page</button>
          <Link href="/admin/content-pages" className="gh-link">Cancel</Link>
        </div>
      </form>
    </section>
  );
}
