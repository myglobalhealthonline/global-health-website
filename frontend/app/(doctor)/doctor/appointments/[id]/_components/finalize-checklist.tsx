"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ClipboardCheck, Circle } from "lucide-react";

export type FinalizeChecklistCopy = {
  finalizedTitle: string;
  finalizedDescription: string;
  confirmBothItems: string;
  title: string;
  description: string;
  noteRecordedLabel: string;
  noteRecordedPendingHint: string;
  timeReachedLabel: string;
  timeReachedPendingHint: string;
  filesUploadedLabel: string;
  finalizing: string;
  finalizeButton: string;
  couldNotFinalize: string;
};

/**
 * Finalize readiness checklist (doctor audit 03/UX-002 · 03/UX-006). The
 * first two rows are system-derived from data already loaded on the page
 * (consultation content, scheduled time) — the doctor can't uncheck them,
 * they just reflect reality. "Required files uploaded" stays a manual
 * attest: the system has no way to know what documents this specific
 * consultation requires, only whether *a* document exists.
 */
export function FinalizeChecklist({
  appointmentId,
  initialFinalized,
  initialFilesUploaded,
  noteRecorded,
  timeReached,
  copy,
}: {
  appointmentId: string;
  initialFinalized: boolean;
  initialFilesUploaded: boolean;
  /** Derived: consultation has at least one non-empty SOAP field. */
  noteRecorded: boolean;
  /** Derived: the appointment's scheduled time has passed (or is unset). */
  timeReached: boolean;
  copy: FinalizeChecklistCopy;
}) {
  const router = useRouter();
  const [filesUploaded, setFilesUploaded] = useState(initialFilesUploaded);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (initialFinalized) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-sm font-semibold text-emerald-800">
        <p className="flex items-center gap-2">
          <CheckCircle2 className="size-4" aria-hidden />
          {copy.finalizedTitle}
        </p>
        <p className="mt-1 text-portal-meta font-medium text-emerald-700">
          {copy.finalizedDescription}
        </p>
      </div>
    );
  }

  const ready = noteRecorded && timeReached && filesUploaded;

  function finalize() {
    setMessage(null);
    if (!ready) {
      setMessage(copy.confirmBothItems);
      return;
    }
    startTransition(async () => {
      const res = await fetch(
        `/api/doctor/appointments/${appointmentId}/finalize`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ notesUploaded: true, filesUploaded: true }),
        },
      );
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setMessage(json.message ?? copy.couldNotFinalize);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[var(--portal-primary)] text-white">
          <ClipboardCheck className="size-4" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-bold text-[var(--portal-text)]">
            {copy.title}
          </p>
          <p className="mt-1 text-portal-meta text-[var(--portal-muted)]">
            {copy.description}
          </p>
        </div>
      </div>

      <ReadinessRow
        done={noteRecorded}
        label={copy.noteRecordedLabel}
        hint={!noteRecorded ? copy.noteRecordedPendingHint : undefined}
      />
      <ReadinessRow
        done={timeReached}
        label={copy.timeReachedLabel}
        hint={!timeReached ? copy.timeReachedPendingHint : undefined}
      />

      <label className="flex items-center gap-2 rounded-md border border-[var(--portal-line)] bg-[var(--portal-well)] px-3 py-2 text-sm">
        <input
          type="checkbox"
          checked={filesUploaded}
          onChange={(e) => setFilesUploaded(e.target.checked)}
        />
        {copy.filesUploadedLabel}
      </label>

      {message ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {message}
        </p>
      ) : null}
      <button
        type="button"
        disabled={pending || !ready}
        onClick={finalize}
        className="gh-btn gh-btn-primary text-sm"
      >
        {pending ? copy.finalizing : copy.finalizeButton}
      </button>
    </div>
  );
}

/** Read-only status row for a system-derived checklist item — not a checkbox
 *  the doctor can toggle, just a reflection of what's already true. */
function ReadinessRow({
  done,
  label,
  hint,
}: {
  done: boolean;
  label: string;
  hint?: string;
}) {
  return (
    <div
      className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
        done
          ? "border-[var(--portal-line)] bg-[var(--portal-well)] text-[var(--portal-text)]"
          : "border-amber-200 bg-amber-50 text-amber-800"
      }`}
    >
      {done ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
      ) : (
        <Circle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
      )}
      <span>
        {label}
        {hint ? (
          <span className="mt-0.5 block text-portal-meta font-normal opacity-80">
            {hint}
          </span>
        ) : null}
      </span>
    </div>
  );
}
