import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { ArrowLeft, Trash2 } from "lucide-react";
import {
  fetchAdminCountries,
  fetchAdminPageById,
  patchAdminPage,
  purgeAdminPage,
} from "@/lib/admin/admin-api";
import { SITE_CACHE_TAGS } from "@/lib/api/site-content-api";
import { AdminCard, Btn, PageHeader } from "../../../_components/atoms";
import { PageFields } from "../../_components/page-fields";
import { parsePageBody } from "../../_components/page-form-parse";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string; success?: string }>;
};

export default async function AdminEditPagePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};

  const [pageResult, countriesResult] = await Promise.all([
    fetchAdminPageById(id),
    fetchAdminCountries(),
  ]);

  if (!pageResult.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Global"
          title="Edit page"
          actions={
            <Btn href="/admin/pages" variant="ghost" size="md" iconLeft={<ArrowLeft className="size-3.5" />}>
              Back
            </Btn>
          }
        />
        <AdminCard>
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            Could not load page: {pageResult.message}
          </p>
        </AdminCard>
      </>
    );
  }

  if (!countriesResult.ok) {
    return (
      <>
        <PageHeader eyebrow="Global" title="Edit page" />
        <AdminCard>
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            Could not load countries: {countriesResult.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const page = pageResult.data.page;
  const countries = countriesResult.data.countries;

  async function updatePageAction(formData: FormData) {
    "use server";
    const body = parsePageBody(formData);
    const result = await patchAdminPage(id, body);
    if (!result.ok) {
      redirect(`/admin/pages/${id}/edit?error=${encodeURIComponent(result.message)}`);
    }
    // Bust the public Data Cache for this country/page/locale so the public
    // site sees the new content on the next render instead of waiting up to
    // 60 seconds for the timed revalidate.
    const saved = result.data.page;
    if (saved.country?.code) {
      revalidateTag(
        SITE_CACHE_TAGS.countryPage(saved.country.code, saved.pageKey, saved.locale),
        "max",
      );
    }
    redirect(`/admin/pages/${id}/edit?success=${encodeURIComponent("Page saved")}`);
  }

  async function deletePageAction() {
    "use server";
    // Capture the page details before delete so we can bust the right tag.
    const before = await fetchAdminPageById(id);
    const result = await purgeAdminPage(id);
    if (!result.ok) {
      redirect(`/admin/pages/${id}/edit?error=${encodeURIComponent(result.message)}`);
    }
    if (before.ok && before.data.page.country?.code) {
      const p = before.data.page;
      revalidateTag(
        SITE_CACHE_TAGS.countryPage(p.country!.code, p.pageKey, p.locale),
        "max",
      );
    }
    redirect(`/admin/pages?success=${encodeURIComponent("Page deleted")}`);
  }

  return (
    <>
      <Link
        href="/admin/pages"
        className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to pages
      </Link>
      <PageHeader
        eyebrow={page.country?.name ?? "Global"}
        title={page.title || "(untitled page)"}
        description={`${page.pageKey} · ${page.locale} · ${page.status}`}
        actions={
          <form action={deletePageAction}>
            <Btn type="submit" variant="danger" size="md" iconLeft={<Trash2 className="size-3.5" />}>
              Delete
            </Btn>
          </form>
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

      <form action={updatePageAction} className="mt-6 flex flex-col gap-6">
        <PageFields countries={countries} page={page} />
        <div className="flex items-center justify-end gap-2">
          <Btn href="/admin/pages" variant="ghost" size="md">
            Cancel
          </Btn>
          <Btn type="submit" variant="primary" size="md">
            Save page
          </Btn>
        </div>
      </form>
    </>
  );
}
