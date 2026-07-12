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
  // Single source for market counts (15-001): derive from `doctor.markets`
  // (the real per-country registration rows, each with its own `active`
  // flag) instead of `doctor.additionalCountries` (a looser admin-managed
  // list with no active flag that can go stale — e.g. a country the doctor
  // is no longer actively listed in but that lingers in that join table).
  const marketRows = doctor.markets.filter((m) => m.country.code !== primaryCountry.code);
  const additional = marketRows.filter((m) => m.active).map((m) => m.country);
  const additionalInactive = marketRows.filter((m) => !m.active).map((m) => m.country);
  const marketsCount = 1 + additional.length;
  const specialties = doctor.specialties.map((s) => s.specialty);
  const activeCountryName = activeMarket?.country.name ?? null;
  const payoutOnFile = activeMarket?.bank.ibanSet ?? doctor.bank.ibanSet;

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
            value: marketsCount,
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
            // 15-002 — folds the one non-duplicate ProfileInsight signal
            // (payout status) in here; the strip already covers markets/
            // categories, so a separate "Languages" tile was decorative.
            label: strings.payout,
            value: payoutOnFile ? strings.onFile : strings.missing,
            hint: activeCountryName ?? strings.bankDetails,
            tone: payoutOnFile ? "success" : "warning",
          },
        ]}
      />

      {/* Admin-set context: primary country + additional country
          listings + categories the doctor is approved for. Surface
          these so the doctor sees at a glance what they can consult
          on, even though the values themselves stay admin-only. */}
      <section className="gh-card gh-doctor-practice-context mb-4 p-6">
        <h2
          className="m-0 text-[var(--portal-text)]"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 16,
            fontWeight: 800,
          }}
        >
          {strings.practiceContext}
        </h2>
        <dl className="gh-doctor-context-grid mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-portal-thead font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]">
              {strings.primaryCountry}
            </dt>
            <dd className="mt-1 text-portal-body text-[var(--portal-text)]">
              {primaryCountry.name} ({primaryCountry.code.toUpperCase()})
            </dd>
          </div>
          <div>
            <dt className="text-portal-thead font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]">
              {strings.alsoListedIn}
            </dt>
            <dd className="mt-1 text-portal-body text-[var(--portal-text)]">
              {additional.length === 0 && additionalInactive.length === 0
                ? "—"
                : [
                    ...additional.map((c) => `${c.name} (${c.code.toUpperCase()})`),
                    ...additionalInactive.map(
                      (c) => `${c.name} (${c.code.toUpperCase()}, ${strings.inactive})`,
                    ),
                  ].join(", ")}
            </dd>
          </div>
          <div>
            <dt className="text-portal-thead font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]">
              {strings.urlSlug}
            </dt>
            <dd className="mt-1 text-portal-body font-mono text-[var(--portal-text)]">
              /{primaryCountry.slug}/{primaryCountry.defaultLocale.toLowerCase()}/doctors/{doctor.slug}
            </dd>
          </div>
        </dl>
        <dl className="gh-doctor-context-grid mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-portal-thead font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]">
              {strings.categories}
            </dt>
            <dd className="mt-1 text-portal-body text-[var(--portal-text)]">
              {specialties.length === 0
                ? strings.noneAssigned
                : specialties.map((s) => s.name).join(", ")}
            </dd>
          </div>
          <div>
            <dt className="text-portal-thead font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]">
              {strings.consultationTypes}
            </dt>
            <dd className="mt-1 text-portal-body text-[var(--portal-text)]">
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
          primaryCountryCode: primaryCountry.code,
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
