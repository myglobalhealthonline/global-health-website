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

export default async function AdminCreateDoctorPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const createError = sp.error;
  const countryId = sp.countryId?.trim();

  const countriesResult = await fetchAdminCountries();
  if (!countriesResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="gh-h2 text-[var(--color-text-primary)]">New doctor profile</h1>
          <Link href="/admin/doctors" className="gh-link text-sm text-[var(--color-text-muted)]">Cancel</Link>
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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="gh-h2 text-[var(--color-text-primary)]">New doctor profile</h1>
          <Link href="/admin/doctors" className="gh-link text-sm text-[var(--color-text-muted)]">Cancel</Link>
        </div>
        <p className="gh-body mt-3 text-[var(--color-text-muted)]">
          Choose a country first — categories are loaded for that country only.
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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="gh-h2 text-[var(--color-text-primary)]">New doctor profile</h1>
          <Link href="/admin/doctors" className="gh-link text-sm text-[var(--color-text-muted)]">Cancel</Link>
        </div>
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          Could not load categories: {specialtiesResult.message}
        </p>
        <Link href="/admin/doctors/create" className="mt-6 inline-block gh-link text-[var(--color-brand-primary)]">
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
      imcRegistration: raw.imcRegistration === "" ? null : raw.imcRegistration,
      medicalRegistrationUrl: raw.medicalRegistrationUrl === "" ? null : raw.medicalRegistrationUrl,
      qualifications: raw.qualifications,
      whatsappNumber: raw.whatsappNumber === "" ? null : raw.whatsappNumber,
      languages: raw.languages,
      specialtyIds: raw.specialtyIds,
      ...(raw.profileImagePath === "" ? {} : { profileImagePath: raw.profileImagePath }),
      active: raw.active,
    };

    const result = await postAdminDoctor(body);
    if (!result.ok) {
      redirect(
        `/admin/doctors/create?countryId=${encodeURIComponent(raw.countryId)}&error=${encodeURIComponent(result.message)}`,
      );
    }

    redirect(`/admin/doctors/${result.data.doctor.id}?success=${encodeURIComponent("Doctor profile created")}`);
  }

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">New doctor profile</h1>
        <Link href="/admin/doctors/create" className="gh-link text-sm text-[var(--color-text-muted)]">
          Change country
        </Link>
      </div>

      {createError ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
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
