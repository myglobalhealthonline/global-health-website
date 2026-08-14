"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  doctorApiErrorMessage,
  parseDoctorApiJson,
} from "@/lib/doctor-api-client";
import { HistorySection, SessionTypeBadge, type SessionMeta } from "@/app/(portal)/(doctor)/doctor/_components/doctor-document-tables";
import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";

type MedicalNoteRow = {
  id: string;
  content: string;
  consultationType: string | null;
  createdByName: string;
  createdAt: string;
};

export type AppointmentMedicalNotesCopy = {
  title: string;
  addNoteLabel: string;
  notePlaceholder: string;
  saving: string;
  saveNote: string;
  noteRequired: string;
  loadError: string;
  saveError: string;
  saveSuccess: string;
  loading: string;
  empty: string;
  colSessionDate: string;
  colTime: string;
  colOrderNumber: string;
  colSessionType: string;
  colDoctor: string;
  colMedicalNotes: string;
  hideNote: string;
  viewNote: string;
};

// This component is intentionally not mounted in the appointment workspace
// (see dea4a505 "drop Clinical tab" — manual ad-hoc note entry was replaced
// by the read-only "Consultation notes" section on the patient's history
// page, `doctor/patients/[email]/_components/consultation-history-panel.tsx`,
// which already reads the same MedicalNote rows). Kept for its working
// GET/POST wiring in case a future feature needs it — copy stays optional
// with an English fallback so it's safe if/when it gets wired up again.
const DEFAULT_COPY: AppointmentMedicalNotesCopy = {
  title: "Medical notes",
  addNoteLabel: "Add medical note",
  notePlaceholder:
    "Clinical notes for this session (not sent as PDF — stored in patient history)",
  saving: "Saving…",
  saveNote: "Save medical note",
  noteRequired: "Enter a medical note.",
  loadError: "Could not load medical notes.",
  saveError: "Could not save medical note. Restart the backend if this persists.",
  saveSuccess: "Medical note saved.",
  loading: "Loading notes…",
  empty: "No medical notes yet for this appointment.",
  colSessionDate: "Session date",
  colTime: "Time",
  colOrderNumber: "Order #",
  colSessionType: "Session type",
  colDoctor: "Doctor",
  colMedicalNotes: "Medical notes",
  hideNote: "Hide note",
  viewNote: "View note",
};

export function AppointmentMedicalNotesSection({
  appointmentId,
  session,
  copy = DEFAULT_COPY,
}: {
  appointmentId: string;
  session: SessionMeta;
  copy?: AppointmentMedicalNotesCopy;
}) {
  const [notes, setNotes] = useState<MedicalNoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(
      `/api/doctor/appointments/${appointmentId}/medical-notes`,
    );
    const json = await parseDoctorApiJson<{
      ok?: boolean;
      data?: { items?: MedicalNoteRow[] };
      message?: string;
    }>(res);
    if (!json?.ok) {
      setError(
        doctorApiErrorMessage(res, json, copy.loadError),
      );
      setNotes([]);
    } else if (json.data?.items) {
      setNotes(json.data.items);
    }
    setLoading(false);
  }, [appointmentId, copy.loadError]);

  useEffect(() => {
    // Fetch-on-mount/dep-change — load itself is the setState source.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function saveNote() {
    setError(null);
    setSuccess(null);
    if (!noteText.trim()) {
      setError(copy.noteRequired);
      return;
    }
    startTransition(async () => {
      const res = await fetch(
        `/api/doctor/appointments/${appointmentId}/medical-notes`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ note: noteText.trim() }),
        },
      );
      const json = await parseDoctorApiJson<{ ok?: boolean; message?: string }>(res);
      if (!res.ok || !json?.ok) {
        setError(
          doctorApiErrorMessage(
            res,
            json,
            copy.saveError,
          ),
        );
        return;
      }
      setNoteText("");
      setSuccess(copy.saveSuccess);
      await load();
    });
  }

  const fields: ColumnPriorityField<MedicalNoteRow>[] = [
    { key: "sessionDate", label: copy.colSessionDate, priority: 1, render: () => <span className="whitespace-nowrap">{session.sessionDate}</span> },
    { key: "time", label: copy.colTime, priority: 3, render: () => <span className="whitespace-nowrap">{session.sessionTime}</span> },
    { key: "order", label: copy.colOrderNumber, priority: 3, render: () => session.orderNumber },
    { key: "sessionType", label: copy.colSessionType, priority: 2, render: () => <SessionTypeBadge label={session.consultationTypeLabel} /> },
    { key: "doctor", label: copy.colDoctor, priority: 4, render: (n) => n.createdByName },
    {
      key: "note",
      label: copy.colMedicalNotes,
      priority: 1,
      cardPrimary: true,
      render: (n) =>
        expandedId === n.id ? (
          <span className="flex items-center gap-2 whitespace-pre-wrap text-[var(--portal-text)]">
            <ChevronDown className="size-3.5 shrink-0 text-[var(--portal-muted)]" />
            {n.content}
          </span>
        ) : (
          <span className="flex items-center gap-2 truncate text-[var(--portal-muted)]">
            <ChevronRight className="size-3.5 shrink-0" />
            {n.content.slice(0, 80)}
            {n.content.length > 80 ? "…" : ""}
          </span>
        ),
    },
  ];

  return (
    <HistorySection title={copy.title} count={notes.length} defaultOpen>
      <div className="border-b border-[var(--portal-line)] p-4">
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">{copy.addNoteLabel}</span>
          <textarea
            className="gh-input min-h-[80px]"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder={copy.notePlaceholder}
            maxLength={50000}
          />
        </label>
        <button
          type="button"
          onClick={() => void saveNote()}
          disabled={pending}
          className="gh-btn gh-btn-primary mt-2 text-sm"
        >
          {pending ? copy.saving : copy.saveNote}
        </button>
        {error ? (
          <p className="gh-status-warning mt-2 rounded-md border px-3 py-2 text-portal-label">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="mt-2 text-portal-label font-semibold text-[var(--portal-primary)]">
            {success}
          </p>
        ) : null}
      </div>

      {loading ? (
        <p className="px-4 py-3 text-portal-compact text-[var(--portal-muted)]">{copy.loading}</p>
      ) : notes.length === 0 ? (
        <p className="px-4 py-3 text-portal-compact text-[var(--portal-muted)]">{copy.empty}</p>
      ) : (
        <ColumnPriorityTable
          fields={fields}
          rows={notes}
          getRowKey={(n) => n.id}
          onRowClick={(n) => setExpandedId(expandedId === n.id ? null : n.id)}
          cardActions={(n) => (
            <button
              type="button"
              onClick={() => setExpandedId(expandedId === n.id ? null : n.id)}
              className="inline-flex items-center gap-1 text-portal-meta font-semibold text-[var(--portal-primary)]"
            >
              {expandedId === n.id ? copy.hideNote : copy.viewNote}
              {expandedId === n.id ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronRight className="size-3.5" />
              )}
            </button>
          )}
        />
      )}
    </HistorySection>
  );
}
