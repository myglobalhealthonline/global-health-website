import Link from "next/link";
import { requireAdminAction } from "@/lib/admin/require-admin-action";
import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { ArrowLeft } from "lucide-react";
import { ServiceFields } from "../../_components/service-fields";
import {
  parseServiceBodyFromForm,
  resolveCountryLocaleTabs,
} from "@/lib/admin/service-form-parse";
import {
  fetchAdminCountries,
  fetchAdminDoctors,
  fetchAdminServiceById,
  fetchAdminServicePeakPricing,
  fetchAdminServiceLinks,
  fetchAdminServices,
  patchAdminService,
  putAdminServiceLinks,
  putAdminServicePeakPricing,
} from "@/lib/admin/admin-api";
import { ServiceLinksPanel } from "../../_components/service-links-panel";
import { PeakPricingCard } from "../../_components/peak-pricing-card";
import { SITE_CACHE_TAGS } from "@/lib/api/site-content-api";
import { readServiceKind, SERVICE_KIND_META } from "@/lib/admin/service-kind";
import {
  detectDuplicateTextIssues,
  validateAdminServicePayload,
} from "@/lib/content/publication-validation";
import { Upload } from "lucide-react";
import { AdminCard, Btn, PageHeader, Pill } from "../../../_components/atoms";
import { FlagBadge } from "../../../_components/flag-badge";
import { FormSection } from "@/components/FormSection";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    error?: string;
    success?: string;
    kind?: string;
    peakSuccess?: string;
    peakError?: string;
  }>;
};

/** "HH:MM" (native time input) → clinic-local minute-of-day. */
function hhmmToMinutes(value: string): number {
  const m = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!m) throw new Error("Time must be in HH:MM format");
  const minutes = Number(m[1]) * 60 + Number(m[2]);
  if (!Number.isFinite(minutes) || minutes < 0 || minutes > 1440) {
    throw new Error("Time is out of range");
  }
  return minutes;
}

