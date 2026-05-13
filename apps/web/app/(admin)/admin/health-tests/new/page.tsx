import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchAdminCountries, postAdminHealthTest } from "@/lib/admin/admin-api";
import { HealthTestFields } from "../_components/health-test-fields";
import { parseHealthTestBodyFromForm } from "@/lib/admin/health-test-form-parse";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ countryId?: string; error?: string }>;
};

export default async function AdminNewHealthTestPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const countryId = sp.countryId?.trim();
  const countriesResult = await fetchAdminCountries();

  if (!countriesResult.ok) {
    return <section className="gh-card p-6 sm:p-8"><h1 className="gh-h2 text-[var(--color-text-primary)]">New health test</h1><p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">Could not load countries: {countriesResult.message}</p></section>;
  }

  const countries = countriesResult.data.countries.map((country) => ({
    id: country.id,
    code: country.code,
    name: country.name,
  }));

  async function createAction(formData: FormData) {
    "use server";
    const parsed = parseHealthTestBodyFromForm(formData);
    if (!parsed.ok) {
      redirect(`/admin/health-tests/new?countryId=${encodeURIComponent(countryId ?? "")}&error=${encodeURIComponent(parsed.error)}`);
    }
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
    const result = await postAdminHealthTest(body);
    if (!result.ok) {
      redirect(`/admin/health-tests/new?countryId=${encodeURIComponent(raw.countryId)}&error=${encodeURIComponent(result.message)}`);
    }
    redirect(`/admin/health-tests/${result.data.healthTest.id}?success=${encodeURIComponent("Health test created")}`);
  }

  if (!countryId) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="gh-h2 text-[var(--color-text-primary)]">New health test</h1>
          <Link href="/admin/health-tests" className="gh-link text-sm text-[var(--color-text-muted)]">Cancel</Link>
        </div>
        <p className="gh-body mt-3 text-[var(--color-text-muted)]">Choose a country first so this product page is tied to the correct clinic.</p>
        <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-2">
            <span className="gh-field-label">Country</span>
            <select name="countryId" className="gh-select min-w-[240px]" required defaultValue="">
              <option value="">Select...</option>
              {countries.map((country) => (
                <option key={country.id} value={country.id}>{country.name} ({country.code})</option>
              ))}
            </select>
          </label>
          <button type="submit" className="gh-btn gh-btn-primary">Continue</button>
        </form>
      </section>
    );
  }

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">New health test</h1>
        <Link href="/admin/health-tests" className="gh-link text-sm text-[var(--color-text-muted)]">Cancel</Link>
      </div>
      {sp.error ? <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">{sp.error}</p> : null}
      <form action={createAction} className="mt-8 flex flex-col gap-8">
        <HealthTestFields countries={countries} pinnedCountryId={countryId} />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="gh-btn gh-btn-primary">Create health test</button>
          <Link href="/admin/health-tests" className="gh-link text-sm text-[var(--color-text-muted)]">Cancel</Link>
        </div>
      </form>
    </section>
  );
}
