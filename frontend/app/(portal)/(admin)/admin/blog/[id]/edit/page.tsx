import Link from "next/link";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { redirect } from "next/navigation";
import { revalidateTag, revalidatePath } from "next/cache";
import { ArrowLeft, ExternalLink, Languages, Trash2 } from "lucide-react";
import {
  fetchAdminBlogPostById,
  fetchAdminCountries,
  fetchAdminDoctors,
  fetchAllAdminServices,
  patchAdminBlogPost,
  purgeAdminBlogPost,
  putAdminBlogTranslation,
  deleteAdminBlogTranslation,
  putAdminBlogPostCountries,
  ADMIN_BLOG_LOCALES,
} from "@/lib/admin/admin-api";
import { PUBLIC_BLOG_TAG } from "@/lib/content/get-public-blog";
import { AdminCard, Btn, PageHeader, Pill } from "../../../_components/atoms";
import { ConfirmDeleteButton } from "../../../_components/confirm-delete-button";
import { BlogFields } from "../../_components/blog-fields";
import { parseBlogBody, validateBlogBody } from "../../_components/blog-form-parse";
import { FormSection } from "@/components/FormSection";
import { SetCrumbTitle } from "@/components/crumb-title";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string; success?: string; editLocale?: string }>;
};

function bustBlogCaches(slug: string) {
  revalidateTag(PUBLIC_BLOG_TAG, "max");
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
}