/** Decimal amount string → integer cents. */
function priceToCents(value: string): number {
  const raw = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) {
    throw new Error("Price must be a valid amount like 49 or 49.00");
  }
  return Math.round(Number(raw) * 100);
}

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
  const doctorsResult = await fetchAdminDoctors({
    countryId: service.countryId,
    pageSize: "200",
  });
  const doctorOptions = doctorsResult.ok
    ? doctorsResult.data.items.map((d) => ({
        id: d.id,
        slug: d.slug,
        fullName: d.fullName,
        title: d.title,
        active: d.active,
      }))
    : [];

  // Internal-link callouts + candidate same-country target services.
  const [linksResult, sameCountryServices] = await Promise.all([
    fetchAdminServiceLinks(id),
    fetchAdminServices({ countryId: service.countryId, pageSize: "250" }),
  ]);
  const initialLinks = linksResult.ok ? linksResult.data.links : [];
  const linkTargetServices = sameCountryServices.ok
    ? sameCountryServices.data.items
        .filter((s) => s.id !== id)
        .map((s) => ({ id: s.id, name: s.name, slug: s.slug }))
    : [];

  const countries = countriesResult.data.countries.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
  }));

  const serviceCountry = countriesResult.data.countries.find(
    (c) => c.id === service.countryId,
  );
  const { locales, defaultLocale } = resolveCountryLocaleTabs(serviceCountry);

  // Peak-hour pricing only applies to online consultations (they're the only
  // service kinds booked against a time slot).
  const supportsPeakPricing = kind === "GENERAL" || kind === "SPECIALIST";
  const peakResult = supportsPeakPricing
    ? await fetchAdminServicePeakPricing(id)
    : null;
  const peakConfig = peakResult?.ok ? peakResult.data.config : null;

  async function savePeakPricingAction(formData: FormData) {
    "use server";
    await requireAdminAction();

    const redirectError = (msg: string) =>
      redirect(
        `/admin/services/${id}/edit?kind=${encodeURIComponent(kind)}&peakError=${encodeURIComponent(msg)}`,
      );

    let body: {
      enabled: boolean;
      peakPriceCents: number;
      offPeakPriceCents: number;
      currencyCode: string;
      windows: Array<{ startMinute: number; endMinute: number }>;
    };
    try {
      const enabled = formData.get("enabled") === "on";
      // One peakStart/peakEnd pair per window row (repeated form fields).
      const starts = formData.getAll("peakStart").map(String);
      const ends = formData.getAll("peakEnd").map(String);
      const windows: Array<{ startMinute: number; endMinute: number }> = [];
      for (let i = 0; i < Math.max(starts.length, ends.length); i += 1) {
        const startRaw = (starts[i] ?? "").trim();
        const endRaw = (ends[i] ?? "").trim();
        if (!startRaw && !endRaw) continue; // skip blank row
        const startMinute = hhmmToMinutes(startRaw);
        const endMinute = hhmmToMinutes(endRaw);
        if (endMinute <= startMinute) {
          return redirectError(`Window ${i + 1}: end must be after start.`);
        }
        windows.push({ startMinute, endMinute });
      }
      if (enabled && windows.length === 0) {
        return redirectError("Add at least one peak window.");
      }
      const currencyCode = String(formData.get("currencyCode") ?? "")
        .trim()
        .toUpperCase();
      if (currencyCode.length !== 3) {
        return redirectError("Currency must be a 3-letter code like EUR.");
      }
      body = {
        enabled,
        peakPriceCents: priceToCents(String(formData.get("peakPrice") ?? "")),
        offPeakPriceCents: priceToCents(String(formData.get("offPeakPrice") ?? "")),
        currencyCode,
        windows,
      };
    } catch (err) {
      return redirectError(
        err instanceof Error ? err.message : "Invalid peak pricing.",
      );
    }

    const result = await putAdminServicePeakPricing(id, body);
    if (!result.ok) {
      return redirectError(result.message);
    }

    // Bust the public services cache so slot prices refresh on the consult page.
    if (service.country?.code) {
      revalidateTag(SITE_CACHE_TAGS.countryServices(service.country.code), "max");
    }
    revalidateTag(SITE_CACHE_TAGS.globalServices(), "max");

    redirect(
      `/admin/services/${id}/edit?kind=${encodeURIComponent(kind)}&peakSuccess=${encodeURIComponent("Peak pricing saved")}`,
    );
  }

  // Quick inline price edit from the summary card at the top of the page —
  // patches only basePriceCents + currencyCode so the admin doesn't have to
  // open and re-submit the whole service form to change a price.
  async function updatePriceAction(formData: FormData) {
    "use server";
    await requireAdminAction();

    const redirectError = (msg: string) =>
      redirect(
        `/admin/services/${id}/edit?kind=${encodeURIComponent(kind)}&error=${encodeURIComponent(msg)}`,
      );

    let basePriceCents: number | null;
    let currencyCode: string | null;
    try {
      const raw = String(formData.get("basePrice") ?? "").trim();
      basePriceCents = raw === "" ? null : priceToCents(raw);
      const code = String(formData.get("currencyCode") ?? "").trim().toUpperCase();
      currencyCode = code === "" ? null : code;
    } catch (err) {
      return redirectError(
        err instanceof Error ? err.message : "Invalid price.",
      );
    }

    const result = await patchAdminService(id, { basePriceCents, currencyCode });
    if (!result.ok) {
      return redirectError(result.message);
    }

    const saved = result.data.service;
    if (saved.country?.code) {
      revalidateTag(SITE_CACHE_TAGS.countryServices(saved.country.code), "max");
    }
    if (saved.slug) {
      revalidateTag(SITE_CACHE_TAGS.serviceBySlug(saved.slug), "max");
    }
    revalidateTag(SITE_CACHE_TAGS.globalServices(), "max");

    redirect(
      `/admin/services/${id}/edit?kind=${encodeURIComponent(kind)}&success=${encodeURIComponent("Price updated")}`,
    );
  }

  async function updateServiceAction(formData: FormData) {
    "use server";
    await requireAdminAction();

    const parsed = parseServiceBodyFromForm(formData, defaultLocale);
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
      seoTitle: raw.seoTitle.trim() === "" ? null : raw.seoTitle.trim(),
      seoDescription:
        raw.seoDescription.trim() === "" ? null : raw.seoDescription.trim(),
      heroTitle: raw.heroTitle.trim() === "" ? null : raw.heroTitle.trim(),
      heroDescription:
        raw.heroDescription.trim() === "" ? null : raw.heroDescription.trim(),
      detailBody: raw.detailBody.trim() === "" ? null : raw.detailBody.trim(),
      ctaLabel: raw.ctaLabel.trim() === "" ? null : raw.ctaLabel.trim(),
      translations: raw.translations,
      legacyPath: raw.legacyPath.trim() === "" ? null : raw.legacyPath.trim(),
      sortOrder: raw.sortOrder,
      durationMinutes: raw.durationMinutes,
      basePriceCents: raw.basePriceCents,
      currencyCode: raw.currencyCode.trim() === "" ? null : raw.currencyCode.trim(),
      imagePath: raw.imagePath.trim() === "" ? null : raw.imagePath.trim(),
      galleryImagePaths: raw.galleryImagePaths,
      doctorIds: raw.doctorIds,
      shippingCents: raw.shippingCents,
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

    // Bust public cache for the country's services so the new card appears
    // on /[country]/[lang]/general-consultation immediately. Also bust
    // the country doctors tag because ServiceDoctor assignment edits
    // change which services each doctor's public profile lists (QA
    // finding C.3).
    const saved = result.data.service;
    if (saved.country?.code) {
      revalidateTag(SITE_CACHE_TAGS.countryServices(saved.country.code), "max");
      revalidateTag(SITE_CACHE_TAGS.countryDoctors(saved.country.code), "max");
    }
    // Bust the public service detail page (/{country}/{lang}/services/{slug}).
    if (saved.slug) {
      revalidateTag(SITE_CACHE_TAGS.serviceBySlug(saved.slug), "max");
    }
    revalidateTag(SITE_CACHE_TAGS.globalServices(), "max");

    redirect(
      `/admin/services/${id}?kind=${encodeURIComponent(kind)}&success=${encodeURIComponent(
        issues.length > 0
          ? `${meta.singularLabel} updated with editorial warnings`
          : `${meta.singularLabel} updated`,
      )}`,
    );
  }

  async function saveServiceLinksAction(formData: FormData) {
    "use server";
    await requireAdminAction();
    let body: unknown;
    try {
      body = JSON.parse(String(formData.get("payload") ?? '{"links":[]}'));
    } catch {
      redirect(
        `/admin/services/${id}/edit?kind=${encodeURIComponent(kind)}&error=${encodeURIComponent("Invalid links payload")}`,
      );
    }
    const result = await putAdminServiceLinks(id, body);
    if (!result.ok) {
      redirect(
        `/admin/services/${id}/edit?kind=${encodeURIComponent(kind)}&error=${encodeURIComponent(result.message)}`,
      );
    }
    if (service.country?.code) {
      revalidateTag(SITE_CACHE_TAGS.countryServices(service.country.code), "max");
    }
    if (service.slug) {
      revalidateTag(SITE_CACHE_TAGS.serviceBySlug(service.slug), "max");
    }
    revalidateTag(SITE_CACHE_TAGS.globalServices(), "max");
    redirect(
      `/admin/services/${id}/edit?kind=${encodeURIComponent(kind)}&success=${encodeURIComponent("Internal links saved")}`,
    );
  }

  return (
    <>
      <Link
        href={`/admin/services/${id}?kind=${encodeURIComponent(kind)}`}
        className="mb-2 inline-flex items-center gap-1.5 text-portal-compact font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="size-3.5" /> Back to {service.name}
      </Link>
      <PageHeader
        className="gh-admin-service-edit-hero"
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

      <div className="gh-admin-service-edit-summary">
        <div>
          <span className="gh-field-label">Publishing</span>
          <strong>{service.isActive ? "Live service" : "Draft service"}</strong>
          <span>{meta.label}</span>
        </div>
        <div>
          <span className="gh-field-label">Starting price</span>
          <form
            action={updatePriceAction}
            className="mt-1 flex flex-wrap items-center gap-2"
          >
            <input
              type="text"
              inputMode="decimal"
              name="basePrice"
              aria-label="Starting price"
              defaultValue={
                service.basePriceCents != null
                  ? (service.basePriceCents / 100).toFixed(2)
                  : ""
              }
              placeholder="45.00"
              className="gh-input h-9 w-24 min-w-0"
            />
            <input
              name="currencyCode"
              aria-label="Currency code"
              defaultValue={service.currencyCode ?? ""}
              placeholder="EUR"
              maxLength={8}
              className="gh-input h-9 w-20 min-w-0 uppercase"
            />
            <button
              type="submit"
              className="gh-btn gh-btn-primary"
              style={{ minHeight: 36 }}
            >
              Save
            </button>
          </form>
        </div>
        <div>
          <span className="gh-field-label">Assigned doctors</span>
          <strong>{service.assignedDoctors.length}</strong>
          <span>{doctorOptions.length} eligible</span>
        </div>
      </div>

      {messages.error ? (
        <p className="gh-status-warning mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {messages.error}
        </p>
      ) : null}
      {messages.success ? (
        <p className="gh-status-success mb-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm">
          {messages.success}
        </p>
      ) : null}

      <div className="gh-admin-service-layout">
        {/* Main column — form + internal links */}
        <div className="grid gap-4">
        <FormSection
          title="Basics"
          description="Shown in lists and cards across the public site."
        >
          <div className="gh-form-section__span-2">
          <form action={updateServiceAction} className="gh-admin-service-form">
            <ServiceFields
              countries={countries}
              kind={kind}
              initial={service}
              countryLocked
              doctorOptions={doctorOptions}
              locales={locales}
              defaultLocale={defaultLocale}
            />
            <div className="gh-admin-service-actions justify-end border-t border-[var(--color-border)] pt-6">
              <Link
                href={`/admin/services/${id}?kind=${encodeURIComponent(kind)}`}
                className="gh-btn gh-btn-ghost"
              >
                Cancel
              </Link>
              <button type="submit" className="gh-btn gh-btn-primary">
                Save changes
              </button>
            </div>
          </form>
          </div>
        </FormSection>

        <FormSection
          title="Internal links"
          description="Contextual callout boxes to other services (SEO internal-linking). Up to four show per page, ordered upgrade → entry → referral → complementary."
        >
          <div className="gh-form-section__span-2">
          <ServiceLinksPanel
            defaultLocale={defaultLocale}
            locales={locales.map((l) => ({ code: l.code, isDefault: l.isDefault }))}
            services={linkTargetServices}
            initial={initialLinks}
            action={saveServiceLinksAction}
          />
          </div>
        </FormSection>
        </div>

        {/* Right sidebar — cover image + visibility */}
        <div className="grid gap-4 self-start">
          {/* Cover image preview (read-only). Uploads happen via the
              ManagedImageField labelled "Hero image" inside the form on the
              left — showing two upload UIs would mean two form inputs with
              the same name and the data wouldn't round-trip. */}
          <FormSection title="Cover image preview" className="gh-admin-service-side-card">
            {service.assets[0]?.path ? (
              <>
                <div className="gh-admin-service-image-preview mt-3 overflow-hidden rounded-[var(--radius-card-sm)] bg-[var(--color-background-soft)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={service.assets[0].path}
                    alt={service.name}
                    className="block w-full"
                    style={{ aspectRatio: "4 / 3", objectFit: "cover" }}
                  />
                </div>
                <p className="mt-2 text-portal-thead text-[var(--color-text-muted)]">
                  Change the image via the “Hero image” field in the form.
                </p>
              </>
            ) : (
              <div
                className="gh-admin-service-image-empty mt-3 grid place-items-center text-center text-portal-meta text-[var(--color-text-muted)]"
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
                    No image yet
                  </p>
                  <p className="m-0 text-[var(--color-text-muted)]">
                    Use the “Hero image” field in the form to upload.
                  </p>
                </div>
              </div>
            )}
          </FormSection>

          {/* Visibility card */}
          <FormSection title="Visibility" className="gh-admin-service-side-card">
            <div
              className="gh-admin-service-visibility-row mt-3 flex items-center justify-between"
              style={{
                padding: "12px 0",
                borderTop: "1px solid var(--color-border)",
              }}
            >
              <div>
                <p className="m-0 text-portal-compact font-bold text-[var(--color-text-primary)]">
                  Active
                </p>
                <p className="m-0 text-portal-meta text-[var(--color-text-muted)]">
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
                    background: "var(--portal-surface)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.20)",
                  }}
                />
              </span>
            </div>
            <p className="text-portal-thead text-[var(--color-text-muted)]">
              Toggle from the form&apos;s Active checkbox to switch.
            </p>
          </FormSection>

          {/* Key facts card — duration / price / sort */}
          <FormSection title="Key facts" className="gh-admin-service-side-card">
            <dl className="gh-admin-service-facts mt-3 grid gap-3">
              <div className="flex items-center justify-between">
                <dt className="text-portal-meta uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                  Duration
                </dt>
                <dd className="text-portal-compact font-bold text-[var(--color-text-primary)]">
                  {service.durationMinutes != null
                    ? `${service.durationMinutes} min`
                    : "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-portal-meta uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                  Sort order
                </dt>
                <dd className="text-portal-compact font-bold text-[var(--color-text-primary)]">
                  {service.sortOrder}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-portal-meta uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                  Currency
                </dt>
                <dd className="font-mono text-portal-compact text-[var(--color-text-primary)]">
                  {service.currencyCode ?? "—"}
                </dd>
              </div>
            </dl>
          </FormSection>

          {supportsPeakPricing ? (
            <PeakPricingCard
              action={savePeakPricingAction}
              config={peakConfig}
              defaultCurrency={service.currencyCode ?? "EUR"}
              success={messages.peakSuccess}
              error={messages.peakError}
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
