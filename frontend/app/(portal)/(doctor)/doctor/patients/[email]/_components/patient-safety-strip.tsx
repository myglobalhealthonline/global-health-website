"use client";

import { useEffect, useState } from "react";
import { PatientAlertBanners } from "@/components/patient-alerts";

type SafetyProfile = {
  allergies: string[];
  chronicDiseases: string[];
  usualMedication: string[];
  statusAlert: string | null;
  clinicAlert: string | null;
};

export type PatientSafetyStripCopy = {
  safetyTitle: string;
  safetyAllergies: string;
  safetyChronicConditions: string;
  safetyMedication: string;
  noneRecorded: string;
};

/**
 * Always-visible, read-only clinical-safety summary — promoted above the
 * fold per audit §14/§17 (07-patient-record.md). Pulls from the same
 * `.../profile` endpoint the editable chart form uses, but fetches it
 * independently rather than lifting state out of `PatientProfilePanel`:
 * that form's fields/endpoints are explicitly out of scope for this
 * change, and a second cheap GET is a smaller/safer diff than threading
 * shared state through a form we're told not to touch.
 * ponytail: duplicate GET accepted for isolation; unify via a shared
 * fetch/cache hook only if this endpoint becomes a real cost.
 */
export function PatientSafetyStrip({
  email,
  strings: copy,
}: {
  email: string;
  strings: PatientSafetyStripCopy;
}) {
  const [profile, setProfile] = useState<SafetyProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/doctor/patients/${encodeURIComponent(email)}/profile`)
      .then((r) => r.json())
      .then((json: { ok?: boolean; data?: { profile?: SafetyProfile | null } }) => {
        if (!cancelled && json.ok && json.data?.profile) {
          setProfile(json.data.profile);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [email]);

  const list = (values: string[] | undefined) =>
    values && values.length > 0 ? values.join(", ") : copy.noneRecorded;

  return (
    <section
      aria-label={copy.safetyTitle}
      className="gh-card gh-doctor-safety-strip mb-4 p-4"
    >
      <PatientAlertBanners
        statusAlert={profile?.statusAlert}
        clinicAlert={profile?.clinicAlert}
        className="mb-2"
      />
      <div className="gh-doctor-safety-strip__grid grid gap-3 sm:grid-cols-3">
        <SafetyItem label={copy.safetyAllergies} value={list(profile?.allergies)} />
        <SafetyItem
          label={copy.safetyChronicConditions}
          value={list(profile?.chronicDiseases)}
        />
        <SafetyItem label={copy.safetyMedication} value={list(profile?.usualMedication)} />
      </div>
    </section>
  );
}

function SafetyItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="gh-field-label">{label}</span>
      <p className="mt-0.5 text-portal-compact text-[var(--portal-text)]">{value}</p>
    </div>
  );
}
