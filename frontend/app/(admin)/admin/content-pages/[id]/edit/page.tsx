import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  fetchAdminContentPageById,
  fetchAdminCountries,
  patchAdminContentPage,
} from "@/lib/admin/admin-api";
import { parseContentPageBodyFromForm } from "@/lib/admin/content-page-form-parse";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

export default async function AdminEditContentPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};
  const [pageResult, countriesResult] = await Promise.all([
    fetchAdminContentPageById(id),
    fetchAdminCountries(),
  ]);
  if (!pageResult.ok) notFound();
  if (!countriesResult.ok) {
    return <section className="gh-card p-6 sm:p-8">Could not load countries: {countriesResult.message}</section>;
  }

  async function updateAction(formData: FormData) {
    "use server";
    const body = parseContentPageBodyFromForm(formData);
    const result = await patchAdminContentPage(id, body);
    if (!result.ok) {
      redirect(`/admin/content-pages/${id}/edit?error=${encodeURIComponent(result.message)}`);
    }
    redirect(`/admin/content-pages/${id}?success=${encodeURIComponent("Content page updated")}`);
  }

  const page = pageResult.data.page;

  return (
    <section className="gh-card p-6 sm:p-8">
      <h1 className="gh-h2 text-[var(--color-text-primary)]">Edit content page</h1>
      <p className="mt-3 text-sm text-amber-900">
        Legal/static content may need external approval. Keep public legal pages fallback-safe unless approved content is confirmed.
      </p>
      {sp.error ? <p className="mt-3 text-amber-900">{sp.error}</p> : null}
      <form action={updateAction} className="mt-6 grid gap-4">
        <input className="gh-input" name="pageKey" defaultValue={page.pageKey} required />
        <input className="gh-input" name="title" defaultValue={page.title} required />
        <textarea className="gh-textarea" name="body" defaultValue={page.body} rows={12} required />
        <div className="grid gap-3 sm:grid-cols-2">
          <select className="gh-select" name="status" defaultValue={page.status}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </select>
          <select className="gh-select" name="locale" defaultValue={page.locale}>
            {["EN", "PT", "ES", "CS", "RO", "DE"].map((locale) => (
              <option key={locale} value={locale}>{locale}</option>
            ))}
          </select>
        </div>
        <select className="gh-select" name="countryId" defaultValue={page.countryId ?? ""}>
          <option value="">Global (no country)</option>
          {countriesResult.data.countries.map((country) => (
            <option key={country.id} value={country.id}>{country.name}</option>
          ))}
        </select>
        <input className="gh-input" name="seoTitle" defaultValue={page.seoTitle ?? ""} />
        <textarea className="gh-textarea" name="seoDescription" defaultValue={page.seoDescription ?? ""} rows={2} />
        <input
          className="gh-input"
          name="lastReviewedAt"
          type="datetime-local"
          defaultValue={page.lastReviewedAt ? page.lastReviewedAt.slice(0, 16) : ""}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={page.isActive} />
          Active
        </label>
        <div className="flex gap-3">
          <button className="gh-btn gh-btn-primary" type="submit">Save</button>
          <Link href={`/admin/content-pages/${id}`} className="gh-link">Cancel</Link>
        </div>
      </form>
    </section>
  );
}
