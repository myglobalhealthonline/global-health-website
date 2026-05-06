import Link from "next/link";
import { redirect } from "next/navigation";
import { DoctorFields } from "../../_components/doctor-fields";
import { parseDoctorBodyFromForm } from "@/lib/admin/doctor-form-parse";
import {
  fetchAdminCountries,
  fetchAdminDoctorById,
  fetchAdminSpecialties,
  patchAdminDoctor,
} from "@/lib/admin/admin-api";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

export default async function AdminEditDoctorPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const messages = searchParams ? await searchParams : {};

  const [doctorResult, countriesResult] = await Promise.all([fetchAdminDoctorById(id), fetchAdminCountries()]);

  if (!countriesResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Edit doctor profile</h1>
        <p className="mt-4 text-[var(--color-status-warning-text)]">Could not load countries: {countriesResult.message}</p>
      </section>
    );
  }

  if (!doctorResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Edit doctor profile</h1>
        <p className="mt-4 text-[var(--color-status-warning-text)]">Could not load doctor: {doctorResult.message}</p>
        <Link href="/admin/doctors" className="mt-6 inline-block gh-link">
          Back to doctor profiles
        </Link>
      </section>
    );
  }

  const doctor = doctorResult.data.doctor;
  const specialtiesResult = await fetchAdminSpecialties(doctor.countryId);

  if (!specialtiesResult.ok) {
    return (
      <section className="gh-card p-6 sm:p-8">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Edit doctor profile</h1>
        <p className="mt-4 text-[var(--color-status-warning-text)]">Could not load specialties: {specialtiesResult.message}</p>
      </section>
    );
  }

  const countries = countriesResult.data.countries.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
  }));

  async function updateDoctorAction(formData: FormData) {
    "use server";

    const raw = parseDoctorBodyFromForm(formData);
    const body = {
      slug: raw.slug,
      fullName: raw.fullName,
      title: raw.title,
      bio: raw.bio.trim() === "" ? null : raw.bio.trim(),
      specialtyIds: raw.specialtyIds,
      profileImagePath: raw.profileImagePath === "" ? null : raw.profileImagePath,
      active: raw.active,
    };

    const result = await patchAdminDoctor(id, body);
    if (!result.ok) {
      redirect(`/admin/doctors/${id}/edit?error=${encodeURIComponent(result.message)}`);
    }

    redirect(`/admin/doctors/${id}?success=${encodeURIComponent("Doctor profile updated")}`);
  }

  return (
    <section className="gh-card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="gh-h2 text-[var(--color-text-primary)]">Edit doctor profile</h1>
        <Link href={`/admin/doctors/${id}`} className="gh-link text-[var(--color-brand-primary)]">
          Cancel
        </Link>
      </div>

      {messages.error ? (
        <p className="mt-4 rounded-[var(--radius-card-sm)] border px-4 py-3 text-sm gh-status-warning">
          {messages.error}
        </p>
      ) : null}

      <form action={updateDoctorAction} className="mt-8 flex flex-col gap-8">
        <DoctorFields
          countries={countries}
          specialties={specialtiesResult.data.specialties}
          initial={doctor}
          countryLocked
        />
        <div className="flex flex-wrap gap-3">
          <button type="submit" className="gh-btn gh-btn-primary">
            Save changes
          </button>
        </div>
      </form>
    </section>
  );
}