export default async function AdminEditBlogPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};
  const editLocale = messages.editLocale?.trim() ?? null;

  const [result, countriesResult, doctorsResult, allServices] = await Promise.all([
    fetchAdminBlogPostById(id),
    fetchAdminCountries(),
    fetchAdminDoctors({ pageSize: "200" }),
    fetchAllAdminServices(),
  ]);
  const doctors = doctorsResult.ok
    ? doctorsResult.data.items.map((d) => ({ id: d.id, fullName: d.fullName }))
    : [];
  const services = allServices.map((s) => ({ id: s.id, name: `${s.name} — ${s.country.name}` }));
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
  const allCountries = countriesResult.ok ? countriesResult.data.countries : [];
  const assignedCountryIds = new Set(post.countries.map((c) => c.countryId));
  const translations = post.translations;
  const editTranslation = editLocale ? translations.find((t) => t.locale === editLocale) ?? null : null;

  /* One row per locale the site actually serves, so the editor can see at a
   * glance which languages exist, which are missing, and which have a title
   * but no body (the state the public renderer refuses to serve). The post's
   * own locale is shown as "Original" — it is edited by the form above, not
   * as a translation of itself. */
  const localeRows = ADMIN_BLOG_LOCALES.map((locale) => {
    const isOriginal = locale === post.locale;
    const translation = translations.find((t) => t.locale.toUpperCase() === locale) ?? null;
    return {
      locale,
      isOriginal,
      translation,
      title: isOriginal ? post.title : translation?.title ?? "",
      slug: isOriginal ? post.slug : translation?.slug ?? "",
      hasBody: isOriginal ? Boolean(post.body?.trim()) : Boolean(translation?.content?.trim()),
    };
  });

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

  async function saveTranslationAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const locale = (formData.get("locale") as string)?.trim();
    const title = (formData.get("tr_title") as string)?.trim();
    const slug = (formData.get("tr_slug") as string)?.trim();
    const excerpt = (formData.get("tr_excerpt") as string)?.trim() || null;
    const content = (formData.get("tr_content") as string)?.trim() || null;
    const seoTitle = (formData.get("tr_seoTitle") as string)?.trim() || null;
    const seoDesc = (formData.get("tr_seoDesc") as string)?.trim() || null;
    if (!locale || !title || !slug) {
      redirect(`/admin/blog/${id}/edit?error=Locale%2C+title+and+slug+required`);
    }
    const result = await putAdminBlogTranslation(id, locale, { title, slug, excerpt, content, seoTitle, seoDesc });
    if (!result.ok) {
      redirect(`/admin/blog/${id}/edit?error=${encodeURIComponent(result.message)}`);
    }
    revalidatePath(`/admin/blog/${id}/edit`);
    redirect(`/admin/blog/${id}/edit?success=${encodeURIComponent(`Translation (${locale}) saved`)}`);
  }

  async function deleteTranslationAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const locale = (formData.get("locale") as string)?.trim();
    if (!locale) redirect(`/admin/blog/${id}/edit?error=Missing+locale`);
    const result = await deleteAdminBlogTranslation(id, locale);
    if (!result.ok) {
      redirect(`/admin/blog/${id}/edit?error=${encodeURIComponent(result.message)}`);
    }
    revalidatePath(`/admin/blog/${id}/edit`);
    redirect(`/admin/blog/${id}/edit?success=${encodeURIComponent(`Translation (${locale}) deleted`)}`);
  }

  async function saveCountriesAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const raw = formData.getAll("countryIds") as string[];
    const countryIds = raw.filter(Boolean);
    const result = await putAdminBlogPostCountries(id, countryIds);
    if (!result.ok) {
      redirect(`/admin/blog/${id}/edit?error=${encodeURIComponent(result.message)}`);
    }
    revalidatePath(`/admin/blog/${id}/edit`);
    redirect(`/admin/blog/${id}/edit?success=Countries+updated`);
  }

  return (
    <>
      <SetCrumbTitle label={post.title || "(untitled post)"} />
      <Link
        href="/admin/blog"
        className="mb-2 inline-flex items-center gap-1.5 text-portal-compact font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to blog
      </Link>
      <PageHeader
        eyebrow="Global"
        title={post.title || "(untitled post)"}
        description={`${post.status} · ${post.locale} · /blog/${post.slug}`}
        actions={
          <div className="gh-admin-blog-actions">
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

      <form action={updateBlogAction} className="gh-admin-blog-form mt-6">
        <BlogFields post={post} doctors={doctors} services={services} />
        <div className="gh-admin-blog-actions gh-admin-blog-actions--end">
          <Btn href="/admin/blog" variant="ghost" size="md">
            Cancel
          </Btn>
          <Btn type="submit" variant="primary" size="md">
            Save post
          </Btn>
        </div>
      </form>

      {/* Translations section */}
      <FormSection
        className="mt-6"
        title={
          <span className="inline-flex items-center gap-2">
            <Languages className="size-4 text-[var(--color-text-muted)]" aria-hidden />
            Translations
          </span>
        }
        description="Add locale-specific title, slug, and content for this post."
        right={translations.length > 0 ? <Pill tone="brand">{translations.length}</Pill> : null}
      >
        {/* Every supported locale is a row, translated or not. Previously only
            existing translations were listed and a new one meant typing a
            locale code into a free-text box — so the six locales the site
            actually serves were invisible until you guessed them. */}
        <div className="gh-form-section__span-2 mt-3 overflow-x-auto">
          <table className="gh-admin-table gh-admin-blog-locale-table">
            <thead>
              <tr>
                <th scope="col">Language</th>
                <th scope="col">Title</th>
                <th scope="col">Slug</th>
                <th scope="col">Body</th>
                <th scope="col" className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {localeRows.map((row) => (
                <tr key={row.locale} data-active={row.locale === editLocale ? "true" : undefined}>
                  <th scope="row">
                    <span className="font-mono font-bold">{row.locale}</span>
                    {row.isOriginal ? <Pill tone="brand">Original</Pill> : null}
                  </th>
                  <td>
                    {row.title ? (
                      <span className="line-clamp-1">{row.title}</span>
                    ) : (
                      <span className="text-[var(--color-text-muted)]">Not translated</span>
                    )}
                  </td>
                  <td className="font-mono text-portal-meta text-[var(--color-text-muted)]">
                    {row.slug || "—"}
                  </td>
                  <td>
                    {row.hasBody ? (
                      <Pill tone="published">Ready</Pill>
                    ) : row.translation ? (
                      <Pill tone="draft">No body</Pill>
                    ) : (
                      <span className="text-[var(--color-text-muted)]">—</span>
                    )}
                  </td>
                  <td className="text-right">
                    <div className="gh-admin-blog-actions gh-admin-blog-actions--end">
                      {row.isOriginal ? (
                        <span className="text-portal-meta text-[var(--color-text-muted)]">
                          Edit above
                        </span>
                      ) : (
                        <>
                          <Link
                            href={`/admin/blog/${id}/edit?editLocale=${row.locale}#translation-editor`}
                            className="gh-btn gh-btn-soft text-portal-meta"
                          >
                            {row.translation ? "Edit" : "Add"}
                          </Link>
                          {row.translation ? (
                            <form action={deleteTranslationAction} className="inline">
                              <input type="hidden" name="locale" value={row.locale} />
                              <button
                                type="submit"
                                className="gh-btn gh-btn-danger text-portal-meta"
                                aria-label={`Delete ${row.locale} translation`}
                              >
                                <Trash2 className="size-3" aria-hidden />
                              </button>
                            </form>
                          ) : null}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editLocale ? (
          <form
            id="translation-editor"
            action={saveTranslationAction}
            className="gh-admin-blog-translation-form gh-form-section__span-2 mt-4"
          >
            <input type="hidden" name="locale" value={editLocale} />
            <h4 className="m-0 text-portal-body font-bold text-[var(--color-text-primary)]">
              {editTranslation ? "Edit" : "Add"} translation: {editLocale.toUpperCase()}
            </h4>
            <div className="gh-admin-blog-field-grid gh-admin-blog-field-grid--two">
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Title *</span>
                <input type="text" name="tr_title" defaultValue={editTranslation?.title ?? ""} className="gh-input" required />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Slug *</span>
                <input type="text" name="tr_slug" defaultValue={editTranslation?.slug ?? ""} className="gh-input" required />
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Excerpt</span>
              <textarea name="tr_excerpt" rows={2} defaultValue={editTranslation?.excerpt ?? ""} className="gh-input" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Content (HTML)</span>
              <textarea name="tr_content" rows={12} defaultValue={editTranslation?.content ?? ""} className="gh-input resize-y font-mono text-portal-meta" />
            </label>
            <div className="gh-admin-blog-field-grid gh-admin-blog-field-grid--two">
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">SEO title</span>
                <input type="text" name="tr_seoTitle" defaultValue={editTranslation?.seoTitle ?? ""} className="gh-input" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">SEO description</span>
                <input type="text" name="tr_seoDesc" defaultValue={editTranslation?.seoDesc ?? ""} className="gh-input" />
              </label>
            </div>
            <div className="gh-admin-blog-actions gh-admin-blog-actions--end">
              <Link href={`/admin/blog/${id}/edit`} className="gh-btn gh-btn-soft">Cancel</Link>
              <button type="submit" className="gh-btn gh-btn-primary">Save translation</button>
            </div>
          </form>
        ) : (
          <p className="gh-form-section__span-2 mt-4 text-portal-meta text-[var(--color-text-muted)]">
            Pick a language above to add or edit its translation.
          </p>
        )}
      </FormSection>

      {/* Countries multi-select */}
      {allCountries.length > 0 ? (
        <FormSection
          className="mt-4"
          title="Country visibility"
          description="Which countries this post is visible in. Leaving all boxes unchecked makes the post global — it shows in every country."
          right={
            <Pill tone={assignedCountryIds.size === 0 ? "brand" : "published"}>
              {assignedCountryIds.size === 0
                ? "Global — all countries"
                : `${assignedCountryIds.size} ${assignedCountryIds.size === 1 ? "country" : "countries"}`}
            </Pill>
          }
        >
          <form action={saveCountriesAction} className="gh-form-section__span-2 mt-4">
            <div className="gh-admin-blog-country-grid">
              {allCountries.map((c) => (
                <label key={c.id} className="gh-admin-blog-country-option">
                  <input
                    type="checkbox"
                    name="countryIds"
                    value={c.id}
                    defaultChecked={assignedCountryIds.has(c.id)}
                    className="size-4"
                  />
                  {c.name}
                </label>
              ))}
            </div>
            <div className="mt-4">
              <button type="submit" className="gh-btn gh-btn-primary">
                Save country visibility
              </button>
            </div>
          </form>
        </FormSection>
      ) : null}
    </>
  );
}
