import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { ArrowLeft } from "lucide-react";
import { fetchAdminCountries, postAdminHealthTest } from "@/lib/admin/admin-api";
import { COUNTRY_CODE_TO_SLUG } from "@/lib/routing/country-slug";
import { SITE_CACHE_TAGS } from "@/lib/api/site-content-api";
import { HealthTestFields } from "../_components/health-test-fields";
import { parseHealthTestBodyFromForm } from "@/lib/admin/health-test-form-parse";
import { AdminCard, Btn, PageHeader } from "../../_components/atoms";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ countryId?: string; error?: string }>;
};

export default async function AdminNewHealthTestPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const countryId = sp.countryId?.trim();
  const countriesResult = await fetchAdminCountries();

  if (!countriesResult.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Services"
          title="New health test"
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

  const countries = countriesResult.data.countries.map((country) => ({
    id: country.id,
    code: country.code,
    name: country.name,
  }));

  async function createAction(formData: FormData) {
    "use server";
    const parsed = parseHealthTestBodyFromForm(formData);
    if (!parsed.ok) {
      redirect(
        `/admin/health-tests/new?countryId=${encodeURIComponent(countryId ?? "")}&error=${encodeURIComponent(parsed.error)}`,
      );
    }
    const raw = parsed.data;
    // heroButtonLabel / detailIntro / whatThisTestCovers / whyGetTested /
    // extraSections / legacyPath are still omitted — no public surface
    // renders them. PATCH is partial so this preserves existing values.
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
      sortOrder: raw.sortOrder,
      isActive: raw.isActive,
      stock: raw.stock,
      seoTitle: raw.seoTitle || null,
      seoDescription: raw.seoDescription || null,
    };
    const result = await postAdminHealthTest(body);
    if (!result.ok) {
      redirect(
        `/admin/health-tests/new?countryId=${encodeURIComponent(raw.countryId)}&error=${encodeURIComponent(result.message)}`,
      );
    }
    // Invalidate the public listing cache for this country so the new
    // test surfaces immediately on /{slug}/{lang}/tests. The fetcher
    // tags its result with `country:<code>:health-tests` — busting that
    // tag is precise + cheap. Also revalidate the admin listing path.
    const created = result.data.healthTest;
    revalidateTag(SITE_CACHE_TAGS.countryHealthTests(created.country.code), "max");
    const slug = COUNTRY_CODE_TO_SLUG[created.country.code as keyof typeof COUNTRY_CODE_TO_SLUG];
    if (slug) revalidatePath(`/${slug}/[lang]/tests`, "page");
    revalidatePath("/admin/health-tests");
    redirect(
      `/admin/health-tests/${created.id}?success=${encodeURIComponent("Health test created")}`,
    );
  }

  if (!countryId) {
    return (
      <>
        <PageHeader
          eyebrow="Services"
          title="New health test"
          description="Choose a country so this product page is tied to the correct clinic."
          actions={
            <Btn href="/admin/health-tests" variant="ghost" iconLeft={<ArrowLeft className="size-3.5" />}>
              Cancel
            </Btn>
          }
        />
        <AdminCard>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">Country</span>
              <select
                name="countryId"
                className="gh-select min-w-[240px]"
                required
                defaultValue=""
              >
                <option value="">Select…</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name} ({country.code.toUpperCase()})
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="gh-btn gh-btn-primary">
              Continue
            </button>
          </form>
        </AdminCard>
      </>
    );
  }

  return (
    <>
      <Link
        href="/admin/health-tests"
        className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to health tests
      </Link>
      <PageHeader
        eyebrow="Services"
        title="New health test"
        description="Product-style page — price, sample type, result timing, and image-led layout."
        actions={
          <Btn href="/admin/health-tests" variant="ghost">
            Cancel
          </Btn>
        }
      />

      {sp.error ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {sp.error}
        </p>
      ) : null}

      <AdminCard>
        <form action={createAction} className="flex flex-col gap-8">
          <HealthTestFields countries={countries} pinnedCountryId={countryId} />
          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] pt-6">
            <button type="submit" className="gh-btn gh-btn-primary">
              Create health test
            </button>
            <Link
              href="/admin/health-tests"
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
