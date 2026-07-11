"use client";

import { useEffect, useState, useTransition } from "react";
import { Link2 } from "lucide-react";
import { FormSection } from "@/components/FormSection";

type Profile = {
  weightKg: number | null;
  heightM: number | null;
  bmi: number | null;
  bloodType: string | null;
  allergies: string[];
  chronicDiseases: string[];
  familyHistory: string[];
  socialHabits: string[];
  surgeries: string[];
  usualMedication: string[];
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  nationalIdNumber: string | null;
  taxIdNumber: string | null;
  passportNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  addressCity: string | null;
  addressPostalCode: string | null;
  addressCountryCode: string | null;
  preferredPharmacy: string | null;
  statusAlert: string | null;
  clinicAlert: string | null;
};

export type PatientProfileCopy = {
  chartTitle: string;
  planPharmacySection: string;
  preferredPharmacy: string;
  vitalsSection: string;
  weightKg: string;
  heightM: string;
  bmiAuto: string;
  bloodType: string;
  bpSystolic: string;
  bpDiastolic: string;
  allergiesField: string;
  medicalHistorySection: string;
  chronicDiseasesField: string;
  usualMedicationField: string;
  usualMedicationPlaceholder: string;
  familyHistoryField: string;
  socialHabitsField: string;
  socialHabitsPlaceholder: string;
  surgeriesField: string;
  clinicalAlertsSection: string;
  clinicalAlertsDesc: string;
  statusAlertField: string;
  statusAlertPlaceholder: string;
  clinicAlertField: string;
  clinicAlertPlaceholder: string;
  saveChart: string;
  chartSaved: string;
  chartSaveFailed: string;
  sendUploadLink: string;
  uploadLinkSent: string;
  uploadLinkFailed: string;
};

type PatchPayload = {
  weightKg?: number | null;
  heightM?: number | null;
  bmi?: number | null;
  bloodType?: string | null;
  allergies?: string[];
  chronicDiseases?: string[];
  familyHistory?: string[];
  socialHabits?: string[];
  surgeries?: string[];
  usualMedication?: string[];
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  nationalIdNumber?: string | null;
  taxIdNumber?: string | null;
  passportNumber?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  addressCity?: string | null;
  addressPostalCode?: string | null;
  addressCountryCode?: string | null;
  preferredPharmacy?: string | null;
  statusAlert?: string | null;
  clinicAlert?: string | null;
};

/**
 * Doctor-side patient chart. Includes:
 *   - red `statusAlert` + amber `clinicAlert` banners at top (when set)
 *   - Identity (national ID / tax ID / passport)
 *   - Address
 *   - Plan & pharmacy
 *   - Clinical baseline (weight / height / blood type / allergies)
 *   - Doctor-only alert editors at the bottom (saves audit-log a
 *     PATIENT_ALERT_UPDATED row)
 *   - "Send upload link" CTA bridging to T7 patient-upload route
 */
