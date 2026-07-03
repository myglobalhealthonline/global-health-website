"use client";

import { useEffect, useState, useTransition } from "react";
import { HeartPulse, Save } from "lucide-react";

type ProfileResponse = {
  nationalIdNumber: string | null;
  taxIdNumber: string | null;
  passportNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  addressCity: string | null;
  addressPostalCode: string | null;
  addressCountryCode: string | null;
  preferredPharmacy: string | null;
};

type MedicalI18n = {
  medicalTitle: string;
  medicalSubtitle: string;
  identityNumbers: string;
  nationalId: string;
  nationalIdHint: string;
  taxId: string;
  taxIdHint: string;
  passport: string;
  address: string;
  line1: string;
  line2: string;
  city: string;
  postalCode: string;
  countryIso: string;
  pharmacy: string;
  preferredPharmacy: string;
  preferredPharmacyHint: string;
  savingMedical: string;
  saveMedicalProfile: string;
  medicalSaved: string;
  medicalSaveFailed: string;
  loading: string;
};

const DEFAULT_I18N: MedicalI18n = {
  medicalTitle: "Medical identity",
  medicalSubtitle: "Optional. Helps us print prescriptions and ship medication. Doctors see this on your chart.",
  identityNumbers: "Identity numbers",
  nationalId: "National ID",
  nationalIdHint: "NIC / DNI / RG / CC",
  taxId: "Tax ID",
  taxIdHint: "NIF / PPS / CPF",
  passport: "Passport",
  address: "Address",
  line1: "Line 1",
  line2: "Line 2",
  city: "City",
  postalCode: "Postal code",
  countryIso: "Country (ISO)",
  pharmacy: "Pharmacy",
  preferredPharmacy: "Preferred pharmacy",
  preferredPharmacyHint: "Used on prescriptions if your doctor doesn't pick another.",
  savingMedical: "Saving…",
  saveMedicalProfile: "Save medical profile",
  medicalSaved: "Medical profile saved",
  medicalSaveFailed: "Could not save medical profile",
  loading: "Loading…",
};

const EMPTY: ProfileResponse = {
  nationalIdNumber: null,
  taxIdNumber: null,
  passportNumber: null,
  addressLine1: null,
  addressLine2: null,
  addressCity: null,
  addressPostalCode: null,
  addressCountryCode: null,
  preferredPharmacy: null,
};

/**
 * Patient-facing PatientProfile editor. Excludes the doctor-only alert
 * fields — the backend route's `.strict()` schema rejects them even if
 * the form tried to send them, but we omit the inputs entirely so the
 * patient never sees a clinical flag UI.
 *
 * The page header sells the section as "Your medical identity" — a
 * single round-trip GET/PATCH against /api/account/profile.
 */
