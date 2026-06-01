"use client";

import { Fragment, useCallback, useEffect, useState, useTransition } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  doctorApiErrorMessage,
  parseDoctorApiJson,
} from "@/lib/doctor-api-client";
import { HistorySection, SessionTypeBadge, type SessionMeta } from "@/app/(doctor)/doctor/_components/doctor-document-tables";

type MedicalNoteRow = {
  id: string;
  content: string;
  consultationType: string | null;
  createdByName: string;
  createdAt: string;
};

const TABLE_HEAD =
  "text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]";

export function AppointmentMedicalNotesSection({
  appointmentId,
  session,
}: {
  appointmentId: string;
  session: SessionMeta;
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
        doctorApiErrorMessage(res, json, "Could not load medical notes."),
      );
      setNotes([]);
    } else if (json.data?.items) {
      setNotes(json.data.items);
    }
    setLoading(false);
  }, [appointmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  function saveNote() {
    setError(null);
    setSuccess(null);
    if (!noteText.trim()) {
      setError("Enter a medical note.");
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
            "Could not save medical note. Restart the backend if this persists.",
          ),
        );
        return;
      }
      setNoteText("");
      setSuccess("Medical note saved.");
      await load();
    });
  }

  return (
    <HistorySection title="Medical notes" count={notes.length}>
      <div className="border-b border-[var(--color-border)] p-4">
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">Add medical note</span>
          <textarea
            className="gh-input min-h-[80px]"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Clinical notes for this session (not sent as PDF — stored in patient history)"
            maxLength={50000}
          />
        </label>
        <button
          type="button"
          onClick={() => void saveNote()}
          disabled={pending}
          className="gh-btn gh-btn-primary mt-2 text-sm"
        >
          {pending ? "Saving…" : "Save medical note"}
        </button>
        {error ? (
          <p className="gh-status-warning mt-2 rounded-md border px-3 py-2 text-[12.5px]">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="mt-2 text-[12.5px] font-semibold text-[var(--color-brand-primary)]">
            {success}
          </p>
        ) : null}
      </div>

      {loading ? (
        <p className="px-4 py-3 text-[13px] text-[var(--color-text-muted)]">Loading notes…</p>
      ) : notes.length === 0 ? (
        <p className="px-4 py-3 text-[13px] text-[var(--color-text-muted)]">
          No medical notes yet for this appointment.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className={TABLE_HEAD}>
                <th className="px-3 py-2 text-left">Session date</th>
                <th className="px-3 py-2 text-left">Time</th>
                <th className="px-3 py-2 text-left">Order #</th>
                <th className="px-3 py-2 text-left">Session type</th>
                <th className="px-3 py-2 text-left">Doctor</th>
                <th className="px-3 py-2 text-left">Medical notes</th>
                <th className="px-3 py-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {notes.map((n) => (
                <Fragment key={n.id}>
                  <tr
                    className="cursor-pointer border-t border-[var(--color-border)] hover:bg-[var(--color-background-soft)]"
                    onClick={() => setExpandedId(expandedId === n.id ? null : n.id)}
                  >
                    <td className="px-3 py-2.5 whitespace-nowrap">{session.sessionDate}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{session.sessionTime}</td>
                    <td className="px-3 py-2.5">{session.orderNumber}</td>
                    <td className="px-3 py-2.5">
                      <SessionTypeBadge label={session.consultationTypeLabel} />
                    </td>
                    <td className="px-3 py-2.5">{n.createdByName}</td>
                    <td className="max-w-[200px] truncate px-3 py-2.5 text-[var(--color-text-muted)]">
                      {n.content.slice(0, 80)}
                      {n.content.length > 80 ? "…" : ""}
                    </td>
                    <td className="px-3 py-2.5">
                      {expandedId === n.id ? (
                        <ChevronDown className="size-4 text-[var(--color-text-muted)]" />
                      ) : (
                        <ChevronRight className="size-4 text-[var(--color-text-muted)]" />
                      )}
                    </td>
                  </tr>
                  {expandedId === n.id ? (
                    <tr className="border-t border-[var(--color-border)] bg-[var(--color-background-soft)]">
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
      )}
    </HistorySection>
  );
}
