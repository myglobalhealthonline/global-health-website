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
import { Upload } from "lucide-react";
import { AdminCard, Btn, PageHeader, Pill } from "../../../_components/atoms";
import { FlagBadge } from "../../../_components/flag-badge";

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
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <FlagBadge code={service.country.code} size={14} /> {service.country.name} ·{" "}
            {meta.label}
          </span>
        }
        title={service.name}
        description="One form serves all four service types — fields adapt based on type."
        actions={
          <>
            <Pill tone={service.isActive ? "published" : "draft"}>
              {service.isActive ? "Published" : "Draft"}
            </Pill>
            <Btn href={`/admin/services/${id}?kind=${encodeURIComponent(kind)}`} variant="ghost">
              Cancel
            </Btn>
          </>
        }
      />

      {messages.error ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {messages.error}
        </p>
      ) : null}

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}
      >
        {/* Main column — form */}
        <AdminCard>
          <h3
            className="m-0 text-[var(--color-text-primary)]"
            style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
          >
            Basics
          </h3>
          <p className="mb-5 mt-1 text-[13px] text-[var(--color-text-muted)]">
            Shown in lists and cards across the public site.
          </p>
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

        {/* Right sidebar — cover image + visibility */}
        <div className="grid gap-4 self-start">
          {/* Cover image card */}
          <AdminCard>
            <h3
              className="m-0 text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
            >
              Cover image
            </h3>
            {service.assets[0]?.path ? (
              <div className="mt-3 overflow-hidden rounded-[var(--radius-card-sm)] bg-[var(--color-background-soft)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={service.assets[0].path}
                  alt={service.name}
                  className="block w-full"
                  style={{ aspectRatio: "4 / 3", objectFit: "cover" }}
                />
              </div>
            ) : (
              <div
                className="mt-3 grid place-items-center text-center text-[12px] text-[var(--color-text-muted)]"
                style={{
                  aspectRatio: "4 / 3",
                  borderRadius: 12,
                  background: "var(--color-background-soft)",
                  border: "1px dashed var(--color-border-strong)",
                  padding: 12,
                }}
              >
                <div>
                  <Upload className="mx-auto size-6" aria-hidden />
                  <p className="m-0 mt-2 font-semibold text-[var(--color-text-body)]">
                    Drop image here
                  </p>
                  <p className="m-0 text-[var(--color-text-muted)]">
                    1200×800 recommended · max 4MB
                  </p>
                </div>
              </div>
            )}
          </AdminCard>

          {/* Visibility card */}
          <AdminCard>
            <h3
              className="m-0 text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
            >
              Visibility
            </h3>
            <div
              className="mt-3 flex items-center justify-between"
              style={{
                padding: "12px 0",
                borderTop: "1px solid var(--color-border)",
              }}
            >
              <div>
                <p className="m-0 text-[13px] font-bold text-[var(--color-text-primary)]">
                  Active
                </p>
                <p className="m-0 text-[12px] text-[var(--color-text-muted)]">
                  Listed on the public site
                </p>
              </div>
              <span
                aria-hidden
                style={{
                  width: 38,
                  height: 22,
                  borderRadius: 999,
                  background: service.isActive
                    ? "var(--color-brand-primary)"
                    : "var(--color-border-strong)",
                  padding: 2,
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    left: service.isActive ? "calc(100% - 20px)" : 2,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "#fff",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.20)",
                  }}
                />
              </span>
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              Toggle from the form&apos;s Active checkbox to switch.
            </p>
          </AdminCard>

          {/* Key facts card — duration / price / sort */}
          <AdminCard>
            <h3
              className="m-0 text-[var(--color-text-primary)]"
              style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
            >
              Key facts
            </h3>
            <dl className="mt-3 grid gap-3">
              <div className="flex items-center justify-between">
                <dt className="text-[12px] uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                  Duration
                </dt>
                <dd className="text-[13px] font-bold text-[var(--color-text-primary)]">
                  {service.durationMinutes != null
                    ? `${service.durationMinutes} min`
                    : "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[12px] uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                  Sort order
                </dt>
                <dd className="text-[13px] font-bold text-[var(--color-text-primary)]">
                  {service.sortOrder}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[12px] uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                  Currency
                </dt>
                <dd className="font-mono text-[13px] text-[var(--color-text-primary)]">
                  {service.currencyCode ?? "—"}
                </dd>
              </div>
            </dl>
          </AdminCard>
        </div>
      </div>
    </>
  );
}