export function PatientProfileSection({ i18n = DEFAULT_I18N }: { i18n?: MedicalI18n }) {
  const [values, setValues] = useState<ProfileResponse>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  useEffect(() => {
    fetch("/api/account/profile", { credentials: "include" })
      .then((r) => r.json())
      .then((json: { ok?: boolean; data?: { profile?: ProfileResponse | null } }) => {
        if (json.ok && json.data?.profile) {
          setValues({ ...EMPTY, ...json.data.profile });
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  function update<K extends keyof ProfileResponse>(
    key: K,
    next: ProfileResponse[K],
  ) {
    setValues((v) => ({ ...v, [key]: next }));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const payload: Partial<ProfileResponse> = {};
    for (const key of Object.keys(values) as Array<keyof ProfileResponse>) {
      const v = values[key];
      const trimmed = typeof v === "string" ? v.trim() : v;
      payload[key] = (trimmed === "" ? null : trimmed) as ProfileResponse[typeof key];
    }
    startTransition(async () => {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        data?: { profile?: ProfileResponse | null };
      };
      if (json.ok) {
        if (json.data?.profile) setValues({ ...EMPTY, ...json.data.profile });
        setMsg({ kind: "ok", text: i18n.medicalSaved });
      } else {
        setMsg({
          kind: "err",
          text: json.message ?? i18n.medicalSaveFailed,
        });
      }
    });
  }

  return (
    <section className="gh-patient-profile-section mt-6">
      <header className="mb-3">
        <h3 className="flex items-center gap-2 text-xl font-bold text-[var(--portal-text)]">
          <HeartPulse
            className="size-5 text-[var(--portal-primary)]"
            aria-hidden
          />
          {i18n.medicalTitle}
        </h3>
        <p className="text-sm text-[var(--portal-muted)]">
          {i18n.medicalSubtitle}
        </p>
      </header>

      {!loaded ? (
        <div className="gh-patient-empty-state gh-card p-6">
          <div className="h-4 w-44 rounded bg-[var(--portal-well)]" />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="h-12 rounded-lg bg-[var(--portal-well)]" />
            <div className="h-12 rounded-lg bg-[var(--portal-well)]" />
            <div className="h-12 rounded-lg bg-[var(--portal-well)]" />
          </div>
        </div>
      ) : (
      <form onSubmit={onSubmit} className="gh-patient-form-card gh-card space-y-5 p-6">
          <fieldset className="grid gap-3 sm:grid-cols-3">
            <legend className="gh-field-label mb-1 sm:col-span-3">
              {i18n.identityNumbers}
            </legend>
            <TextField
              label={i18n.nationalId}
              hint={i18n.nationalIdHint}
              value={values.nationalIdNumber ?? ""}
              onChange={(v) => update("nationalIdNumber", v || null)}
              maxLength={64}
            />
            <TextField
              label={i18n.taxId}
              hint={i18n.taxIdHint}
              value={values.taxIdNumber ?? ""}
              onChange={(v) => update("taxIdNumber", v || null)}
              maxLength={64}
            />
            <TextField
              label={i18n.passport}
              value={values.passportNumber ?? ""}
              onChange={(v) => update("passportNumber", v || null)}
              maxLength={64}
            />
          </fieldset>

          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="gh-field-label mb-1 sm:col-span-2">
              {i18n.address}
            </legend>
            <TextField
              label={i18n.line1}
              value={values.addressLine1 ?? ""}
              onChange={(v) => update("addressLine1", v || null)}
              maxLength={200}
              fullSpan
            />
            <TextField
              label={i18n.line2}
              value={values.addressLine2 ?? ""}
              onChange={(v) => update("addressLine2", v || null)}
              maxLength={200}
              fullSpan
            />
            <TextField
              label={i18n.city}
              value={values.addressCity ?? ""}
              onChange={(v) => update("addressCity", v || null)}
              maxLength={120}
            />
            <TextField
              label={i18n.postalCode}
              value={values.addressPostalCode ?? ""}
              onChange={(v) => update("addressPostalCode", v || null)}
              maxLength={32}
            />
            <TextField
              label={i18n.countryIso}
              value={values.addressCountryCode ?? ""}
              onChange={(v) => update("addressCountryCode", v || null)}
              maxLength={8}
            />
          </fieldset>

          <fieldset>
            <legend className="gh-field-label mb-1">{i18n.pharmacy}</legend>
            <TextField
              label={i18n.preferredPharmacy}
              hint={i18n.preferredPharmacyHint}
              value={values.preferredPharmacy ?? ""}
              onChange={(v) => update("preferredPharmacy", v || null)}
              maxLength={200}
            />
          </fieldset>

          {msg ? (
            <p
              className={`rounded-md px-3 py-2 text-sm ${
                msg.kind === "ok"
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-rose-50 text-rose-800"
              }`}
            >
              {msg.text}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
          >
            <Save className="size-4" aria-hidden />
            {pending ? i18n.savingMedical : i18n.saveMedicalProfile}
          </button>
        </form>
      )}
    </section>
  );
}

function TextField({
  label,
  hint,
  value,
  onChange,
  maxLength,
  fullSpan = false,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (next: string) => void;
  maxLength?: number;
  fullSpan?: boolean;
}) {
  return (
    <label className={`block${fullSpan ? " sm:col-span-2" : ""}`}>
      <span className="gh-field-label">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        className="gh-input mt-1 min-w-0"
      />
      {hint ? <p className="mt-1 text-xs text-[var(--portal-muted)]">{hint}</p> : null}
    </label>
  );
}
