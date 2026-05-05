import Link from "next/link";
import { redirect } from "next/navigation";
import { DoctorFields } from "../_components/doctor-fields";
import { parseDoctorBodyFromForm } from "@/lib/admin/doctor-form-parse";
import {
  fetchAdminCountries,
  fetchAdminSpecialties,
  postAdminDoctor,
} from "@/lib/admin/admin-api";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ countryId?: string; error?: string }>;
};

export default async function AdminNewDoctorPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const createError = sp.error;
  const countryId = sp.countryId?.trim();

  const countriesResult = await fetchAdminCountries();
  if (!countriesResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">New doctor profile</h1>
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
        <h1 className="gh-h2 text-[var(--color-text-primary)]">New doctor profile</h1>
        <p className="gh-body mt-3 text-[var(--color-text-muted)]">
          Choose a country first — specialties are loaded for that country only.
        </p>
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
        <Link href="/admin/doctors" className="mt-6 inline-block gh-link text-[var(--color-brand-primary)]">
          Back to doctor profiles
        </Link>
      </section>
    );
  }

  const specialtiesResult = await fetchAdminSpecialties(countryId);
  if (!specialtiesResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">New doctor profile</h1>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Could not load specialties: {specialtiesResult.message}
        </p>
        <Link href="/admin/doctors/new" className="mt-6 inline-block gh-link text-[var(--color-brand-primary)]">
          Pick another country
        </Link>
      </section>
    );
  }

  async function createDoctorAction(formData: FormData) {
    "use server";

    const raw = parseDoctorBodyFromForm(formData);
    const body = {
      countryId: raw.countryId,
      slug: raw.slug,
      fullName: raw.fullName,
      title: raw.title,
      bio: raw.bio.trim() === "" ? null : raw.bio.trim(),
      specialtyIds: raw.specialtyIds,
      ...(raw.profileImagePath === "" ? {} : { profileImagePath: raw.profileImagePath }),
      active: raw.active,
    };

    const result = await postAdminDoctor(body);
    if (!result.ok) {
      redirect(`/admin/doctors/new?countryId=${encodeURIComponent(raw.countryId)}&error=${encodeURIComponent(result.message)}`);
    }

    redirect(`/admin/doctors/${result.data.doctor.id}?success=${encodeURIComponent("Doctor profile created")}`);
  }

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">New doctor profile</h1>
        <Link href="/admin/doctors/new" className="gh-link text-sm text-[var(--color-text-muted)]">
          Change country
        </Link>
      </div>

      {createError ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {createError}
        </p>
      ) : null}

      <form action={createDoctorAction} className="mt-8 flex flex-col gap-8">
        <DoctorFields
          countries={countries}
          specialties={specialtiesResult.data.specialties}
          pinnedCountryId={countryId}
        />
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="gh-btn gh-btn-primary">
            Create profile
          </button>
          <Link href="/admin/doctors" className="gh-link text-sm text-[var(--color-text-muted)]">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
