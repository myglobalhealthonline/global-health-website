import Link from "next/link";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { ArrowLeft } from "lucide-react";
import {
  fetchAdminCountries,
  fetchAdminHealthTestById,
  patchAdminHealthTest,
} from "@/lib/admin/admin-api";
import { COUNTRY_CODE_TO_SLUG } from "@/lib/routing/country-slug";
import { SITE_CACHE_TAGS } from "@/lib/api/site-content-api";
import { parseHealthTestBodyFromForm } from "@/lib/admin/health-test-form-parse";
import { resolveCountryLocaleTabs } from "@/lib/admin/service-form-parse";
import { HealthTestFields } from "../../_components/health-test-fields";
import { AdminCard, Btn, PageHeader } from "../../../_components/atoms";
import { displayNameFrom } from "@/lib/admin/display-name";

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
  const testCountry = countriesResult.data.countries.find((c) => c.id === test.countryId);
  const { locales, defaultLocale } = resolveCountryLocaleTabs(testCountry);

  async function updateAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    const parsed = parseHealthTestBodyFromForm(formData, defaultLocale);
    if (!parsed.ok)
      redirect(`/admin/health-tests/${id}/edit?error=${encodeURIComponent(parsed.error)}`);
    const raw = parsed.data;
    // heroButtonLabel / detailIntro / whatThisTestCovers / whyGetTested /
    // extraSections / legacyPath are still omitted — no public surface
    // renders them. PATCH is partial so existing DB values stay put.
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
      shippingCents: raw.shippingCents,
      seoTitle: raw.seoTitle || null,
      seoDescription: raw.seoDescription || null,
      translations: raw.translations,
    };
    const result = await patchAdminHealthTest(id, body);
    if (!result.ok)
      redirect(`/admin/health-tests/${id}/edit?error=${encodeURIComponent(result.message)}`);
    // Bust the per-country health-tests cache so price/stock/title
    // edits surface immediately on /{slug}/{lang}/tests.
    const updated = result.data.healthTest;
    revalidateTag(SITE_CACHE_TAGS.countryHealthTests(updated.country.code), "max");
    // Bust the public test detail page (/{country}/{lang}/tests/{testSlug}).
    if (updated.slug) {
      revalidateTag(SITE_CACHE_TAGS.healthTestBySlug(updated.slug), "max");
    }
    const slug = COUNTRY_CODE_TO_SLUG[updated.country.code as keyof typeof COUNTRY_CODE_TO_SLUG];
    if (slug) revalidatePath(`/${slug}/[lang]/tests`, "page");
    revalidatePath("/admin/health-tests");
    revalidatePath(`/admin/health-tests/${id}`);
    redirect(
      `/admin/health-tests/${id}?success=${encodeURIComponent("Health test updated")}`,
    );
  }

  return (
    <>
      <Link
        href={`/admin/health-tests/${id}`}
        className="mb-2 inline-flex items-center gap-1.5 text-portal-compact font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to {displayNameFrom(test.title, test.translations, "title")}
      </Link>
      <PageHeader
        eyebrow="Services"
        title={`Edit ${displayNameFrom(test.title, test.translations, "title")}`}
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
        <form action={updateAction} className="gh-admin-health-form">
          <HealthTestFields
            countries={countries}
            initial={test}
            countryLocked
            locales={locales}
            defaultLocale={defaultLocale}
          />
          <div className="gh-admin-health-actions justify-end border-t border-[var(--color-border)] pt-6">
            <Link
              href={`/admin/health-tests/${id}`}
              className="gh-btn gh-btn-ghost"
            >
              Cancel
            </Link>
            <button type="submit" className="gh-btn gh-btn-primary">
              Save changes
            </button>
          </div>
        </form>
      </AdminCard>
    </>
  );
}
