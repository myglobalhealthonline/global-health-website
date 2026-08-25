"use client";

import { useEffect, useState, useTransition } from "react";
import { Link2 } from "lucide-react";
import { FormSection } from "@/components/FormSection";
import {
  PatientAlertsCard,
  type PatientAlertCopy,
  type PatientAlertType,
} from "@/components/patient-alerts";
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";
import {
  NOTIFICATION_LOCALES,
  NOTIFICATION_LOCALE_LABEL,
  type NotificationLocale,
} from "@/lib/notification-locale";

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
  idVerificationStatus?: "NOT_VERIFIED" | "PENDING" | "VERIFIED" | "REJECTED" | null;
};

export type PatientProfileCopy = {
  chartTitle: string;
  idVerifiedBadge: string;
  idPendingBadge: string;
  idNotVerifiedBadge: string;
  idRejectedBadge: string;
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
  uploadLinkLanguage: string;
  uploadLinkLanguageAuto: string;
  uploadLinkLanguageHint: string;
  alertStatusLabel: string;
  alertClinicLabel: string;
  alertRemove: string;
  alertRemoveTitle: string;
  alertRemoveNoteLabel: string;
  alertRemoveNotePlaceholder: string;
  alertRemoveConfirm: string;
  alertRemoveCancel: string;
  alertRemoveNoteRequired: string;
  alertRemoveFailed: string;
  alertHistoryTitle: string;
  alertHistoryEmpty: string;
  alertActionSet: string;
  alertActionUpdated: string;
  alertActionRemoved: string;
  alertHistoryNoteLabel: string;
  alertHistoryPreviousLabel: string;
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
  // "" = auto — the server writes it in the patient's booking language.
  const [uploadLocale, setUploadLocale] = useState<NotificationLocale | "">("");
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  // Weight/height are controlled so BMI can recompute live as the doctor
  // types (BMI itself is never posted — the server derives/stores it).
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  // Chart form mixes uncontrolled text/textarea inputs with FormData-on-submit
  // (see comment below), so a field-by-field snapshot diff isn't available —
  // any edit event flips this flag; it's cleared again on a successful save.
  const [dirty, setDirty] = useState(false);
  /** Bumped on alert removal to remount the uncontrolled alert textareas. */
  const [alertsKey, setAlertsKey] = useState(0);
  useUnsavedChanges(dirty);
  const markDirty = () => setDirty(true);

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

  const alertCopy: PatientAlertCopy = {
    statusAlertLabel: copy.alertStatusLabel,
    clinicAlertLabel: copy.alertClinicLabel,
    removeAction: copy.alertRemove,
    removeTitle: copy.alertRemoveTitle,
    removeNoteLabel: copy.alertRemoveNoteLabel,
    removeNotePlaceholder: copy.alertRemoveNotePlaceholder,
    removeConfirm: copy.alertRemoveConfirm,
    removeCancel: copy.alertRemoveCancel,
    removeNoteRequired: copy.alertRemoveNoteRequired,
    removeFailed: copy.alertRemoveFailed,
    historyTitle: copy.alertHistoryTitle,
    historyEmpty: copy.alertHistoryEmpty,
    actionSet: copy.alertActionSet,
    actionUpdated: copy.alertActionUpdated,
    actionRemoved: copy.alertActionRemoved,
    historyNoteLabel: copy.alertHistoryNoteLabel,
    historyPreviousLabel: copy.alertHistoryPreviousLabel,
  };

  /**
   * A removal clears the field server-side, so drop it from local state AND
   * remount the alert inputs: they are uncontrolled, and a stale
   * `defaultValue` would re-post the removed text on the next Save, quietly
   * resurrecting the alert that was just retired.
   */
  function onAlertRemoved(type: PatientAlertType) {
    setProfile((current) =>
      current
        ? { ...current, [type === "STATUS" ? "statusAlert" : "clinicAlert"]: null }
        : current,
    );
    setAlertsKey((k) => k + 1);
  }

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
      // Only sent once the profile has loaded: before that every box is
      // empty, and an empty alert box now means "clear this alert", which the
      // API rejects without a note. Blanking one deliberately still errors —
      // with the message pointing at Remove — instead of silently no-opping.
      ...(profile
        ? {
            statusAlert: text("statusAlert"),
            clinicAlert: text("clinicAlert"),
          }
        : {}),
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
        setDirty(false);
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
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          // Empty = let the server use the booking's own language; this panel
          // is patient-scoped, so it doesn't know which appointment answers.
          body: JSON.stringify(uploadLocale ? { locale: uploadLocale } : {}),
        },
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
      {profile ? <IdVerificationBadge status={profile.idVerificationStatus} copy={copy} /> : null}
      {/* Banners + the remove-with-note flow + the chart-visible history of
          both. Editing the text stays on the form below; clearing an alert
          only happens here, because the API demands a reason for it. */}
      <div className="mt-3">
        <PatientAlertsCard
          email={email}
          apiBase="/api/doctor/patients"
          statusAlert={profile?.statusAlert}
          clinicAlert={profile?.clinicAlert}
          copy={alertCopy}
          onRemoved={onAlertRemoved}
        />
      </div>

      <form
        className="gh-doctor-patient-profile-form mt-4 grid gap-5 text-sm"
        onSubmit={save}
        onInput={markDirty}
        onChange={markDirty}
      >
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
          <div className="grid gap-3" key={alertsKey}>
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
        <label className="mb-3 grid max-w-xs gap-1">
          <span className="gh-field-label">{copy.uploadLinkLanguage}</span>
          <select
            className="gh-select"
            value={uploadLocale}
            disabled={pending}
            onChange={(e) => setUploadLocale(e.target.value as NotificationLocale | "")}
          >
            <option value="">{copy.uploadLinkLanguageAuto}</option>
            {NOTIFICATION_LOCALES.map((code) => (
              <option key={code} value={code}>
                {NOTIFICATION_LOCALE_LABEL[code]}
              </option>
            ))}
          </select>
          <span className="text-portal-meta text-[var(--portal-muted)]">
            {copy.uploadLinkLanguageHint}
          </span>
        </label>
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

function IdVerificationBadge({
  status,
  copy,
}: {
  status: Profile["idVerificationStatus"];
  copy: PatientProfileCopy;
}) {
  if (status === "VERIFIED") {
    return <span className="gh-badge gh-badge-success mt-2 inline-block">{copy.idVerifiedBadge}</span>;
  }
  if (status === "PENDING") {
    return <span className="gh-badge gh-badge-warning mt-2 inline-block">{copy.idPendingBadge}</span>;
  }
  if (status === "REJECTED") {
    return <span className="gh-badge gh-badge-error mt-2 inline-block">{copy.idRejectedBadge}</span>;
  }
  return <span className="gh-badge gh-badge-neutral mt-2 inline-block">{copy.idNotVerifiedBadge}</span>;
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
