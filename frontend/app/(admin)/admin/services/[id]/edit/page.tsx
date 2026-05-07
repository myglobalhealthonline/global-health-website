import Link from "next/link";
import { redirect } from "next/navigation";
import { ServiceFields } from "../../_components/service-fields";
import { parseServiceBodyFromForm } from "@/lib/admin/service-form-parse";
import {
  fetchAdminCountries,
  fetchAdminServiceById,
  fetchAdminSpecialties,
  patchAdminService,
} from "@/lib/admin/admin-api";
import { readServiceKind, SERVICE_KIND_META } from "@/lib/admin/service-kind";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string; kind?: string }>;
};

export default async function AdminEditServicePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};

  const [serviceResult, countriesResult] = await Promise.all([
    fetchAdminServiceById(id),
    fetchAdminCountries(),
  ]);

  if (!countriesResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="gh-h2 text-[var(--color-text-primary)]">Edit service</h1>
          <Link href="/admin/general-consultations" className="gh-link text-sm text-[var(--color-text-muted)]">
            Cancel
          </Link>
        </div>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          Could not load countries: {countriesResult.message}
        </p>
      </section>
    );
  }

  if (!serviceResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="gh-h2 text-[var(--color-text-primary)]">Edit service</h1>
          <Link href="/admin/general-consultations" className="gh-link text-sm text-[var(--color-text-muted)]">
            Cancel
          </Link>
        </div>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          Could not load service: {serviceResult.message}
        </p>
      </section>
    );
  }

  const service = serviceResult.data.service;
  const kind = readServiceKind(messages.kind, service.kind);
  const meta = SERVICE_KIND_META[kind];
  const specialtiesResult = await fetchAdminSpecialties(service.countryId);

  if (!specialtiesResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="gh-h2 text-[var(--color-text-primary)]">Edit {meta.singularLabel.toLowerCase()}</h1>
          <Link href={meta.listHref} className="gh-link text-sm text-[var(--color-text-muted)]">
            Cancel
          </Link>
        </div>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          Could not load specialties: {specialtiesResult.message}
        </p>
      </section>
    );
  }

  const countries = countriesResult.data.countries.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
  }));

  async function updateServiceAction(formData: FormData) {
    "use server";

    const raw = parseServiceBodyFromForm(formData);
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

    const result = await patchAdminService(id, body);
    if (!result.ok) {
      redirect(`/admin/services/${id}/edit?kind=${encodeURIComponent(kind)}&error=${encodeURIComponent(result.message)}`);
    }

    redirect(`/admin/services/${id}?kind=${encodeURIComponent(kind)}&success=${encodeURIComponent(`${meta.singularLabel} updated`)}`);
  }

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Edit {meta.singularLabel.toLowerCase()}</h1>
        <Link href={`/admin/services/${id}?kind=${encodeURIComponent(kind)}`} className="gh-link text-sm text-[var(--color-text-muted)]">
          Cancel
        </Link>
      </div>

      {messages.error ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          {messages.error}
        </p>
      ) : null}

      <form action={updateServiceAction} className="mt-8 flex flex-col gap-8">
        <ServiceFields
          countries={countries}
          specialties={specialtiesResult.data.specialties}
          kind={kind}
          initial={service}
          countryLocked
        />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="gh-btn gh-btn-primary">
            Save changes
          </button>
          <Link href={`/admin/services/${id}?kind=${encodeURIComponent(kind)}`} className="gh-link text-sm text-[var(--color-text-muted)]">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
