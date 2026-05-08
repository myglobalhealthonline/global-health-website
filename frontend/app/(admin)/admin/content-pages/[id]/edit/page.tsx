import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  fetchAdminContentPages,
  fetchAdminContentPageById,
  fetchAdminCountries,
  patchAdminContentPage,
} from "@/lib/admin/admin-api";
import { parseContentPageBodyFromForm } from "@/lib/admin/content-page-form-parse";
import { detectDuplicateTextIssues, validateAdminContentPagePayload } from "@/lib/content/publication-validation";

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
    return (
      <section className="gh-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="gh-h2 text-[var(--color-text-primary)]">Edit content page</h1>
          <Link href={`/admin/content-pages/${id}`} className="gh-link text-sm text-[var(--color-text-muted)]">
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
    const body = parseContentPageBodyFromForm(formData);
    const [existingPages, validation] = await Promise.all([
      fetchAdminContentPages({ pageSize: "250" }),
      Promise.resolve(
        validateAdminContentPagePayload({
          title: body.title,
          body: body.body,
          seoTitle: body.seoTitle,
          seoDescription: body.seoDescription,
          lastReviewedAt: body.lastReviewedAt,
          status: body.status as "DRAFT" | "PUBLISHED",
        }),
      ),
    ]);
    const duplicateIssues = existingPages.ok
      ? detectDuplicateTextIssues(
          {
            id,
            title: body.seoTitle ?? body.title,
            description: body.seoDescription,
          },
          existingPages.data.items.map((item) => ({
            id: item.id,
            title: item.seoTitle ?? item.title,
            description: item.seoDescription,
          })),
        )
      : [];
    const issues = [...validation.issues, ...duplicateIssues];
    if (issues.length > 0) {
      body.status = "DRAFT";
      body.isActive = false;
    }
    const result = await patchAdminContentPage(id, body);
    if (!result.ok) {
      redirect(`/admin/content-pages/${id}/edit?error=${encodeURIComponent(result.message)}`);
    }
    redirect(
      `/admin/content-pages/${id}?success=${encodeURIComponent(
        issues.length > 0 ? "Content page saved as draft/inactive due to editorial warnings" : "Content page updated",
      )}`,
    );
  }

  const page = pageResult.data.page;

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Edit content page</h1>
        <Link href={`/admin/content-pages/${id}`} className="gh-link text-sm text-[var(--color-text-muted)]">
          Cancel
        </Link>
      </div>

      <p className="mt-3 text-sm text-[var(--color-status-warning-text)]">
        Legal/static content may need external approval. Keep public legal pages fallback-safe unless approved content is confirmed.
      </p>

      {sp.error ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          {sp.error}
        </p>
      ) : null}

      <form action={updateAction} className="mt-8 flex flex-col gap-8">
        <input aria-label="Content page key" className="gh-input" name="pageKey" defaultValue={page.pageKey} required />
        <input aria-label="Content page title" className="gh-input" name="title" defaultValue={page.title} required />
        <textarea aria-label="Content page body" className="gh-textarea" name="body" defaultValue={page.body} rows={12} required />
        <div className="grid gap-3 sm:grid-cols-2">
          <select aria-label="Content page status" className="gh-select" name="status" defaultValue={page.status}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </select>
          <select aria-label="Content page locale" className="gh-select" name="locale" defaultValue={page.locale}>
            {["EN", "PT", "ES", "CS", "RO", "DE"].map((locale) => (
              <option key={locale} value={locale}>{locale}</option>
            ))}
          </select>
        </div>
        <select aria-label="Content page country" className="gh-select" name="countryId" defaultValue={page.countryId ?? ""}>
          <option value="">Global (no country)</option>
          {countriesResult.data.countries.map((country) => (
            <option key={country.id} value={country.id}>{country.name}</option>
          ))}
        </select>
        <input aria-label="SEO title" className="gh-input" name="seoTitle" defaultValue={page.seoTitle ?? ""} />
        <textarea aria-label="SEO description" className="gh-textarea" name="seoDescription" defaultValue={page.seoDescription ?? ""} rows={2} />
        <input
          aria-label="Last reviewed date and time"
          className="gh-input"
          name="lastReviewedAt"
          type="datetime-local"
          defaultValue={page.lastReviewedAt ? page.lastReviewedAt.slice(0, 16) : ""}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={page.isActive} />
          Active
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button className="gh-btn gh-btn-primary" type="submit">Save</button>
          <Link href={`/admin/content-pages/${id}`} className="gh-link text-sm text-[var(--color-text-muted)]">Cancel</Link>
        </div>
      </form>
    </section>
  );
}
