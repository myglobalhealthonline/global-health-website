import Link from "next/link";
import { redirect } from "next/navigation";
import { ServiceFields } from "../_components/service-fields";
import { parseServiceBodyFromForm } from "@/lib/admin/service-form-parse";
import {
  fetchAdminCountries,
  fetchAdminSpecialties,
  postAdminService,
} from "@/lib/admin/admin-api";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ countryId?: string; error?: string }>;
};

export default async function AdminNewServicePage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const createError = sp.error;
  const countryId = sp.countryId?.trim();

  const countriesResult = await fetchAdminCountries();
  if (!countriesResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">New service</h1>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
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
        <h1 className="gh-h2 text-[var(--color-text-primary)]">New service</h1>
        <p className="gh-body mt-3 text-[var(--color-text-muted)]">Choose a country first — specialties load for that country.</p>
        <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-2">
            <span className="gh-field-label">Country</span>
            <select name="countryId" className="gh-select min-w-[240px]" required defaultValue="">
              <option value="">Select…</option>
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
        <Link href="/admin/services" className="mt-6 inline-block gh-link text-[var(--color-brand-primary)]">
          Back to services
        </Link>
      </section>
    );
  }

  const specialtiesResult = await fetchAdminSpecialties(countryId);
  if (!specialtiesResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">New service</h1>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Could not load specialties: {specialtiesResult.message}
        </p>
        <Link href="/admin/services/new" className="mt-6 inline-block gh-link text-[var(--color-brand-primary)]">
          Pick another country
        </Link>
      </section>
    );
  }

  async function createServiceAction(formData: FormData) {
    "use server";

    const raw = parseServiceBodyFromForm(formData);
    const body = {
      countryId: raw.countryId,
      slug: raw.slug,
      name: raw.name,
      summary: raw.summary.trim() === "" ? null : raw.summary.trim(),
      legacyPath: raw.legacyPath.trim() === "" ? null : raw.legacyPath.trim(),
      specialtyId: raw.specialtyId,
      durationMinutes: raw.durationMinutes,
      basePriceCents: raw.basePriceCents,
      currencyCode: raw.currencyCode.trim() === "" ? null : raw.currencyCode.trim(),
      isActive: raw.isActive,
    };

    const result = await postAdminService(body);
    if (!result.ok) {
      redirect(`/admin/services/new?countryId=${encodeURIComponent(raw.countryId)}&error=${encodeURIComponent(result.message)}`);
    }

    redirect(`/admin/services/${result.data.service.id}?success=${encodeURIComponent("Service created")}`);
  }

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">New service</h1>
        <Link href={`/admin/services/new`} className="gh-link text-sm text-[var(--color-text-muted)]">
          Change country
        </Link>
      </div>

      {createError ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {createError}
        </p>
      ) : null}

      <form action={createServiceAction} className="mt-8 flex flex-col gap-8">
        <ServiceFields
          countries={countries}
          specialties={specialtiesResult.data.specialties}
          pinnedCountryId={countryId}
        />
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="gh-btn gh-btn-primary">
            Create service
          </button>
        </div>
      </form>
    </section>
  );
}
