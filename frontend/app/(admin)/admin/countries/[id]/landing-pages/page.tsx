import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import {
  fetchAdminCountryById,
  fetchAdminCountryLandingPages,
  putAdminCountryLandingPage,
  deleteAdminCountryLandingPage,
} from "@/lib/admin/admin-api";
import {
  AdminCard,
  AdminTable,
  Btn,
  PageHeader,
  Pill,
  Td,
  Th,
  Thead,
  Tr,
} from "../../../_components/atoms";
import { FlagBadge } from "../../../_components/flag-badge";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string; edit?: string }>;
};

export default async function CountryLandingPagesAdmin({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = searchParams ? await searchParams : {};

  const [countryRes, pagesRes] = await Promise.all([
    fetchAdminCountryById(id),
    fetchAdminCountryLandingPages(id),
  ]);

  if (!countryRes.ok) {
    return (
      <>
        <PageHeader eyebrow="Country" title="SEO landing pages" />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            {countryRes.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const c = countryRes.data.country;
  const defaultLocale = (c.defaultLocale ?? "EN").toUpperCase();
  const pages = pagesRes.ok ? pagesRes.data.pages : [];
  const editSlug = sp.edit ?? null;
  const editPage = editSlug ? pages.find((p) => p.slug === editSlug) ?? null : null;
  const editTr =
    editPage?.translations.find((t) => t.locale.toUpperCase() === defaultLocale) ??
    editPage?.translations[0] ??
    null;

  async function saveLandingAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const slug = String(formData.get("slug") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    if (!slug || !title) {
      redirect(`/admin/countries/${id}/landing-pages?error=${encodeURIComponent("Slug and title are required")}`);
    }
    const body = {
      slug,
      isPublished: formData.get("isPublished") === "on",
      sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
      translations: [
        {
          locale: defaultLocale,
          title,
          seoTitle: String(formData.get("seoTitle") ?? "").trim() || null,
          seoDescription: String(formData.get("seoDescription") ?? "").trim() || null,
          bodyHtml: String(formData.get("bodyHtml") ?? "").trim() || null,
        },
      ],
    };
    const result = await putAdminCountryLandingPage(id, body);
    if (!result.ok) {
      redirect(`/admin/countries/${id}/landing-pages?error=${encodeURIComponent(result.message)}`);
    }
    revalidateTag(`landing:${c.code}`, "max");
    revalidateTag(`landing:${c.code}:${slug}`, "max");
    redirect(`/admin/countries/${id}/landing-pages?success=${encodeURIComponent("Landing page saved")}`);
  }

  async function deleteLandingAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const pageId = String(formData.get("pageId") ?? "");
    if (pageId) {
      const result = await deleteAdminCountryLandingPage(id, pageId);
      if (!result.ok) {
        redirect(`/admin/countries/${id}/landing-pages?error=${encodeURIComponent(result.message)}`);
      }
    }
    revalidateTag(`landing:${c.code}`, "max");
    redirect(`/admin/countries/${id}/landing-pages?success=${encodeURIComponent("Landing page deleted")}`);
  }

  return (
    <>
      <Link
        href={`/admin/countries/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to {c.name}
      </Link>

      <PageHeader
        className="gh-admin-area-hero gh-admin-area-countries"
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <FlagBadge code={c.code} size={14} />
            {c.name}
          </span>
        }
        title="SEO landing pages"
        description="Condition / audience pages (hypertension, diabetes, expat-healthcare…). Indexed in the sitemap; not shown in the nav or service listing."
        actions={
          <Btn href={`/admin/countries/${id}/landing-pages?edit=`} variant="primary" size="md">
            <Plus className="size-3.5" /> New page
          </Btn>
        }
      />

      {sp.error ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {sp.error}
        </p>
      ) : null}
      {sp.success ? (
        <p className="gh-status-success mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {sp.success}
        </p>
      ) : null}

      <AdminCard padding={0} className="gh-admin-area-hero gh-admin-area-countries gh-admin-country-landing-list overflow-hidden">
        <div className="gh-admin-area-hero gh-admin-area-countries gh-admin-country-table-wrap overflow-x-auto">
        <AdminTable>
          <Thead>
            <Th>Slug</Th>
            <Th>Title</Th>
            <Th>Status</Th>
            <Th align="right">Actions</Th>
          </Thead>
          <tbody>
            {pages.length === 0 ? (
              <Tr>
                <Td>
                  <span className="text-[12px] text-[var(--color-text-muted)]">No landing pages yet.</span>
                </Td>
                <Td></Td>
                <Td></Td>
                <Td></Td>
              </Tr>
            ) : (
              pages.map((p) => {
                const tr =
                  p.translations.find((t) => t.locale.toUpperCase() === defaultLocale) ??
                  p.translations[0] ??
                  null;
                return (
                  <Tr key={p.id}>
                    <Td>
                      <span className="font-mono text-[12px]">/health/{p.slug}</span>
                    </Td>
                    <Td>{tr?.title ?? "—"}</Td>
                    <Td>
                      <Pill tone={p.isPublished ? "published" : "draft"}>
                        {p.isPublished ? "Published" : "Draft"}
                      </Pill>
                    </Td>
                    <Td align="right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/countries/${id}/landing-pages?edit=${p.slug}`}
                          className="gh-btn gh-btn-soft text-[12px]"
                        >
                          Edit
                        </Link>
                        <form action={deleteLandingAction} className="inline">
                          <input type="hidden" name="pageId" value={p.id} />
                          <button
                            type="submit"
                            className="gh-btn gh-btn-danger flex items-center gap-1 text-[12px]"
                            aria-label={`Delete ${p.slug}`}
                          >
                            <Trash2 className="size-3" aria-hidden />
                          </button>
                        </form>
                      </div>
                    </Td>
                  </Tr>
                );
              })
            )}
          </tbody>
        </AdminTable>
        </div>
      </AdminCard>

      {editSlug !== null ? (
        <AdminCard className="gh-admin-area-hero gh-admin-area-countries gh-admin-country-editor mt-4">
          <h3
            className="m-0 text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
          >
            {editPage ? "Edit" : "New"} landing page ({defaultLocale})
          </h3>
          <form action={saveLandingAction} className="gh-admin-area-hero gh-admin-area-countries gh-admin-country-editor-form mt-4 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Slug</span>
                <input
                  name="slug"
                  defaultValue={editPage?.slug ?? editSlug ?? ""}
                  placeholder="hypertension"
                  className="gh-input font-mono"
                  required
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Sort order</span>
                <input
                  name="sortOrder"
                  type="number"
                  min={0}
                  max={1000}
                  defaultValue={editPage?.sortOrder ?? 0}
                  className="gh-input"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Title</span>
              <input name="title" defaultValue={editTr?.title ?? ""} className="gh-input" required />
            </label>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">SEO title</span>
              <input name="seoTitle" defaultValue={editTr?.seoTitle ?? ""} maxLength={200} className="gh-input" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">SEO description</span>
              <textarea
                name="seoDescription"
                defaultValue={editTr?.seoDescription ?? ""}
                maxLength={400}
                rows={2}
                className="gh-input resize-y"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Body (HTML)</span>
              <textarea
                name="bodyHtml"
                defaultValue={editTr?.bodyHtml ?? ""}
                rows={16}
                className="gh-input resize-y font-mono text-[12px]"
                placeholder="<p>…</p>"
              />
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="isPublished" defaultChecked={editPage?.isPublished ?? false} className="size-4" />
              <span className="text-[13px] text-[var(--color-text-body)]">Published</span>
            </label>
            <div className="gh-admin-area-hero gh-admin-area-countries gh-admin-country-actions flex items-center gap-3">
              <button type="submit" className="gh-btn gh-btn-primary">
                Save landing page
              </button>
              <Link href={`/admin/countries/${id}/landing-pages`} className="gh-btn gh-btn-soft">
                Cancel
              </Link>
            </div>
          </form>
        </AdminCard>
      ) : null}
    </>
  );
}
