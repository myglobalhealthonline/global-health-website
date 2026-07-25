"use client";

import { useEffect, useState, useTransition } from "react";
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";

type ConsentItem = {
  consentType: string;
  label: string;
  description: string;
  consentValue: boolean | null;
  consentVersion: string | null;
  lastUpdatedAt: string | null;
};

type Draft = Record<string, boolean | null>;

const CONSENT_TYPES = [
  "STORE_MEDICAL",
  "SHARE_WITH_DOCTOR",
  "MARKETING",
  "THIRD_PARTY_LAB",
  "NOTIFICATIONS",
  "FOLLOW_UP",
  // Phase 2 medical-access scope consents — must match the backend
  // CONSENT_TYPES so toggling them on this tab actually saves.
  "MEDICAL_ACCESS_DIRECT",
  "MEDICAL_ACCESS_COUNTRY_CLINIC",
  "MEDICAL_ACCESS_GLOBAL_NETWORK",
] as const;

type PrivacyI18n = {
  intro: string;
  statusNotSet: string;
  statusAccepted: string;
  statusDeclined: string;
  lastUpdated: string;
  accept: string;
  decline: string;
  noChanges: string;
  saved: string;
  saveFailed: string;
  save: string;
  saving: string;
};

const DEFAULT_I18N: PrivacyI18n = {
  intro: "Control how your medical data is used. Changes are logged for compliance.",
  statusNotSet: "Not set",
  statusAccepted: "Accepted",
  statusDeclined: "Declined",
  lastUpdated: "Last updated: {date}",
  accept: "Accept",
  decline: "Decline",
  noChanges: "No changes to save",
  saved: "Privacy preferences saved",
  saveFailed: "Could not save preferences",
  save: "Save preferences",
  saving: "Saving…",
};

function statusLabel(val: boolean | null, i18n: PrivacyI18n): { text: string; cls: string } {
  if (val === null) return { text: i18n.statusNotSet, cls: "bg-slate-100 text-slate-600" };
  if (val) return { text: i18n.statusAccepted, cls: "bg-emerald-50 text-emerald-700" };
  return { text: i18n.statusDeclined, cls: "bg-rose-50 text-rose-700" };
}

export function GdprPreferencesTab({
  i18n = DEFAULT_I18N,
  onDirtyChange,
}: {
  i18n?: PrivacyI18n;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [consents, setConsents] = useState<ConsentItem[]>([]);
  const [draft, setDraft] = useState<Draft>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, startSave] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    void fetch("/api/account/consents", { credentials: "include" })
      .then((r) => r.json())
      .then((json: { ok?: boolean; data?: { consents?: ConsentItem[] } }) => {
        if (json.ok && json.data?.consents) {
          setConsents(json.data.consents);
          const d: Draft = {};
          for (const c of json.data.consents) {
            d[c.consentType] = c.consentValue;
          }
          setDraft(d);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const savedDraft: Draft = {};
  for (const c of consents) savedDraft[c.consentType] = c.consentValue;
  const dirty = loaded && JSON.stringify(draft) !== JSON.stringify(savedDraft);
  useUnsavedChanges(dirty);
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  function toggle(type: string, value: boolean) {
    setDraft((prev) => ({ ...prev, [type]: value }));
    setMsg(null);
  }

  function onSave() {
    setMsg(null);
    const changes = CONSENT_TYPES.filter((t) => draft[t] !== null && draft[t] !== undefined).map(
      (t) => ({
        consentType: t,
        consentValue: draft[t] as boolean,
      }),
    );
    if (changes.length === 0) {
      setMsg({ kind: "err", text: i18n.noChanges });
      return;
    }

    startSave(async () => {
      const res = await fetch("/api/account/consents", {
        method: "PUT",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ consents: changes }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        data?: { consents?: ConsentItem[] };
        message?: string;
      };
      if (json.ok && json.data?.consents) {
        setConsents(json.data.consents);
        const d: Draft = {};
        for (const c of json.data.consents) {
          d[c.consentType] = c.consentValue;
        }
        setDraft(d);
        setMsg({ kind: "ok", text: i18n.saved });
      } else {
        setMsg({ kind: "err", text: json.message ?? i18n.saveFailed });
      }
    });
  }

  if (!loaded) {
    return (
      <div className="gh-patient-empty-state gh-card p-6">
        <div className="h-4 w-48 rounded bg-[var(--portal-well)]" />
        <div className="mt-4 grid gap-3">
          <div className="h-20 rounded-lg bg-[var(--portal-well)]" />
          <div className="h-20 rounded-lg bg-[var(--portal-well)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="gh-patient-profile-tab space-y-6">
      <p className="text-sm text-[var(--portal-muted)]">
        {i18n.intro}
      </p>

      <div className="gh-patient-consent-card gh-card overflow-hidden divide-y divide-[var(--portal-line)]">
        {consents.map((c) => {
          const current = draft[c.consentType];
          const status = statusLabel(c.consentValue, i18n);

          return (
            <div key={c.consentType} className="gh-patient-consent-row flex items-start justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-[var(--portal-text)]">{c.label}</p>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${status.cls}`}
                    >
                      {status.text}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--portal-muted)]">{c.description}</p>
                  {c.lastUpdatedAt && (
                    <p className="mt-1 text-xs text-[var(--portal-muted)]">
                      {i18n.lastUpdated.replace("{date}", new Date(c.lastUpdatedAt).toLocaleDateString())}
                    </p>
                  )}
                </div>
                <div className="flex w-full shrink-0 gap-2 sm:w-auto">
                  <button
                    type="button"
                    onClick={() => toggle(c.consentType, true)}
                    className={`flex-1 min-h-11 rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none ${
                      current === true
                        ? "bg-emerald-700 text-white"
                        : "border border-[var(--portal-line)] text-[var(--portal-muted)] hover:bg-[var(--portal-well)]"
                    }`}
                  >
                    {i18n.accept}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle(c.consentType, false)}
                    className={`flex-1 min-h-11 rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none ${
                      current === false
                        ? "bg-rose-600 text-white"
                        : "border border-[var(--portal-line)] text-[var(--portal-muted)] hover:bg-[var(--portal-well)]"
                    }`}
                  >
                    {i18n.decline}
                  </button>
                </div>
            </div>
          );
        })}
      </div>

      {msg && (
        <p
          role={msg.kind === "ok" ? "status" : "alert"}
          className={`rounded-md px-3 py-2 text-sm ${
            msg.kind === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
          }`}
        >
          {msg.text}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
        >
          {saving ? i18n.saving : i18n.save}
        </button>
      </div>
    </div>
  );
}