export function PatientProfilePanel({
  email,
  strings: copy,
}: {
  email: string;
  strings: PatientProfileCopy;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  // Weight/height are controlled so BMI can recompute live as the doctor
  // types (BMI itself is never posted — the server derives/stores it).
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");

  useEffect(() => {
    fetch(`/api/doctor/patients/${encodeURIComponent(email)}/profile`)
      .then((r) => r.json())
      .then((json: { ok?: boolean; data?: { profile?: Profile | null } }) => {
        if (json.ok && json.data?.profile) {
          setProfile(json.data.profile);
          setWeight(
            json.data.profile.weightKg != null
              ? String(json.data.profile.weightKg)
              : "",
          );
          setHeight(
            json.data.profile.heightM != null
              ? String(json.data.profile.heightM)
              : "",
          );
        }
      })
      .catch(() => {});
  }, [email]);

  const w = Number(weight);
  const h = Number(height);
  const liveBmi =
    Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0
      ? w / (h * h)
      : null;

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const text = (key: string) => {
      const raw = fd.get(key);
      if (raw === null) return undefined;
      const v = String(raw).trim();
      return v === "" ? null : v;
    };
    const num = (key: string) => {
      const raw = fd.get(key);
      if (raw === null || raw === "") return null;
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    };
    const list = (key: string) =>
      String(fd.get(key) ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    const wKg = num("weightKg");
    const hM = num("heightM");
    const payload: PatchPayload = {
      weightKg: wKg,
      heightM: hM,
      bmi:
        wKg != null && hM != null && hM > 0
          ? Math.round((wKg / (hM * hM)) * 10) / 10
          : null,
      bloodType: text("bloodType"),
      allergies: list("allergies"),
      chronicDiseases: list("chronicDiseases"),
      familyHistory: list("familyHistory"),
      socialHabits: list("socialHabits"),
      surgeries: list("surgeries"),
      usualMedication: list("usualMedication"),
      bloodPressureSystolic: num("bloodPressureSystolic"),
      bloodPressureDiastolic: num("bloodPressureDiastolic"),
      nationalIdNumber: text("nationalIdNumber"),
      taxIdNumber: text("taxIdNumber"),
      passportNumber: text("passportNumber"),
      addressLine1: text("addressLine1"),
      addressLine2: text("addressLine2"),
      addressCity: text("addressCity"),
      addressPostalCode: text("addressPostalCode"),
      addressCountryCode: text("addressCountryCode"),
      preferredPharmacy: text("preferredPharmacy"),
      statusAlert: text("statusAlert"),
      clinicAlert: text("clinicAlert"),
    };
    setSaveMsg(null);
    startTransition(async () => {
      const res = await fetch(
        `/api/doctor/patients/${encodeURIComponent(email)}/profile`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        data?: { profile?: Profile | null };
      };
      if (json.ok && json.data?.profile) {
        setProfile(json.data.profile);
        setSaveMsg(copy.chartSaved);
      } else {
        setSaveMsg(json.message ?? copy.chartSaveFailed);
      }
    });
  }

  function sendUploadLink() {
    setUploadMsg(null);
    startTransition(async () => {
      const res = await fetch(
        `/api/doctor/patients/${encodeURIComponent(email)}/upload-link`,
        { method: "POST" },
      );
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        data?: { link?: string };
      };
      if (!res.ok || !json.ok) {
        setUploadMsg(json.message ?? copy.uploadLinkFailed);
        return;
      }
      setUploadMsg(copy.uploadLinkSent);
    });
  }

  return (
    <FormSection title={copy.chartTitle} className="gh-doctor-patient-profile-panel">
      <div className="gh-form-section__span-2">
      {profile?.statusAlert ? (
        <div
          role="alert"
          className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-portal-compact font-semibold text-red-800"
        >
          ⚠ {profile.statusAlert}
        </div>
      ) : null}
      {profile?.clinicAlert ? (
        <div
          role="status"
          className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-portal-compact text-amber-900"
        >
          ⓘ {profile.clinicAlert}
        </div>
      ) : null}

      <form className="gh-doctor-patient-profile-form mt-4 grid gap-5 text-sm" onSubmit={save}>
        {/* Identity (national ID / tax ID / passport) and Address sections
            intentionally hidden from the doctor portal per GDPR plan.
            They remain editable from /admin/users for staff.
            We only emit hidden inputs once `profile` has loaded AND the
            value exists — empty values are omitted so the PATCH never
            blanks server-side data on a race (form submitted before the
            initial profile fetch resolved). If a value is missing
            server-side we simply don't carry it; the backend's PATCH
            treats undefined fields as "leave alone". */}
        {profile?.nationalIdNumber ? (
          <input type="hidden" name="nationalIdNumber" defaultValue={profile.nationalIdNumber} />
        ) : null}
        {profile?.taxIdNumber ? (
          <input type="hidden" name="taxIdNumber" defaultValue={profile.taxIdNumber} />
        ) : null}
        {profile?.passportNumber ? (
          <input type="hidden" name="passportNumber" defaultValue={profile.passportNumber} />
        ) : null}
        {profile?.addressLine1 ? (
          <input type="hidden" name="addressLine1" defaultValue={profile.addressLine1} />
        ) : null}
        {profile?.addressLine2 ? (
          <input type="hidden" name="addressLine2" defaultValue={profile.addressLine2} />
        ) : null}
        {profile?.addressCity ? (
          <input type="hidden" name="addressCity" defaultValue={profile.addressCity} />
        ) : null}
        {profile?.addressPostalCode ? (
          <input type="hidden" name="addressPostalCode" defaultValue={profile.addressPostalCode} />
        ) : null}
        {profile?.addressCountryCode ? (
          <input type="hidden" name="addressCountryCode" defaultValue={profile.addressCountryCode} />
        ) : null}

        <Section title={copy.planPharmacySection}>
          <Field
            name="preferredPharmacy"
            label={copy.preferredPharmacy}
            defaultValue={profile?.preferredPharmacy ?? ""}
            maxLength={200}
          />
        </Section>

        <Section title={copy.vitalsSection}>
          <div className="gh-doctor-field-grid grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">{copy.weightKg}</span>
              <input
                name="weightKg"
                type="number"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="gh-input"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">{copy.heightM}</span>
              <input
                name="heightM"
                type="number"
                step="0.01"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="gh-input"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">{copy.bmiAuto}</span>
              <input
                readOnly
                disabled
                value={liveBmi != null ? liveBmi.toFixed(1) : "—"}
                className="gh-input bg-[var(--portal-well)] text-[var(--portal-muted)]"
              />
            </label>
          </div>
          <div className="gh-doctor-field-grid mt-3 grid gap-3 sm:grid-cols-3">
            <Field
              name="bloodType"
              label={copy.bloodType}
              defaultValue={profile?.bloodType ?? ""}
              maxLength={8}
            />
            <Field
              name="bloodPressureSystolic"
              label={copy.bpSystolic}
              type="number"
              defaultValue={
                profile?.bloodPressureSystolic != null
                  ? String(profile.bloodPressureSystolic)
                  : ""
              }
            />
            <Field
              name="bloodPressureDiastolic"
              label={copy.bpDiastolic}
              type="number"
              defaultValue={
                profile?.bloodPressureDiastolic != null
                  ? String(profile.bloodPressureDiastolic)
                  : ""
              }
            />
          </div>
          <label className="mt-3 flex flex-col gap-1">
            <span className="gh-field-label">{copy.allergiesField}</span>
            <input
              name="allergies"
              defaultValue={profile?.allergies?.join(", ") ?? ""}
              className="gh-input"
            />
          </label>
        </Section>

        <Section title={copy.medicalHistorySection}>
          <div className="grid gap-3">
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">{copy.chronicDiseasesField}</span>
              <input
                name="chronicDiseases"
                defaultValue={profile?.chronicDiseases?.join(", ") ?? ""}
                className="gh-input"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">{copy.usualMedicationField}</span>
              <input
                name="usualMedication"
                defaultValue={profile?.usualMedication?.join(", ") ?? ""}
                className="gh-input"
                placeholder={copy.usualMedicationPlaceholder}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">{copy.familyHistoryField}</span>
              <input
                name="familyHistory"
                defaultValue={profile?.familyHistory?.join(", ") ?? ""}
                className="gh-input"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">{copy.socialHabitsField}</span>
              <input
                name="socialHabits"
                defaultValue={profile?.socialHabits?.join(", ") ?? ""}
                className="gh-input"
                placeholder={copy.socialHabitsPlaceholder}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">{copy.surgeriesField}</span>
              <input
                name="surgeries"
                defaultValue={profile?.surgeries?.join(", ") ?? ""}
                className="gh-input"
              />
            </label>
          </div>
        </Section>

        <Section title={copy.clinicalAlertsSection}>
          <p className="-mt-1 mb-2 text-portal-meta text-[var(--portal-muted)]">
            {copy.clinicalAlertsDesc}
          </p>
          <div className="grid gap-3">
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">{copy.statusAlertField}</span>
              <textarea
                name="statusAlert"
                rows={2}
                maxLength={500}
                defaultValue={profile?.statusAlert ?? ""}
                className="gh-input"
                placeholder={copy.statusAlertPlaceholder}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">{copy.clinicAlertField}</span>
              <textarea
                name="clinicAlert"
                rows={2}
                maxLength={500}
                defaultValue={profile?.clinicAlert ?? ""}
                className="gh-input"
                placeholder={copy.clinicAlertPlaceholder}
              />
            </label>
          </div>
        </Section>

        <div className="gh-doctor-form-actions flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="gh-btn gh-btn-soft text-sm"
          >
            {copy.saveChart}
          </button>
          {saveMsg ? (
            <span className="text-portal-meta text-[var(--portal-muted)]">
              {saveMsg}
            </span>
          ) : null}
        </div>
      </form>

      <div className="gh-doctor-upload-link mt-5 border-t border-[var(--portal-line)] pt-4">
        <button
          type="button"
          disabled={pending}
          onClick={sendUploadLink}
          className="gh-btn gh-btn-primary text-sm"
        >
          <Link2 className="size-3.5" aria-hidden /> {copy.sendUploadLink}
        </button>
        {uploadMsg ? (
          <p className="mt-2 text-sm text-[var(--portal-muted)]">
            {uploadMsg}
          </p>
        ) : null}
      </div>
      </div>
    </FormSection>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="gh-doctor-chart-section">
      <h4 className="mb-2 text-portal-thead font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]">
        {title}
      </h4>
      {children}
    </section>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  maxLength,
  step,
  hint,
  fullSpan = false,
}: {
  name: string;
  label: string;
  defaultValue: string;
  type?: string;
  maxLength?: number;
  step?: string;
  hint?: string;
  fullSpan?: boolean;
}) {
  return (
    <label
      className={`flex flex-col gap-1${fullSpan ? " sm:col-span-2" : ""}`}
    >
      <span className="gh-field-label">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        maxLength={maxLength}
        step={step}
        className="gh-input"
      />
      {hint ? (
        <span className="text-portal-thead text-[var(--portal-muted)]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
