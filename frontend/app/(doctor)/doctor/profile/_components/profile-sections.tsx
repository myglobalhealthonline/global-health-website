import type { DoctorMe } from "@/lib/api/doctor-api";
import type enDoctor from "@/locales/en/doctor.json";
import { PageHeader, AdminSummaryStrip } from "@/components/portal-atoms";
import { DoctorProfileEditForm } from "./edit-form";

type DoctorData = DoctorMe["doctor"];
type Market = DoctorData["markets"][number];
export type ProfileStrings = typeof enDoctor.profile;

/**
 * Renders the doctor profile editor for one resolved country (market).
 * Shared by the base `/doctor/profile` page (single country) and the
 * per-country `/doctor/profile/[country]` pages. The active country is
 * resolved upstream from the route; this component only presents it.
 */
export function ProfileSections({
  doctor,
  activeMarket,
  strings,
}: {
  doctor: DoctorData;
  activeMarket: Market | null;
  strings: ProfileStrings;
}) {
  const primaryCountry = doctor.country;
  const additional = doctor.additionalCountries
    .map((row) => row.country)
    .filter((c) => c.code !== primaryCountry.code);
  const specialties = doctor.specialties.map((s) => s.specialty);
  const activeCountryName = activeMarket?.country.name ?? null;

  return (
    <>
      <PageHeader
        className="mb-6"
        eyebrow={strings.eyebrow}
        title={
          activeCountryName
            ? strings.titleWithCountry.replace("{country}", activeCountryName)
            : strings.title
        }
        description={strings.editDescription}
      />

      <AdminSummaryStrip
        className="mb-4"
        items={[
          {
            label: strings.primaryCountry,
            value: primaryCountry.code.toUpperCase(),
            hint: primaryCountry.name,
            tone: "brand",
          },
          {
            label: strings.marketsLabel,
            value: 1 + additional.length,
            hint: strings.activeCountryListings,
            tone: "neutral",
          },
          {
            label: strings.categories,
            value: specialties.length,
            hint: specialties.length === 0 ? strings.adminAssignmentNeeded : strings.approvedSpecialties,
            tone: specialties.length > 0 ? "success" : "warning",
          },
          {
            label: strings.languagesLabel,
            value: doctor.languages.length,
            hint: strings.patientFacingProfile,
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
          className="m-0 text-[var(--portal-text)]"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 16,
            fontWeight: 800,
          }}
        >
          {strings.practiceContext}
        </h3>
        <dl className="gh-doctor-context-grid mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]">
              {strings.primaryCountry}
            </dt>
            <dd className="mt-1 text-[14px] text-[var(--portal-text)]">
              {primaryCountry.name} ({primaryCountry.code.toUpperCase()})
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]">
              {strings.alsoListedIn}
            </dt>
            <dd className="mt-1 text-[14px] text-[var(--portal-text)]">
              {additional.length === 0
                ? "—"
                : additional
                    .map((c) => `${c.name} (${c.code.toUpperCase()})`)
                    .join(", ")}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]">
              {strings.urlSlug}
            </dt>
            <dd className="mt-1 text-[14px] font-mono text-[var(--portal-text)]">
              /{primaryCountry.slug}/{primaryCountry.defaultLocale.toLowerCase()}/doctors/{doctor.slug}
            </dd>
          </div>
        </dl>
        <dl className="gh-doctor-context-grid mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]">
              {strings.categories}
            </dt>
            <dd className="mt-1 text-[14px] text-[var(--portal-text)]">
              {specialties.length === 0
                ? strings.noneAssigned
                : specialties.map((s) => s.name).join(", ")}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]">
              {strings.consultationTypes}
            </dt>
            <dd className="mt-1 text-[14px] text-[var(--portal-text)]">
              {strings.consultationTypesValue}
            </dd>
          </div>
        </dl>
      </section>

      <DoctorProfileEditForm
        activeCountryId={activeMarket?.countryId ?? null}
        strings={strings}
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
