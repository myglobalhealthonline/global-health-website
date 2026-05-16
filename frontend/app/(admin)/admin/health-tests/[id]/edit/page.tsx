import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  fetchAdminCountries,
  fetchAdminHealthTestById,
  patchAdminHealthTest,
} from "@/lib/admin/admin-api";
import { parseHealthTestBodyFromForm } from "@/lib/admin/health-test-form-parse";
import { HealthTestFields } from "../../_components/health-test-fields";
import { AdminCard, Btn, PageHeader } from "../../../_components/atoms";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

export default async function AdminEditHealthTestPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};
  const [testResult, countriesResult] = await Promise.all([
    fetchAdminHealthTestById(id),
    fetchAdminCountries(),
  ]);

  if (!countriesResult.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Services"
          title="Edit health test"
          actions={
            <Btn href="/admin/health-tests" variant="ghost" iconLeft={<ArrowLeft className="size-3.5" />}>
              Cancel
            </Btn>
          }
        />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load countries: {countriesResult.message}
          </p>
        </AdminCard>
      </>
    );
  }

  if (!testResult.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Services"
          title="Edit health test"
          actions={
            <Btn href="/admin/health-tests" variant="ghost" iconLeft={<ArrowLeft className="size-3.5" />}>
              Cancel
            </Btn>
          }
        />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load health test: {testResult.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const test = testResult.data.healthTest;
  const countries = countriesResult.data.countries.map((country) => ({
    id: country.id,
    code: country.code,
    name: country.name,
  }));

  async function updateAction(formData: FormData) {
    "use server";
    const parsed = parseHealthTestBodyFromForm(formData);
    if (!parsed.ok)
      redirect(`/admin/health-tests/${id}/edit?error=${encodeURIComponent(parsed.error)}`);
    const raw = parsed.data;
    const body = {
      countryId: raw.countryId,
      slug: raw.slug,
      title: raw.title,
      shortDescription: raw.shortDescription || null,
      priceCents: raw.priceCents,
      currencyCode: raw.currencyCode,
      productImagePath: raw.productImagePath,
      galleryImagePaths: raw.galleryImagePaths,
      sampleType: raw.sampleType || null,
      resultsTimeline: raw.resultsTimeline || null,
      heroButtonLabel: raw.heroButtonLabel || null,
      detailIntro: raw.detailIntro || null,
      whatThisTestCovers: raw.whatThisTestCovers,
      whyGetTested: raw.whyGetTested,
      extraSections: raw.extraSections,
      sortOrder: raw.sortOrder,
      isActive: raw.isActive,
      seoTitle: raw.seoTitle || null,
      seoDescription: raw.seoDescription || null,
      legacyPath: raw.legacyPath || null,
    };
    const result = await patchAdminHealthTest(id, body);
    if (!result.ok)
      redirect(`/admin/health-tests/${id}/edit?error=${encodeURIComponent(result.message)}`);
    redirect(
      `/admin/health-tests/${id}?success=${encodeURIComponent("Health test updated")}`,
    );
  }

  return (
    <>
      <Link
        href={`/admin/health-tests/${id}`}
        className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to {test.title}
      </Link>
      <PageHeader
        eyebrow="Services"
        title={`Edit ${test.title}`}
        description="Update title, pricing, sample/results metadata, and detail content."
        actions={
          <Btn href={`/admin/health-tests/${id}`} variant="ghost">
            Cancel
          </Btn>
        }
      />

      {messages.error ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {messages.error}
        </p>
      ) : null}

      <AdminCard>
        <form action={updateAction} className="flex flex-col gap-8">
          <HealthTestFields countries={countries} initial={test} countryLocked />
          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] pt-6">
            <button type="submit" className="gh-btn gh-btn-primary">
              Save changes
            </button>
            <Link
              href={`/admin/health-tests/${id}`}
              className="text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            >
              Cancel
            </Link>
          </div>
        </form>
      </AdminCard>
    </>
  );
}
