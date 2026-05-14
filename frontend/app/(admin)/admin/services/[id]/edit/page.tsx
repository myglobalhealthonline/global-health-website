import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ServiceFields } from "../../_components/service-fields";
import { parseServiceBodyFromForm } from "@/lib/admin/service-form-parse";
import {
  fetchAdminCountries,
  fetchAdminServiceById,
  fetchAdminServices,
  fetchAdminSpecialties,
  patchAdminService,
} from "@/lib/admin/admin-api";
import { readServiceKind, SERVICE_KIND_META } from "@/lib/admin/service-kind";
import {
  detectDuplicateTextIssues,
  validateAdminServicePayload,
} from "@/lib/content/publication-validation";
import { AdminCard, Btn, PageHeader } from "../../../_components/atoms";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string; kind?: string }>;
};

export default async function AdminEditServicePage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};

  const [serviceResult, countriesResult] = await Promise.all([
    fetchAdminServiceById(id),
    fetchAdminCountries(),
  ]);

  if (!countriesResult.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Services"
          title="Edit service"
          actions={
            <Btn href="/admin/general-consultations" variant="ghost" iconLeft={<ArrowLeft className="size-3.5" />}>
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

  if (!serviceResult.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Services"
          title="Edit service"
          actions={
            <Btn href="/admin/general-consultations" variant="ghost" iconLeft={<ArrowLeft className="size-3.5" />}>
              Cancel
            </Btn>
          }
        />
        <AdminCard>
          <p className="gh-status-warning rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
            Could not load service: {serviceResult.message}
          </p>
        </AdminCard>
      </>
    );
  }

  const service = serviceResult.data.service;
  if (service.kind === "HEALTH_TEST") {
    redirect(`/admin/health-tests/${id}/edit`);
  }
  if (service.kind === "HOME_DELIVERY") {
    redirect("/admin");
  }
  const kind = readServiceKind(messages.kind, service.kind);
  const meta = SERVICE_KIND_META[kind];
  const specialtiesResult = await fetchAdminSpecialties(service.countryId);

  if (!specialtiesResult.ok) {
    return (
      <>
        <PageHeader
          eyebrow="Services"
          title={`Edit ${meta.singularLabel.toLowerCase()}`}
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

  const countries = countriesResult.data.countries.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
  }));

  async function updateServiceAction(formData: FormData) {
    "use server";

    const parsed = parseServiceBodyFromForm(formData);
    if (!parsed.ok) {
      redirect(
        `/admin/services/${id}/edit?kind=${encodeURIComponent(kind)}&error=${encodeURIComponent(parsed.error)}`,
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
            id,
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

    const result = await patchAdminService(id, body);
    if (!result.ok) {
      redirect(
        `/admin/services/${id}/edit?kind=${encodeURIComponent(kind)}&error=${encodeURIComponent(result.message)}`,
      );
    }

    redirect(
      `/admin/services/${id}?kind=${encodeURIComponent(kind)}&success=${encodeURIComponent(
        issues.length > 0
          ? `${meta.singularLabel} updated with editorial warnings`
          : `${meta.singularLabel} updated`,
      )}`,
    );
  }

  return (
    <>
      <Link
        href={`/admin/services/${id}?kind=${encodeURIComponent(kind)}`}
        className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to {service.name}
      </Link>
      <PageHeader
        eyebrow="Services"
        title={`Edit ${meta.singularLabel.toLowerCase()}`}
        description={`Update title, pricing, duration, sort order, and detail content.`}
        actions={
          <Btn href={`/admin/services/${id}?kind=${encodeURIComponent(kind)}`} variant="ghost">
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
        <form action={updateServiceAction} className="flex flex-col gap-8">
          <ServiceFields
            countries={countries}
            specialties={specialtiesResult.data.specialties}
            kind={kind}
            initial={service}
            countryLocked
          />
          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] pt-6">
            <button type="submit" className="gh-btn gh-btn-primary">
              Save changes
            </button>
            <Link
              href={`/admin/services/${id}?kind=${encodeURIComponent(kind)}`}
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
