import Link from "next/link";
import { redirect } from "next/navigation";
import { ServiceFields } from "../_components/service-fields";
import { parseServiceBodyFromForm } from "@/lib/admin/service-form-parse";
import {
  fetchAdminCountries,
  fetchAdminServices,
  fetchAdminSpecialties,
  postAdminService,
} from "@/lib/admin/admin-api";
import { readServiceKind, SERVICE_KIND_META } from "@/lib/admin/service-kind";
import { detectDuplicateTextIssues, validateAdminServicePayload } from "@/lib/content/publication-validation";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ countryId?: string; error?: string; kind?: string }>;
};

export default async function AdminNewServicePage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const createError = sp.error;
  const countryId = sp.countryId?.trim();
  const kind = readServiceKind(sp.kind, "GENERAL");
  if (kind === "HEALTH_TEST") {
    redirect(`/admin/health-tests/new${countryId ? `?countryId=${encodeURIComponent(countryId)}` : ""}`);
  }
  if (kind === "HOME_DELIVERY") {
    redirect("/admin");
  }
  const meta = SERVICE_KIND_META[kind];

  const countriesResult = await fetchAdminCountries();
  if (!countriesResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="gh-h2 text-[var(--color-text-primary)]">New {meta.singularLabel.toLowerCase()}</h1>
          <Link href={meta.listHref} className="gh-link text-sm text-[var(--color-text-muted)]">
            Cancel
          </Link>
        </div>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          Could not load countries: {countriesResult.message}
        </p>
      </section>
    );
  }

  const countries = countriesResult.data.countries.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
  }));

  if (!countryId) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="gh-h2 text-[var(--color-text-primary)]">New {meta.singularLabel.toLowerCase()}</h1>
          <Link href={meta.listHref} className="gh-link text-sm text-[var(--color-text-muted)]">
            Cancel
          </Link>
        </div>
        <p className="gh-body mt-3 text-[var(--color-text-muted)]">
          Choose a country first. This keeps content and pricing tied to the correct clinic.
        </p>
        <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
          <input type="hidden" name="kind" value={kind} />
          <label className="flex flex-col gap-2">
            <span className="gh-field-label">Country</span>
            <select name="countryId" className="gh-select min-w-[240px]" required defaultValue="">
              <option value="">Select...</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="gh-btn gh-btn-primary">
            Continue
          </button>
        </form>
        <Link href={meta.listHref} className="mt-6 inline-block gh-link text-sm text-[var(--color-text-muted)]">
          Back to list
        </Link>
      </section>
    );
  }

  const specialtiesResult = await fetchAdminSpecialties(countryId);
  if (!specialtiesResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="gh-h2 text-[var(--color-text-primary)]">New {meta.singularLabel.toLowerCase()}</h1>
          <Link href={meta.listHref} className="gh-link text-sm text-[var(--color-text-muted)]">
            Cancel
          </Link>
        </div>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          Could not load categories: {specialtiesResult.message}
        </p>
        <Link
          href={`${meta.newHref}?kind=${encodeURIComponent(kind)}`}
          className="mt-6 inline-block gh-link text-[var(--color-brand-primary)]"
        >
          Pick another country
        </Link>
      </section>
    );
  }

  async function createServiceAction(formData: FormData) {
    "use server";

    const parsed = parseServiceBodyFromForm(formData);
    if (!parsed.ok) {
      redirect(
        `/admin/services/new?kind=${encodeURIComponent(kind)}&countryId=${encodeURIComponent(
          countryId ?? "",
        )}&error=${encodeURIComponent(parsed.error)}`,
      );
    }
    const raw = parsed.data;
    const body = {
      countryId: raw.countryId,
      kind: raw.kind,
      slug: raw.slug,
      name: raw.name,
      summary: raw.summary.trim() === "" ? null : raw.summary.trim(),
      heroTitle: raw.heroTitle.trim() === "" ? null : raw.heroTitle.trim(),
      heroDescription: raw.heroDescription.trim() === "" ? null : raw.heroDescription.trim(),
      detailBody: raw.detailBody.trim() === "" ? null : raw.detailBody.trim(),
      ctaLabel: raw.ctaLabel.trim() === "" ? null : raw.ctaLabel.trim(),
      legacyPath: raw.legacyPath.trim() === "" ? null : raw.legacyPath.trim(),
      sortOrder: raw.sortOrder,
      specialtyId: raw.specialtyId,
      durationMinutes: raw.durationMinutes,
      basePriceCents: raw.basePriceCents,
      currencyCode: raw.currencyCode.trim() === "" ? null : raw.currencyCode.trim(),
      imagePath: raw.imagePath.trim() === "" ? null : raw.imagePath.trim(),
      isActive: raw.isActive,
    };

    const [existingServices, validation] = await Promise.all([
      fetchAdminServices({ countryId: raw.countryId, pageSize: "250" }),
      Promise.resolve(validateAdminServicePayload({
        kind: body.kind as "GENERAL" | "SPECIALIST" | "PRESCRIPTION" | "HEALTH_TEST" | "HOME_DELIVERY",
        name: body.name,
        summary: body.summary,
        heroTitle: body.heroTitle,
        heroDescription: body.heroDescription,
        detailBody: body.detailBody,
        durationMinutes: body.durationMinutes ?? null,
        basePriceCents: body.basePriceCents ?? null,
        currencyCode: body.currencyCode,
        isActive: body.isActive,
      })),
    ]);
    const duplicateIssues = existingServices.ok
      ? detectDuplicateTextIssues(
          {
            title: body.heroTitle ?? body.name,
            description: body.heroDescription ?? body.summary,
          },
          existingServices.data.items.map((item) => ({
            id: item.id,
            title: item.heroTitle ?? item.name,
            description: item.heroDescription ?? item.summary,
          })),
        )
      : [];
    const issues = [...validation.issues, ...duplicateIssues];

    const result = await postAdminService(body);
    if (!result.ok) {
      redirect(
        `/admin/services/new?kind=${encodeURIComponent(kind)}&countryId=${encodeURIComponent(raw.countryId)}&error=${encodeURIComponent(result.message)}`,
      );
    }

    redirect(
      `/admin/services/${result.data.service.id}?kind=${encodeURIComponent(kind)}&success=${encodeURIComponent(
        issues.length > 0
          ? `${meta.singularLabel} created with editorial warnings`
          : `${meta.singularLabel} created`,
      )}`,
    );
  }

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">New {meta.singularLabel.toLowerCase()}</h1>
        <Link href={meta.listHref} className="gh-link text-sm text-[var(--color-text-muted)]">
          Cancel
        </Link>
      </div>

      {createError ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          {createError}
        </p>
      ) : null}

      <form action={createServiceAction} className="mt-8 flex flex-col gap-8">
        <ServiceFields
          countries={countries}
          specialties={specialtiesResult.data.specialties}
          kind={kind}
          pinnedCountryId={countryId}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="gh-btn gh-btn-primary">
            Create {meta.singularLabel.toLowerCase()}
          </button>
          <Link href={meta.listHref} className="gh-link text-sm text-[var(--color-text-muted)]">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
