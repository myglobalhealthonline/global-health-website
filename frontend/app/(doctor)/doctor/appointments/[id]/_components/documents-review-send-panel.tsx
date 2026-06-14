"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Eye, Pencil, Send, Trash2 } from "lucide-react";
import {
  doctorApiErrorMessage,
  parseDoctorApiJson,
} from "@/lib/doctor-api-client";
import { HistorySection } from "@/app/(doctor)/doctor/_components/doctor-document-tables";
import { GENERATED_DOCUMENT_TYPE_LABELS } from "@/lib/doctor-session-display";

export type ReviewQueueDoc = {
  id: string;
  documentType: string;
  fileName: string;
  sentToPatient: boolean;
  createdAt: string;
  metadata?: Record<string, string> | null;
};

export function DocumentsReviewSendPanel({
  appointmentId,
  onDocumentsChange,
  onEditDraft,
  open,
  onOpenChange,
}: {
  appointmentId: string;
  onDocumentsChange?: () => void;
  /** Open generate modal on the correct tab with draft fields pre-filled. */
  onEditDraft: (doc: ReviewQueueDoc) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [queue, setQueue] = useState<ReviewQueueDoc[]>([]);
  const [history, setHistory] = useState<ReviewQueueDoc[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [patientEmail, setPatientEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const [docsRes, ctxRes] = await Promise.all([
      fetch(`/api/doctor/appointments/${appointmentId}/documents-generated`),
      fetch(`/api/doctor/appointments/${appointmentId}/documents-context`),
    ]);
    const docsJson = await parseDoctorApiJson<{
      ok?: boolean;
      data?: { queue?: ReviewQueueDoc[]; history?: ReviewQueueDoc[] };
    }>(docsRes);
    if (docsJson?.ok && docsJson.data) {
      setQueue(docsJson.data.queue ?? []);
      setHistory(docsJson.data.history ?? []);
      setSelected((prev) => {
        const next = new Set<string>();
        for (const id of prev) {
          if ((docsJson.data!.queue ?? []).some((q) => q.id === id)) next.add(id);
        }
        return next;
      });
    }
    const ctxJson = await parseDoctorApiJson<{
      ok?: boolean;
      data?: { patient?: { email?: string } };
    }>(ctxRes);
    if (ctxJson?.ok && ctxJson.data?.patient?.email) {
      setPatientEmail(ctxJson.data.patient.email);
    }
  }, [appointmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  function sendDocuments(documentIds: string[]) {
    const ids = documentIds.filter((id) => queue.some((q) => q.id === id));
    if (ids.length === 0) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await fetch(
        `/api/doctor/appointments/${appointmentId}/documents-send`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ documentIds: ids }),
        },
      );
      const json = await parseDoctorApiJson<{
        ok?: boolean;
        message?: string;
        data?: { sentCount?: number; errors?: string[] };
      }>(res);
      if (!res.ok || !json?.ok) {
        setError(
          doctorApiErrorMessage(
            res,
            json,
            "Send failed — check GMAIL_SEND_FROM and GMAIL_SEND_REFRESH_TOKEN in backend .env.",
          ),
        );
        return;
      }
      const sent = json.data?.sentCount ?? 0;
      if (sent === 0) {
        setError(
          json.data?.errors?.[0] ??
            json.message ??
            "No documents were sent. Configure email in backend .env.",
        );
        return;
      }
      setSelected(new Set());
      setSuccess(
        sent === 1
          ? `Sent 1 document to ${patientEmail ?? "patient"}.`
          : `Sent ${sent} documents to ${patientEmail ?? "patient"}.`,
      );
      await load();
      onDocumentsChange?.();
    });
  }

  function sendSelected() {
    sendDocuments([...selected]);
  }

  function remove(id: string) {
    if (!confirm("Delete this draft document?")) return;
    startTransition(async () => {
      await fetch(`/api/doctor/documents/generated/${id}`, { method: "DELETE" });
      await load();
      onDocumentsChange?.();
    });
  }

  return (
    <HistorySection
      id="doctor-review-send-panel"
      title="Review & send"
      count={queue.length > 0 ? queue.length : undefined}
      pendingDot
      defaultOpen={false}
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="p-4">
        {error ? (
          <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-800">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="mb-3 text-[12.5px] font-semibold text-[var(--color-brand-primary)]">
            {success}
          </p>
        ) : null}

        {queue.length === 0 ? (
          <p className="text-[13px] text-[var(--color-text-muted)]">
            No documents waiting to send. Generate an exams prescription, medicine prescription,
            or absence certificate, then return here to review, edit, and email the patient.
          </p>
        ) : (
          <>
            <p className="mb-3 text-[13px] text-[var(--color-text-muted)]">
              Review each PDF, edit if needed, then send to the patient by email.
            </p>
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                disabled={pending || selected.size === 0}
                onClick={sendSelected}
                className="gh-btn gh-btn-primary text-sm"
              >
                <Send className="size-3.5" aria-hidden />
                {pending ? "Sending…" : "Send selected"}
              </button>
            </div>
            <ul className="divide-y divide-[var(--color-border)] rounded-md border border-[var(--color-border)]">
              {queue.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-[13px]"
                >
                  <label className="flex min-w-0 flex-1 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={(e) => {
                        const next = new Set(selected);
                        if (e.target.checked) next.add(row.id);
                        else next.delete(row.id);
                        setSelected(next);
                      }}
                    />
                    <span className="truncate">
                      {GENERATED_DOCUMENT_TYPE_LABELS[row.documentType] ?? row.documentType} ·{" "}
                      {row.fileName}
                    </span>
                  </label>
                  <div className="flex shrink-0 flex-wrap items-center gap-1">
                    <a
                      href={`/api/doctor/documents/generated/${row.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="gh-btn gh-btn-soft px-2 py-1 text-[11px]"
                    >
                      <Eye className="size-3" aria-hidden /> Review
                    </a>
                    <button
                      type="button"
                      onClick={() => onEditDraft(row)}
                      className="gh-btn gh-btn-soft px-2 py-1 text-[11px]"
                    >
                      <Pencil className="size-3" aria-hidden /> Edit
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => sendDocuments([row.id])}
                      className="gh-btn gh-btn-soft px-2 py-1 text-[11px]"
                    >
                      <Send className="size-3" aria-hidden /> Send
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(row.id)}
                      className="p-1 text-[var(--color-text-muted)] hover:text-red-700"
                      aria-label="Delete"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {history.length > 0 ? (
          <div className="mt-4 border-t border-[var(--color-border)] pt-4">
            <h4 className="text-[13px] font-bold text-[var(--color-text-primary)]">
              Already sent on this appointment
            </h4>
            <ul className="mt-2 space-y-1 text-[13px] text-[var(--color-text-muted)]">
              {history.map((row) => (
                <li key={row.id}>
                  <a
                    href={`/api/doctor/documents/generated/${row.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[var(--color-brand-primary)] hover:underline"
                  >
                    {row.fileName}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </HistorySection>
  );
}
