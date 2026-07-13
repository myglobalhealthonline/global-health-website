import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { ArrowLeft } from "lucide-react";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import {
  ADMIN_PAGE_CONTENT_KEY_LABELS,
  ADMIN_PAGE_CONTENT_KEYS,
  fetchAdminCountries,
  fetchAdminPageContent,
  putAdminPageContent,
  type AdminPageContentKey,
} from "@/lib/admin/admin-api";
import { SITE_CACHE_TAGS } from "@/lib/api/site-content-api";
import { AdminCard, PageHeader } from "../../../_components/atoms";
import { PageContentEditor } from "../../_components/page-content-editor";
import { parsePageContentForm } from "../../_components/page-content-form-parse";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ countryId: string; pageKey: string }>;
  searchParams?: Promise<{ error?: string; success?: string }>;
};

function isPageKey(value: string): value is AdminPageContentKey {
  return (ADMIN_PAGE_CONTENT_KEYS as string[]).includes(value);
}

export default async function AdminPageContentEditorPage({ params, searchParams }: PageProps) {
  const { countryId, pageKey } = await params;
  const messages = searchParams ? await searchParams : {};
  if (!isPageKey(pageKey)) notFound();

  const [countriesResult, recordResult] = await Promise.all([
    fetchAdminCountries(),
    fetchAdminPageContent(countryId, pageKey),
  ]);

  if (!countriesResult.ok) {
    return (
      <AdminCard>
        <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
          Could not load countries: {countriesResult.message}
        </p>
      </AdminCard>
    );
  }
  const country = countriesResult.data.countries.find((c) => c.id === countryId);
  if (!country) notFound();

  if (!recordResult.ok) {
    return (
      <AdminCard>
        <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
          Could not load page content: {recordResult.message}
        </p>
      </AdminCard>
    );
  }
  const record = recordResult.data.record;

  const defaultLocale = country.defaultLocale.toUpperCase();
  const localeSet = new Set<string>(country.countryLocales.map((cl) => cl.locale.toUpperCase()));
  localeSet.add(defaultLocale);
  const locales = Array.from(localeSet)
    .sort((a, b) => (a === defaultLocale ? -1 : b === defaultLocale ? 1 : a.localeCompare(b)))
    .map((code) => ({ code, isDefault: code === defaultLocale }));

  async function saveAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const body = parsePageContentForm(formData);
    const result = await putAdminPageContent(countryId, pageKey as AdminPageContentKey, body);
    if (!result.ok) {
      redirect(
        `/admin/page-content/${countryId}/${pageKey}?error=${encodeURIComponent(result.message)}`,
      );
    }
    revalidatePath(`/admin/page-content/${countryId}/${pageKey}`);
    revalidatePath("/admin/page-content");
    for (const t of result.data.record.translations) {
      revalidateTag(
        SITE_CACHE_TAGS.countryPageContent(country!.code, pageKey, t.locale),
        "max",
      );
    }
    redirect(
      `/admin/page-content/${countryId}/${pageKey}?success=${encodeURIComponent("Page content saved")}`,
    );
  }

  return (
    <>
      <Link
        href="/admin/page-content"
        className="mb-2 inline-flex items-center gap-1.5 text-portal-compact font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to page content
      </Link>
      <PageHeader
        eyebrow={country.name}
        title={ADMIN_PAGE_CONTENT_KEY_LABELS[pageKey]}
        description={record ? `${record.status} · ${record.isActive ? "Active" : "Disabled"}` : "Not configured yet"}
      />

      {messages?.error ? (
        <AdminCard>
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">{messages.error}</p>
        </AdminCard>
      ) : null}
      {messages?.success ? (
        <AdminCard>
          <p className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {messages.success}
          </p>
        </AdminCard>
      ) : null}

      <PageContentEditor
        countryName={country.name}
        pageLabel={ADMIN_PAGE_CONTENT_KEY_LABELS[pageKey]}
        locales={locales}
        record={record}
        saveAction={saveAction}
      />
    </>
  );
}
