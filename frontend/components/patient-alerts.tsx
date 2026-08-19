"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

/**
 * Doctor-only alert banners (`PatientProfile.statusAlert` / `clinicAlert`) and
 * the remove-with-note flow behind them.
 *
 * One component, three surfaces: the patient chart tab and the admin profile
 * editor mount `PatientAlertsCard` (banners + Remove + history); the
 * appointment workspace's consultation tab and the chart safety strip render
 * `PatientAlertBanners` read-only. Keeping the markup here is what makes the
 * red/amber banner look identical wherever a doctor meets it.
 *
 * Setting or rewording an alert still goes through the normal profile PATCH.
 * Only removal lives here, because the API refuses to clear an alert without
 * a note (AlertRemovalRequiresNoteError -> 400).
 */

export type PatientAlertType = "STATUS" | "CLINIC";

export type PatientAlertLogEntry = {
  id: string;
  alertType: PatientAlertType;
  action: "SET" | "UPDATED" | "REMOVED";
  previousValue: string | null;
  newValue: string | null;
  note: string | null;
  actorRole: string;
  actorName: string | null;
  createdAt: string;
};

export type PatientAlertCopy = {
  statusAlertLabel: string;
  clinicAlertLabel: string;
  removeAction: string;
  removeTitle: string;
  removeNoteLabel: string;
  removeNotePlaceholder: string;
  removeConfirm: string;
  removeCancel: string;
  removeNoteRequired: string;
  removeFailed: string;
  historyTitle: string;
  historyEmpty: string;
  actionSet: string;
  actionUpdated: string;
  actionRemoved: string;
  historyNoteLabel: string;
  historyPreviousLabel: string;
};

/** English fallback — the admin portal is English-only and passes nothing. */
export const DEFAULT_PATIENT_ALERT_COPY: PatientAlertCopy = {
  statusAlertLabel: "Status alert",
  clinicAlertLabel: "Clinic alert",
  removeAction: "Remove",
  removeTitle: "Remove alert",
  removeNoteLabel: "Reason for removal (saved to the chart)",
  removeNotePlaceholder: "e.g. Allergy ruled out by testing on 12 Aug",
  removeConfirm: "Remove alert",
  removeCancel: "Cancel",
  removeNoteRequired: "Enter a reason of at least 3 characters.",
  removeFailed: "Could not remove the alert.",
  historyTitle: "Alert history",
  historyEmpty: "No alert changes recorded.",
  actionSet: "Alert added",
  actionUpdated: "Alert edited",
  actionRemoved: "Alert removed",
  historyNoteLabel: "Reason",
  historyPreviousLabel: "Was",
};

const STATUS_BANNER =
  "rounded-md border border-red-300 bg-red-50 px-3 py-2 text-portal-compact font-semibold text-red-800";
const CLINIC_BANNER =
  "rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-portal-compact text-amber-900";

/**
 * Read-only banners. `renderAction` renders inside the banner row (the Remove
 * button on surfaces that can act); omit it and the banner is display-only.
 */
