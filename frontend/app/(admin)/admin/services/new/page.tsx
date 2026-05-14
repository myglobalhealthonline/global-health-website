import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ServiceFields } from "../_components/service-fields";
import { parseServiceBodyFromForm } from "@/lib/admin/service-form-parse";
import {
  fetchAdminCountries,
  fetchAdminServices,
  fetchAdminSpecialties,
  postAdminService,
} from "@/lib/admin/admin-api";
import { readServiceKind, SERVICE_KIND_META } from "@/lib/admin/service-kind";
import {
  detectDuplicateTextIssues,
  validateAdminServicePayload,
} from "@/lib/content/publication-validation";
import { AdminCard, Btn, PageHeader } from "../../_components/atoms";

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
    redirect(
      `/admin/health-tests/new${countryId ? `?countryId=${encodeURIComponent(countryId)}` : ""}`,
    );
  }
  if (kind === "HOME_DELIVERY") {
    redirect("/admin");
  }
  const meta = SERVICE_KIND_META[kind];

  const countriesResult = await fetchAdminCountries();
  if (!countriesResult.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Services"
          title={`New ${meta.singularLabel.toLowerCase()}`}
          actions={
            <Btn href={meta.listHref} variant="ghost" iconLeft={<ArrowLeft className="size-3.5" />}>
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

  const countries = countriesResult.data.countries.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
  }));

  if (!countryId) {
    return (
      <>
        <PageHeader
          eyebrow="Services"
          title={`New ${meta.singularLabel.toLowerCase()}`}
          description="Choose a country first — content and pricing stay tied to the correct clinic."
          actions={
            <Btn href={meta.listHref} variant="ghost" iconLeft={<ArrowLeft className="size-3.5" />}>
              Cancel
            </Btn>
          }
        />
        <AdminCard>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="kind" value={kind} />
            <label className="flex flex-col gap-1.5">
              <span className="gh-field-label">Country</span>
              <select
                name="countryId"
                className="gh-select min-w-[240px]"
                required
                defaultValue=""
              >
                <option value="">Select…</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code.toUpperCase()})
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

  const specialtiesResult = await fetchAdminSpecialties(countryId);
  if (!specialtiesResult.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Services"
          title={`New ${meta.singularLabel.toLowerCase()}`}
          actions={
            <Btn href={meta.listHref} variant="ghost" iconLeft={<ArrowLeft className="size-3.5" />}>
              Cancel
            </Btn>
          }
        />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load categories: {specialtiesResult.message}
          </p>
        </AdminCard>
      </>
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
      heroDescription:
        raw.heroDescription.trim() === "" ? null : raw.heroDescription.trim(),
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
      Promise.resolve(
        validateAdminServicePayload({
          kind: body.kind as
            | "GENERAL"
            | "SPECIALIST"
            | "PRESCRIPTION"
            | "HEALTH_TEST"
            | "HOME_DELIVERY",
          name: body.name,
          summary: body.summary,
          heroTitle: body.heroTitle,
          heroDescription: body.heroDescription,
          detailBody: body.detailBody,
          durationMinutes: body.durationMinutes ?? null,
          basePriceCents: body.basePriceCents ?? null,
          currencyCode: body.currencyCode,
          isActive: body.isActive,
        }),
      ),
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
    <>
      <Link
        href={meta.listHref}
        className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to {meta.label.toLowerCase()}
      </Link>
      <PageHeader
        eyebrow="Services"
        title={`New ${meta.singularLabel.toLowerCase()}`}
        description={`Configure title, pricing, duration, sort order, and detail content for this ${meta.singularLabel.toLowerCase()}.`}
        actions={
          <Btn href={meta.listHref} variant="ghost">
            Cancel
          </Btn>
        }
      />

      {createError ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {createError}
        </p>
      ) : null}

      <AdminCard>
        <form action={createServiceAction} className="flex flex-col gap-8">
          <ServiceFields
            countries={countries}
            specialties={specialtiesResult.data.specialties}
            kind={kind}
            pinnedCountryId={countryId}
          />
          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] pt-6">
            <button type="submit" className="gh-btn gh-btn-primary">
              Create {meta.singularLabel.toLowerCase()}
            </button>
            <Link
              href={meta.listHref}
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
