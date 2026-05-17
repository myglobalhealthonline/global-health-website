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
  const primaryCountry = doctor.country;
  const additional = doctor.additionalCountries
    .map((row) => row.country)
    .filter((c) => c.code !== primaryCountry.code);
  const specialties = doctor.specialties.map((s) => s.specialty);

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

      {/* Admin-set context: primary country + additional country
          listings + categories the doctor is approved for. Surface
          these so the doctor sees at a glance what they can consult
          on, even though the values themselves stay admin-only. */}
      <section className="gh-card mb-4 p-6">
        <h3
          className="m-0 text-[var(--color-text-primary)]"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 16,
            fontWeight: 800,
          }}
        >
          Practice context
        </h3>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
              Primary country
            </dt>
            <dd className="mt-1 text-[14px] text-[var(--color-text-primary)]">
              {primaryCountry.name} ({primaryCountry.code.toUpperCase()})
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
              Also listed in
            </dt>
            <dd className="mt-1 text-[14px] text-[var(--color-text-primary)]">
              {additional.length === 0
                ? "—"
                : additional
                    .map((c) => `${c.name} (${c.code.toUpperCase()})`)
                    .join(", ")}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
              URL slug
            </dt>
            <dd className="mt-1 text-[14px] font-mono text-[var(--color-text-primary)]">
              /{primaryCountry.slug}/{primaryCountry.defaultLocale.toLowerCase()}/doctors/{doctor.slug}
            </dd>
          </div>
        </dl>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
              Categories
            </dt>
            <dd className="mt-1 text-[14px] text-[var(--color-text-primary)]">
              {specialties.length === 0
                ? "None assigned"
                : specialties.map((s) => s.name).join(", ")}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
              Consultation types
            </dt>
            <dd className="mt-1 text-[14px] text-[var(--color-text-primary)]">
              General · Specialist · Prescription · Follow-up
            </dd>
          </div>
        </dl>
      </section>

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
