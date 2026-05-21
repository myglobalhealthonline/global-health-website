"use client";

import { useEffect, useState, useTransition } from "react";
import { Link2 } from "lucide-react";

type Profile = {
  weightKg: number | null;
  heightM: number | null;
  bmi: number | null;
  bloodType: string | null;
  allergies: string[];
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

type PatchPayload = {
  weightKg?: number | null;
  heightM?: number | null;
  bloodType?: string | null;
  allergies?: string[];
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
export function PatientProfilePanel({ email }: { email: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/doctor/patients/${encodeURIComponent(email)}/profile`)
      .then((r) => r.json())
      .then((json: { ok?: boolean; data?: { profile?: Profile | null } }) => {
        if (json.ok && json.data?.profile) setProfile(json.data.profile);
      })
      .catch(() => {});
  }, [email]);

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
    const payload: PatchPayload = {
      weightKg: num("weightKg"),
      heightM: num("heightM"),
      bloodType: text("bloodType"),
      allergies: String(fd.get("allergies") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
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
        setSaveMsg("Chart saved.");
      } else {
        setSaveMsg(json.message ?? "Could not save chart.");
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
        setUploadMsg(json.message ?? "Could not send link");
        return;
      }
      setUploadMsg("Upload link emailed to patient.");
    });
  }

  return (
    <section className="gh-card p-6">
      <h3 className="text-base font-bold text-[var(--color-text-primary)]">
        Patient chart
      </h3>

      {profile?.statusAlert ? (
        <div
          role="alert"
          className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-800"
        >
          ⚠ {profile.statusAlert}
        </div>
      ) : null}
      {profile?.clinicAlert ? (
        <div
          role="status"
          className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[13px] text-amber-900"
        >
          ⓘ {profile.clinicAlert}
        </div>
      ) : null}

      <form className="mt-4 grid gap-5 text-sm" onSubmit={save}>
        <Section title="Identity">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field
              name="nationalIdNumber"
              label="National ID"
              defaultValue={profile?.nationalIdNumber ?? ""}
              maxLength={64}
              hint="NIC / DNI / RG / CC"
            />
            <Field
              name="taxIdNumber"
              label="Tax ID"
              defaultValue={profile?.taxIdNumber ?? ""}
              maxLength={64}
              hint="NIF / PPS / CPF"
            />
            <Field
              name="passportNumber"
              label="Passport"
              defaultValue={profile?.passportNumber ?? ""}
              maxLength={64}
            />
          </div>
        </Section>

        <Section title="Address">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              name="addressLine1"
              label="Line 1"
              defaultValue={profile?.addressLine1 ?? ""}
              maxLength={200}
              fullSpan
            />
            <Field
              name="addressLine2"
              label="Line 2"
              defaultValue={profile?.addressLine2 ?? ""}
              maxLength={200}
              fullSpan
            />
            <Field
              name="addressCity"
              label="City"
              defaultValue={profile?.addressCity ?? ""}
              maxLength={120}
            />
            <Field
              name="addressPostalCode"
              label="Postal code"
              defaultValue={profile?.addressPostalCode ?? ""}
              maxLength={32}
            />
            <Field
              name="addressCountryCode"
              label="Country (ISO)"
              defaultValue={profile?.addressCountryCode ?? ""}
              maxLength={8}
            />
          </div>
        </Section>

        <Section title="Plan & pharmacy">
          <Field
            name="preferredPharmacy"
            label="Preferred pharmacy"
            defaultValue={profile?.preferredPharmacy ?? ""}
            maxLength={200}
          />
        </Section>

        <Section title="Vitals">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field
              name="weightKg"
              label="Weight (kg)"
              type="number"
              step="0.1"
              defaultValue={
                profile?.weightKg != null ? String(profile.weightKg) : ""
              }
            />
            <Field
              name="heightM"
              label="Height (m)"
              type="number"
              step="0.01"
              defaultValue={
                profile?.heightM != null ? String(profile.heightM) : ""
              }
            />
            <Field
              name="bloodType"
              label="Blood type"
              defaultValue={profile?.bloodType ?? ""}
              maxLength={8}
            />
          </div>
          <label className="mt-3 flex flex-col gap-1">
            <span className="gh-field-label">Allergies (comma-separated)</span>
            <input
              name="allergies"
              defaultValue={profile?.allergies?.join(", ") ?? ""}
              className="gh-input"
            />
          </label>
        </Section>

        <Section title="Clinical alerts (doctor-only)">
          <p className="-mt-1 mb-2 text-[12px] text-[var(--color-text-muted)]">
            Renders as a banner on this chart. Never shown to the patient.
            Saves audit a PATIENT_ALERT_UPDATED row.
          </p>
          <div className="grid gap-3">
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Status alert (red)</span>
              <textarea
                name="statusAlert"
                rows={2}
                maxLength={500}
                defaultValue={profile?.statusAlert ?? ""}
                className="gh-input"
                placeholder="e.g. Severe penicillin allergy"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Clinic alert (yellow)</span>
              <textarea
                name="clinicAlert"
                rows={2}
                maxLength={500}
                defaultValue={profile?.clinicAlert ?? ""}
                className="gh-input"
                placeholder="e.g. Schedule mornings only"
              />
            </label>
          </div>
        </Section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="gh-btn gh-btn-soft text-sm"
          >
            Save chart
          </button>
          {saveMsg ? (
            <span className="text-[12px] text-[var(--color-text-muted)]">
              {saveMsg}
            </span>
          ) : null}
        </div>
      </form>

      <div className="mt-5 border-t border-[var(--color-border)] pt-4">
        <button
          type="button"
          disabled={pending}
          onClick={sendUploadLink}
          className="gh-btn gh-btn-primary text-sm"
        >
          <Link2 className="size-3.5" aria-hidden /> Send upload link
        </button>
        {uploadMsg ? (
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            {uploadMsg}
          </p>
        ) : null}
      </div>
    </section>
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
    <section>
      <h4 className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
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
        <span className="text-[11px] text-[var(--color-text-muted)]">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
