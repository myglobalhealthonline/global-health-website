import { fetchDoctorMe } from "@/lib/api/doctor-api";
import { DoctorProfileEditForm } from "./_components/edit-form";

export const dynamic = "force-dynamic";

export default async function DoctorProfilePage() {
  const result = await fetchDoctorMe();
  if (!result.ok) {
    return (
      <div className="gh-card p-6">
        <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
          {result.message}
        </p>
      </div>
    );
  }
  const { doctor } = result.data;

  return (
    <>
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Doctor
        </p>
        <h2 className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
          My profile
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Edit your public profile. Country, slug, and registration data are
          admin-managed — ping support if anything there needs to change.
        </p>
      </header>

      <DoctorProfileEditForm
        initial={{
          fullName: doctor.fullName,
          bio: doctor.bio ?? "",
          qualifications: doctor.qualifications,
          languages: doctor.languages,
          whatsappNumber: doctor.whatsappNumber ?? "",
          profileImagePath: doctor.profileImagePath ?? null,
        }}
      />
    </>
  );
}
