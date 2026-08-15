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
import { BlogTranslationTabs } from "../../_components/blog-translation-tabs";
import { parseBlogBody, validateBlogBody } from "../../_components/blog-form-parse";
import { FormSection } from "@/components/FormSection";
import { SetCrumbTitle } from "@/components/crumb-title";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string; success?: string }>;
};

/** Each locale is published under its own slug, so busting only the post's
 *  own path leaves every translated URL serving stale HTML. Pass them all. */
function bustBlogCaches(...slugs: string[]) {
  revalidateTag(PUBLIC_BLOG_TAG, "max");
  // No `revalidatePath("/blog")`: the global hub was retired 2026-08-15 and now
  // 301s. The country hubs are covered by PUBLIC_BLOG_TAG above; the bare
  // `/blog/{slug}` post pages still exist and are busted below.
  for (const slug of new Set(slugs.filter(Boolean))) revalidatePath(`/blog/${slug}`);
}

export default async function AdminEditBlogPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};

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

  /* Tabs cover every locale the site serves, the post's own included: its tab
   * writes the post itself, the others write BlogTranslation rows. */
  const allLocales = [...ADMIN_BLOG_LOCALES];
  const translatableLocales = ADMIN_BLOG_LOCALES.filter((locale) => locale !== post.locale);
  const existingLocales = new Set(translations.map((t) => t.locale.toUpperCase()));
  const readyCount = translations.filter((t) => t.content?.trim()).length;

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

    // The same submit carries every other language, so the article and its
    // translations are written together rather than in two separate saves.
    const saved: string[] = [];
    const removed: string[] = [];
    const touchedSlugs: string[] = [post.slug, updated.data.post.slug, ...translations.map((t) => t.slug)];

    for (const code of translatableLocales) {
      const title = (formData.get(`tr_${code}_title`) as string)?.trim() ?? "";
      const slug = (formData.get(`tr_${code}_slug`) as string)?.trim() ?? "";

      if (!title && !slug) {
        if (!existingLocales.has(code)) continue;
        const dropped = await deleteAdminBlogTranslation(id, code);
        if (!dropped.ok) {
          redirect(`/admin/blog/${id}/edit?error=${encodeURIComponent(`${code}: ${dropped.message}`)}`);
        }
        removed.push(code);
        continue;
      }
      if (!title || !slug) {
        redirect(
          `/admin/blog/${id}/edit?error=${encodeURIComponent(`${code} needs both a title and a slug`)}`,
        );
      }

      const result = await putAdminBlogTranslation(id, code, {
        title,
        slug,
        excerpt: (formData.get(`tr_${code}_excerpt`) as string)?.trim() || null,
        content: (formData.get(`tr_${code}_content`) as string)?.trim() || null,
        seoTitle: (formData.get(`tr_${code}_seoTitle`) as string)?.trim() || null,
        seoDesc: (formData.get(`tr_${code}_seoDesc`) as string)?.trim() || null,
        coverImageAlt: (formData.get(`tr_${code}_coverImageAlt`) as string)?.trim() || null,
      });
      if (!result.ok) {
        redirect(`/admin/blog/${id}/edit?error=${encodeURIComponent(`${code}: ${result.message}`)}`);
      }
      saved.push(code);
      touchedSlugs.push(slug);
    }

    bustBlogCaches(...touchedSlugs);
    revalidatePath(`/admin/blog/${id}/edit`);
    const extra = [
      saved.length > 0 ? `saved ${saved.join(", ")}` : null,
      removed.length > 0 ? `removed ${removed.join(", ")}` : null,
    ].filter(Boolean);
    redirect(
      `/admin/blog/${id}/edit?success=${encodeURIComponent(
        extra.length > 0 ? `Saved · ${extra.join(" · ")}` : "Saved",
      )}`,
    );
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
        {/* Every language, original included, in one tab strip — the same
            shape as the doctor bio editor. The original tab posts the post's
            own fields; the others post tr_<LOCALE>_*. One submit saves all. */}
        <FormSection
          title={
            <span className="inline-flex items-center gap-2">
              <Languages className="size-4 text-[var(--color-text-muted)]" aria-hidden />
              Languages
            </span>
          }
          description="Title, slug, excerpt, body and SEO for each language this article is published in."
          right={
            translations.length > 0 ? (
              <Pill tone={readyCount === translations.length ? "published" : "draft"}>
                {readyCount}/{translations.length} translated
              </Pill>
            ) : null
          }
        >
          <div className="gh-form-section__span-2">
            <BlogTranslationTabs
              locales={allLocales}
              originalLocale={post.locale}
              original={{
                title: post.title,
                slug: post.slug,
                excerpt: post.excerpt,
                content: post.body,
                seoTitle: post.seoTitle,
                seoDesc: post.seoDescription,
                // The original's cover alt is the asset's own altText, edited
                // with the image up in the cover field — not repeated here.
                coverImageAlt: post.coverAsset?.altText ?? null,
              }}
              initialTranslations={translations.map((t) => ({
                locale: t.locale,
                title: t.title,
                slug: t.slug,
                excerpt: t.excerpt,
                content: t.content,
                seoTitle: t.seoTitle,
                seoDesc: t.seoDesc,
                coverImageAlt: t.coverImageAlt,
              }))}
            />
          </div>
        </FormSection>

        <BlogFields post={post} doctors={doctors} services={services} languageFields={false} />
        <div className="gh-admin-blog-actions gh-admin-blog-actions--end">
          <Btn href="/admin/blog" variant="ghost" size="md">
            Cancel
          </Btn>
          <Btn type="submit" variant="primary" size="md">
            Save article
          </Btn>
        </div>
      </form>

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
