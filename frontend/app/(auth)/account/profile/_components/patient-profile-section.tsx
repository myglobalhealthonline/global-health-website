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
export function PatientProfileSection() {
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
        setMsg({ kind: "ok", text: "Medical profile saved" });
      } else {
        setMsg({
          kind: "err",
          text: json.message ?? "Could not save medical profile",
        });
      }
    });
  }

  return (
    <section className="mt-6">
      <header className="mb-3">
        <h3 className="flex items-center gap-2 text-xl font-bold text-[var(--color-text-primary)]">
          <HeartPulse
            className="size-5 text-[var(--color-brand-primary)]"
            aria-hidden
          />
          Medical identity
        </h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          Optional. Helps us print prescriptions and ship medication.
          Doctors see this on your chart.
        </p>
      </header>

      {!loaded ? (
        <div className="gh-card p-6 text-sm text-[var(--color-text-muted)]">
          Loading…
        </div>
      ) : (
        <form onSubmit={onSubmit} className="gh-card space-y-5 p-6">
          <fieldset className="grid gap-3 sm:grid-cols-3">
            <legend className="gh-field-label mb-1 sm:col-span-3">
              Identity numbers
            </legend>
            <TextField
              label="National ID"
              hint="NIC / DNI / RG / CC"
              value={values.nationalIdNumber ?? ""}
              onChange={(v) => update("nationalIdNumber", v || null)}
              maxLength={64}
            />
            <TextField
              label="Tax ID"
              hint="NIF / PPS / CPF"
              value={values.taxIdNumber ?? ""}
              onChange={(v) => update("taxIdNumber", v || null)}
              maxLength={64}
            />
            <TextField
              label="Passport"
              value={values.passportNumber ?? ""}
              onChange={(v) => update("passportNumber", v || null)}
              maxLength={64}
            />
          </fieldset>

          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="gh-field-label mb-1 sm:col-span-2">
              Address
            </legend>
            <TextField
              label="Line 1"
              value={values.addressLine1 ?? ""}
              onChange={(v) => update("addressLine1", v || null)}
              maxLength={200}
              fullSpan
            />
            <TextField
              label="Line 2"
              value={values.addressLine2 ?? ""}
              onChange={(v) => update("addressLine2", v || null)}
              maxLength={200}
              fullSpan
            />
            <TextField
              label="City"
              value={values.addressCity ?? ""}
              onChange={(v) => update("addressCity", v || null)}
              maxLength={120}
            />
            <TextField
              label="Postal code"
              value={values.addressPostalCode ?? ""}
              onChange={(v) => update("addressPostalCode", v || null)}
              maxLength={32}
            />
            <TextField
              label="Country (ISO)"
              value={values.addressCountryCode ?? ""}
              onChange={(v) => update("addressCountryCode", v || null)}
              maxLength={8}
            />
          </fieldset>

          <fieldset>
            <legend className="gh-field-label mb-1">Pharmacy</legend>
            <TextField
              label="Preferred pharmacy"
              hint="Used on prescriptions if your doctor doesn't pick another."
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
            {pending ? "Saving…" : "Save medical profile"}
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
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </label>
  );
}
