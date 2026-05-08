import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchAdminCountries, fetchAdminHealthTestById, patchAdminHealthTest } from "@/lib/admin/admin-api";
import { parseHealthTestBodyFromForm } from "@/lib/admin/health-test-form-parse";
import { HealthTestFields } from "../../_components/health-test-fields";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

export default async function AdminEditHealthTestPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};
  const [testResult, countriesResult] = await Promise.all([
    fetchAdminHealthTestById(id),
    fetchAdminCountries(),
  ]);

  if (!countriesResult.ok) {
    return <section className="gh-card p-6 sm:p-8"><h1 className="gh-h2 text-[var(--color-text-primary)]">Edit health test</h1><p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">Could not load countries: {countriesResult.message}</p></section>;
  }
  if (!testResult.ok) {
    return <section className="gh-card p-6 sm:p-8"><h1 className="gh-h2 text-[var(--color-text-primary)]">Edit health test</h1><p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">Could not load health test: {testResult.message}</p></section>;
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
    if (!parsed.ok) redirect(`/admin/health-tests/${id}/edit?error=${encodeURIComponent(parsed.error)}`);
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
    if (!result.ok) redirect(`/admin/health-tests/${id}/edit?error=${encodeURIComponent(result.message)}`);
    redirect(`/admin/health-tests/${id}?success=${encodeURIComponent("Health test updated")}`);
  }

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Edit health test</h1>
        <Link href={`/admin/health-tests/${id}`} className="gh-link text-sm text-[var(--color-text-muted)]">Cancel</Link>
      </div>
      {messages.error ? <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">{messages.error}</p> : null}
      <form action={updateAction} className="mt-8 flex flex-col gap-8">
        <HealthTestFields countries={countries} initial={test} countryLocked />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="gh-btn gh-btn-primary">Save changes</button>
          <Link href={`/admin/health-tests/${id}`} className="gh-link text-sm text-[var(--color-text-muted)]">Cancel</Link>
        </div>
      </form>
    </section>
  );
}
