import type { DoctorMe } from "@/lib/api/doctor-api";
import { AdminSummaryStrip } from "@/components/portal-atoms";
import { DoctorProfileEditForm } from "./edit-form";

type DoctorData = DoctorMe["doctor"];
type Market = DoctorData["markets"][number];

/**
 * Renders the doctor profile editor for one resolved country (market).
 * Shared by the base `/doctor/profile` page (single country) and the
 * per-country `/doctor/profile/[country]` pages. The active country is
 * resolved upstream from the route; this component only presents it.
 */
export function ProfileSections({
  doctor,
  activeMarket,
}: {
  doctor: DoctorData;
  activeMarket: Market | null;
}) {
  const primaryCountry = doctor.country;
  const additional = doctor.additionalCountries
    .map((row) => row.country)
    .filter((c) => c.code !== primaryCountry.code);
  const specialties = doctor.specialties.map((s) => s.specialty);
  const activeCountryName = activeMarket?.country.name ?? null;

  return (
    <>
      <header className="gh-doctor-page-header mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Doctor
        </p>
        <h2 className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
          {activeCountryName ? `My profile — ${activeCountryName}` : "My profile"}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Edit your public profile. Country, slug, and registration data are
          admin-managed — ping support if anything there needs to change.
        </p>
      </header>

      <AdminSummaryStrip
        className="mb-4"
        items={[
          {
            label: "Primary country",
            value: primaryCountry.code.toUpperCase(),
            hint: primaryCountry.name,
            tone: "brand",
          },
          {
            label: "Markets",
            value: 1 + additional.length,
            hint: "Active country listings",
            tone: "neutral",
          },
          {
            label: "Categories",
            value: specialties.length,
            hint: specialties.length === 0 ? "Admin assignment needed" : "Approved specialties",
            tone: specialties.length > 0 ? "success" : "warning",
          },
          {
            label: "Languages",
            value: doctor.languages.length,
            hint: "Patient-facing profile",
            tone: "neutral",
          },
        ]}
      />

      {/* Admin-set context: primary country + additional country
          listings + categories the doctor is approved for. Surface
          these so the doctor sees at a glance what they can consult
          on, even though the values themselves stay admin-only. */}
      <section className="gh-card gh-doctor-practice-context mb-4 p-6">
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
        <dl className="gh-doctor-context-grid mt-3 grid gap-3 sm:grid-cols-3">
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
        <dl className="gh-doctor-context-grid mt-4 grid gap-3 sm:grid-cols-2">
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
        activeCountryId={activeMarket?.countryId ?? null}
        initial={{
          fullName: doctor.fullName,
          bio: doctor.bio ?? "",
          defaultLocale: doctor.country.defaultLocale,
          supportedLocales: doctor.supportedLocales,
          translations: doctor.translations,
          qualifications: doctor.qualifications,
          languages: doctor.languages,
          whatsappNumber: doctor.whatsappNumber ?? "",
          profileImagePath: doctor.profileImagePath ?? null,
          bankAccountHolder: doctor.bank.accountHolder ?? "",
          bankBic: doctor.bank.bic ?? "",
          bankIbanMasked: doctor.bank.ibanMasked,
          bankIbanSet: doctor.bank.ibanSet,
          markets: doctor.markets,
        }}
      />
    </>
  );
}

/** Active markets (the only ones a doctor may edit), name-sorted. */
export function activeMarkets(doctor: DoctorData): Market[] {
  return doctor.markets.filter((m) => m.active);
}
