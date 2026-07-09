"use client";

import { Fragment, useCallback, useEffect, useState, useTransition } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  doctorApiErrorMessage,
  parseDoctorApiJson,
} from "@/lib/doctor-api-client";
import { HistorySection, SessionTypeBadge, type SessionMeta } from "@/app/(doctor)/doctor/_components/doctor-document-tables";
import { PortalMobileCard } from "@/components/PortalMobileCard";

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

// ponytail: this component is currently unused within the appointment
// workspace (no caller renders it) — copy stays optional with an English
// fallback so it's safe if/when it gets wired up.
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

const TABLE_HEAD =
  "text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]";

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
          <p className="gh-status-warning mt-2 rounded-md border px-3 py-2 text-[12.5px]">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="mt-2 text-[12.5px] font-semibold text-[var(--portal-primary)]">
            {success}
          </p>
        ) : null}
      </div>

      {loading ? (
        <p className="px-4 py-3 text-[13px] text-[var(--portal-muted)]">{copy.loading}</p>
      ) : notes.length === 0 ? (
        <p className="px-4 py-3 text-[13px] text-[var(--portal-muted)]">{copy.empty}</p>
      ) : (
        <>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className={TABLE_HEAD}>
                <th className="px-3 py-2 text-left">{copy.colSessionDate}</th>
                <th className="px-3 py-2 text-left">{copy.colTime}</th>
                <th className="px-3 py-2 text-left">{copy.colOrderNumber}</th>
                <th className="px-3 py-2 text-left">{copy.colSessionType}</th>
                <th className="px-3 py-2 text-left">{copy.colDoctor}</th>
                <th className="px-3 py-2 text-left">{copy.colMedicalNotes}</th>
                <th className="px-3 py-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {notes.map((n) => (
                <Fragment key={n.id}>
                  <tr
                    className="cursor-pointer border-t border-[var(--portal-line)] hover:bg-[var(--portal-well)]"
                    onClick={() => setExpandedId(expandedId === n.id ? null : n.id)}
                  >
                    <td className="px-3 py-2.5 whitespace-nowrap">{session.sessionDate}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{session.sessionTime}</td>
                    <td className="px-3 py-2.5">{session.orderNumber}</td>
                    <td className="px-3 py-2.5">
                      <SessionTypeBadge label={session.consultationTypeLabel} />
                    </td>
                    <td className="px-3 py-2.5">{n.createdByName}</td>
                    <td className="max-w-[200px] truncate px-3 py-2.5 text-[var(--portal-muted)]">
                      {n.content.slice(0, 80)}
                      {n.content.length > 80 ? "…" : ""}
                    </td>
                    <td className="px-3 py-2.5">
                      {expandedId === n.id ? (
                        <ChevronDown className="size-4 text-[var(--portal-muted)]" />
                      ) : (
                        <ChevronRight className="size-4 text-[var(--portal-muted)]" />
                      )}
                    </td>
                  </tr>
                  {expandedId === n.id ? (
                    <tr className="border-t border-[var(--portal-line)] bg-[var(--portal-well)]">
                      <td colSpan={7} className="px-4 py-3 whitespace-pre-wrap">
                        {n.content}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-3 p-3 md:hidden">
          {notes.map((n) => (
            <PortalMobileCard
              key={n.id}
              title={session.orderNumber}
              subtitle={`${session.sessionDate} at ${session.sessionTime}`}
              statusPill={<SessionTypeBadge label={session.consultationTypeLabel} />}
              meta={[{ label: "Doctor", value: n.createdByName }]}
              actions={
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === n.id ? null : n.id)}
                  className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--portal-primary)]"
                >
                  {expandedId === n.id ? copy.hideNote : copy.viewNote}
                  {expandedId === n.id ? (
                    <ChevronDown className="size-3.5" />
                  ) : (
                    <ChevronRight className="size-3.5" />
                  )}
                </button>
              }
            >
              {expandedId === n.id ? (
                <p className="mt-2 whitespace-pre-wrap text-[13px] text-[var(--portal-text)]">
                  {n.content}
                </p>
              ) : (
                <p className="mt-2 truncate text-[13px] text-[var(--portal-muted)]">
                  {n.content.slice(0, 80)}
                  {n.content.length > 80 ? "…" : ""}
                </p>
              )}
            </PortalMobileCard>
          ))}
        </div>
        </>
      )}
    </HistorySection>
  );
}