export function PatientAlertBanners({
  statusAlert,
  clinicAlert,
  className,
  renderAction,
}: {
  statusAlert: string | null | undefined;
  clinicAlert: string | null | undefined;
  className?: string;
  renderAction?: (type: PatientAlertType) => React.ReactNode;
}) {
  if (!statusAlert && !clinicAlert) return null;
  return (
    <div className={`gh-patient-alerts grid gap-2 ${className ?? ""}`}>
      {statusAlert ? (
        <div role="alert" className={`${STATUS_BANNER} flex items-start justify-between gap-3`}>
          <span>⚠ {statusAlert}</span>
          {renderAction?.("STATUS")}
        </div>
      ) : null}
      {clinicAlert ? (
        <div role="status" className={`${CLINIC_BANNER} flex items-start justify-between gap-3`}>
          <span>ⓘ {clinicAlert}</span>
          {renderAction?.("CLINIC")}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Banners + remove-with-note + history, for the chart surfaces.
 *
 * `apiBase` is the portal's patient prefix — `/api/doctor/patients` or
 * `/api/admin/patients`; both expose the same `:email/alerts/:type/remove`
 * and `:email/alert-log` pair.
 */
export function PatientAlertsCard({
  email,
  apiBase,
  statusAlert,
  clinicAlert,
  copy = DEFAULT_PATIENT_ALERT_COPY,
  onRemoved,
}: {
  email: string;
  apiBase: string;
  statusAlert: string | null | undefined;
  clinicAlert: string | null | undefined;
  copy?: PatientAlertCopy;
  /** Fired after a successful removal so the parent can refresh its own copy
   *  of the profile (and reset any uncontrolled alert inputs). */
  onRemoved?: (type: PatientAlertType) => void;
}) {
  const [entries, setEntries] = useState<PatientAlertLogEntry[]>([]);
  const [target, setTarget] = useState<PatientAlertType | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const loadHistory = useCallback(() => {
    let cancelled = false;
    fetch(`${apiBase}/${encodeURIComponent(email)}/alert-log`)
      .then((r) => r.json())
      .then((json: { ok?: boolean; data?: { entries?: PatientAlertLogEntry[] } }) => {
        if (!cancelled && json.ok && json.data?.entries) setEntries(json.data.entries);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [apiBase, email]);

  useEffect(() => loadHistory(), [loadHistory]);

  function submitRemoval() {
    if (!target) return;
    if (note.trim().length < 3) {
      setError(copy.removeNoteRequired);
      return;
    }
    setError(null);
    const removedType = target;
    startTransition(async () => {
      const res = await fetch(
        `${apiBase}/${encodeURIComponent(email)}/alerts/${
          removedType === "STATUS" ? "status" : "clinic"
        }/remove`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ note: note.trim() }),
        },
      );
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        data?: { entries?: PatientAlertLogEntry[] };
      };
      if (!res.ok || !json.ok) {
        setError(json.message ?? copy.removeFailed);
        return;
      }
      if (json.data?.entries) setEntries(json.data.entries);
      setTarget(null);
      setNote("");
      onRemoved?.(removedType);
      // Server-rendered surfaces (the admin editor) hold the alert text in
      // their own props; refresh so the removed banner and its input clear
      // there too. A no-op cost on the doctor chart, which already patched
      // its local state through onRemoved.
      router.refresh();
    });
  }

  const actionLabel = (action: PatientAlertLogEntry["action"]) =>
    action === "SET"
      ? copy.actionSet
      : action === "UPDATED"
        ? copy.actionUpdated
        : copy.actionRemoved;

  return (
    <div className="gh-patient-alerts-card grid gap-3">
      <PatientAlertBanners
        statusAlert={statusAlert}
        clinicAlert={clinicAlert}
        renderAction={(type) => (
          <button
            type="button"
            className="gh-btn gh-btn-soft shrink-0 text-portal-meta"
            onClick={() => {
              setTarget(type);
              setNote("");
              setError(null);
            }}
          >
            {copy.removeAction}
          </button>
        )}
      />

      {target ? (
        <div className="gh-patient-alert-remove rounded-md border border-[var(--portal-line)] bg-[var(--portal-well)] p-3">
          <p className="m-0 text-portal-compact font-semibold">
            {copy.removeTitle} —{" "}
            {target === "STATUS" ? copy.statusAlertLabel : copy.clinicAlertLabel}
          </p>
          <label className="mt-2 flex flex-col gap-1">
            <span className="gh-field-label">{copy.removeNoteLabel}</span>
            <textarea
              rows={2}
              maxLength={500}
              className="gh-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={copy.removeNotePlaceholder}
            />
          </label>
          {error ? (
            <p className="mt-2 text-portal-meta text-[var(--color-status-warning-text)]">
              {error}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={submitRemoval}
              className="gh-btn gh-btn-primary text-sm"
            >
              {copy.removeConfirm}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setTarget(null);
                setError(null);
              }}
              className="gh-btn gh-btn-soft text-sm"
            >
              {copy.removeCancel}
            </button>
          </div>
        </div>
      ) : null}

      <div className="gh-patient-alert-history">
        <h4 className="m-0 text-portal-compact font-semibold">{copy.historyTitle}</h4>
        {entries.length === 0 ? (
          <p className="mt-1 text-portal-meta text-[var(--portal-muted)]">{copy.historyEmpty}</p>
        ) : (
          <ul className="mt-2 grid list-none gap-2 p-0">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-md border border-[var(--portal-line)] px-3 py-2 text-portal-meta"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold">
                    {entry.alertType === "STATUS"
                      ? copy.statusAlertLabel
                      : copy.clinicAlertLabel}
                    {" · "}
                    {actionLabel(entry.action)}
                  </span>
                  <span className="text-[var(--portal-muted)]">
                    {new Date(entry.createdAt).toLocaleString()} ·{" "}
                    {entry.actorName ?? entry.actorRole}
                  </span>
                </div>
                {entry.newValue ? <p className="m-0 mt-1">{entry.newValue}</p> : null}
                {entry.action === "REMOVED" && entry.previousValue ? (
                  <p className="m-0 mt-1 text-[var(--portal-muted)]">
                    {copy.historyPreviousLabel}: {entry.previousValue}
                  </p>
                ) : null}
                {entry.note ? (
                  <p className="m-0 mt-1">
                    <span className="font-semibold">{copy.historyNoteLabel}:</span> {entry.note}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
