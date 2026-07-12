"use client";

import { useState } from "react";
import type { DoctorMe } from "@/lib/api/doctor-api";
import type enDoctor from "@/locales/en/doctor.json";
import { AdminSummaryStrip } from "@/components/portal-atoms";
import { PortalTabs, PortalTabPanel } from "@/components/PortalTabs";
import { DoctorIdentityForm } from "./identity-form";
import { DoctorMarketForm } from "./market-form";

type DoctorData = DoctorMe["doctor"];
type Market = DoctorData["markets"][number];
export type ProfileStrings = typeof enDoctor.profile;

const IDENTITY_TAB = "identity";

/**
 * Doctor profile — one page, tabbed. Tab 1 is the global identity form
 * (shared across every market); one further tab per active market holds
 * that market's listing + payout forms. All tab panels stay mounted
 * (hidden via CSS) so dirty tracking / unsaved-changes guards survive
 * switching tabs — same pattern as patient-record-tabs.
 */
export function ProfileSections({
  doctor,
  strings,
}: {
  doctor: DoctorData;
  strings: ProfileStrings;
}) {
  const primaryCountry = doctor.country;
  // Single source for market counts (15-001): derive from `doctor.markets`
  // (the real per-country registration rows, each with its own `active`
  // flag) instead of `doctor.additionalCountries` (a looser admin-managed
  // list with no active flag that can go stale).
  const marketRows = doctor.markets.filter((m) => m.country.code !== primaryCountry.code);
  const additional = marketRows.filter((m) => m.active).map((m) => m.country);
  const additionalInactive = marketRows.filter((m) => !m.active).map((m) => m.country);
  const marketsCount = 1 + additional.length;
  const specialties = doctor.specialties.map((s) => s.specialty);
  const payoutOnFile = doctor.bank.ibanSet || doctor.markets.some((m) => m.active && m.bank.ibanSet);
  const markets: Market[] = activeMarkets(doctor);

  const [tab, setTab] = useState(IDENTITY_TAB);

  return (
    <>
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
            label: strings.payout,
            value: payoutOnFile ? strings.onFile : strings.missing,
            hint: strings.bankDetails,
            tone: payoutOnFile ? "success" : "warning",
          },
        ]}
      />

      <PortalTabs
        className="mb-4"
        ariaLabel="Profile sections"
        value={tab}
        onChange={setTab}
        syncParam="tab"
        items={[
          { value: IDENTITY_TAB, label: strings.identitySection },
          ...markets.map((m) => ({ value: m.country.slug, label: m.country.name })),
        ]}
      />

      <PortalTabPanel value={IDENTITY_TAB} activeValue={tab}>
        {/* Admin-set context: primary country + additional country
            listings + categories the doctor is approved for. Global,
            spans every market, so it lives on the Identity tab. */}
        <section className="gh-card gh-doctor-practice-context mb-4 p-6">
          <h2
            className="m-0 text-[var(--portal-text)]"
            style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800 }}
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
                      ...additionalInactive.map((c) => `${c.name} (${c.code.toUpperCase()}, ${strings.inactive})`),
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
                {specialties.length === 0 ? strings.noneAssigned : specialties.map((s) => s.name).join(", ")}
              </dd>
            </div>
            <div>
              <dt className="text-portal-thead font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]">
                {strings.consultationTypes}
              </dt>
              <dd className="mt-1 text-portal-body text-[var(--portal-text)]">{strings.consultationTypesValue}</dd>
            </div>
          </dl>
        </section>

        <DoctorIdentityForm
          strings={strings}
          initial={{
            fullName: doctor.fullName,
            qualifications: doctor.qualifications,
            languages: doctor.languages,
            whatsappNumber: doctor.whatsappNumber ?? "",
            profileImagePath: doctor.profileImagePath ?? null,
            primaryCountryCode: primaryCountry.code,
          }}
        />
      </PortalTabPanel>

      {markets.map((market) => (
        <PortalTabPanel key={market.countryId} value={market.country.slug} activeValue={tab}>
          <DoctorMarketForm market={market} strings={strings} />
        </PortalTabPanel>
      ))}
    </>
  );
}

/** Active markets (the only ones a doctor may edit), name-sorted. */
export function activeMarkets(doctor: DoctorData): Market[] {
  return doctor.markets.filter((m) => m.active);
}
