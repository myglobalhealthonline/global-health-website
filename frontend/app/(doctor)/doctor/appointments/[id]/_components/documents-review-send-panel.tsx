"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Check, Eye, Pencil, QrCode, Send, Trash2 } from "lucide-react";
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
  prescriptionNumber?: number | null;
  hasUploadLink?: boolean;
};

function canEmailDocument(documentType: string): boolean {
  return (
    documentType === "EXAMS_PRESCRIPTION" ||
    documentType === "ABSENCE_CERTIFICATE" ||
    documentType === "OTHER" ||
    documentType === "CUSTOM_CERTIFICATE"
  );
}

function canFinalize(documentType: string): boolean {
  return documentType === "PRESCRIPTION";
}

/** Exams prescriptions carry a per-prescription patient-upload link + QR. */
function hasUploadLink(documentType: string): boolean {
  return documentType === "EXAMS_PRESCRIPTION";
}

/** "Exams prescription #2" when a prescription number is present. */
function docRowLabel(row: ReviewQueueDoc): string {
  const base = GENERATED_DOCUMENT_TYPE_LABELS[row.documentType] ?? row.documentType;
  return row.prescriptionNumber != null ? `${base} #${row.prescriptionNumber}` : base;
}

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

  const sendableQueue = useMemo(
    () => queue.filter((row) => canEmailDocument(row.documentType)),
    [queue],
  );

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
          const row = (docsJson.data!.queue ?? []).find((q) => q.id === id);
          if (row && canEmailDocument(row.documentType)) next.add(id);
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
    // Fetch-on-mount/dep-change — load itself is the setState source.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function sendDocuments(documentIds: string[]) {
    const sendIds = documentIds.filter((id) =>
      sendableQueue.some((q) => q.id === id),
    );
    if (sendIds.length === 0) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await fetch(
        `/api/doctor/appointments/${appointmentId}/documents-send`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ documentIds: sendIds }),
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

  function sendUploadLink(id: string) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await fetch(
        `/api/doctor/documents/generated/${id}/send-upload-link`,
        { method: "POST" },
      );
      const json = await parseDoctorApiJson<{
        ok?: boolean;
        message?: string;
        data?: { deliveryWarnings?: string[] };
      }>(res);
      if (!res.ok || !json?.ok) {
        setError(doctorApiErrorMessage(res, json, "Could not send the upload link."));
        return;
      }
      const warnings = json.data?.deliveryWarnings ?? [];
      if (warnings.length > 0) {
        const labels = warnings
          .map((w) =>
            w === "no-phone" ? "no phone on file" : w === "whatsapp" ? "WhatsApp" : w,
          )
          .join(", ");
        setSuccess(`Upload link sent, but some channels failed: ${labels}.`);
      } else {
        setSuccess(
          `Upload link sent to ${patientEmail ?? "patient"} via email + WhatsApp.`,
        );
      }
    });
  }

  function finalizeDocument(id: string) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await fetch(`/api/doctor/documents/generated/${id}/finalize`, { method: "POST" });
      const json = await parseDoctorApiJson<{ ok?: boolean; message?: string }>(res);
      if (!res.ok || !json?.ok) {
        setError(doctorApiErrorMessage(res, json, "Could not finalize the prescription."));
        return;
      }
      setSuccess("Medicine prescription finalized and moved to history.");
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
          <p className="mb-3 text-[12.5px] font-semibold text-[var(--portal-primary)]">
            {success}
          </p>
        ) : null}

        {queue.length === 0 ? (
          <p className="text-[13px] text-[var(--portal-muted)]">
            No documents waiting. Generate an exams prescription, medicine prescription, or
            absence certificate, then return here to review and edit before sending.
          </p>
        ) : (
          <>
            <p className="mb-3 text-[13px] text-[var(--portal-muted)]">
              Review and edit each PDF. Email send is available for exams and absence certificates
              only — medicine prescriptions are for your records and national portal submission.
            </p>
            {sendableQueue.length > 0 ? (
              <div className="gh-doctor-review-toolbar mb-3 flex justify-end">
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
            ) : null}
            <ul className="gh-doctor-review-list divide-y divide-[var(--portal-line)] rounded-md border border-[var(--portal-line)]">
              {queue.map((row) => {
                const sendable = canEmailDocument(row.documentType);
                return (
                  <li
                    key={row.id}
                    className="gh-doctor-review-row flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-[13px]"
                  >
                    <label className="flex min-w-0 flex-1 items-center gap-2">
                      {sendable ? (
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
                      ) : (
                        <span className="inline-block w-4 shrink-0" aria-hidden />
                      )}
                      <span className="truncate">
                        {docRowLabel(row)} · {row.fileName}
                      </span>
                    </label>
                    <div className="gh-doctor-review-actions flex shrink-0 flex-wrap items-center gap-1">
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
                      {sendable ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => sendDocuments([row.id])}
                          className="gh-btn gh-btn-soft px-2 py-1 text-[11px]"
                        >
                          <Send className="size-3" aria-hidden /> Send
                        </button>
                      ) : null}
                      {canFinalize(row.documentType) ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => finalizeDocument(row.id)}
                          className="gh-btn gh-btn-soft px-2 py-1 text-[11px]"
                          title="Mark as finalized — moves to history"
                        >
                          <Check className="size-3" aria-hidden /> Finalize
                        </button>
                      ) : null}
                      {hasUploadLink(row.documentType) ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => sendUploadLink(row.id)}
                          className="gh-btn gh-btn-soft px-2 py-1 text-[11px]"
                          title="Email + WhatsApp the patient this prescription's upload link"
                        >
                          <QrCode className="size-3" aria-hidden /> Send upload link
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => remove(row.id)}
                        className="p-1 text-[var(--portal-muted)] hover:text-red-700"
                        aria-label="Delete"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {history.length > 0 ? (
          <div className="mt-4 border-t border-[var(--portal-line)] pt-4">
            <h4 className="text-[13px] font-bold text-[var(--portal-text)]">
              Already sent on this appointment
            </h4>
            <ul className="mt-2 space-y-1 text-[13px] text-[var(--portal-muted)]">
              {history.map((row) => (
                <li key={row.id} className="gh-doctor-review-history-row flex flex-wrap items-center gap-2">
                  <a
                    href={`/api/doctor/documents/generated/${row.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[var(--portal-primary)] hover:underline"
                  >
                    {docRowLabel(row)} · {row.fileName}
                  </a>
                  {hasUploadLink(row.documentType) ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => sendUploadLink(row.id)}
                      className="gh-btn gh-btn-soft px-2 py-0.5 text-[11px]"
                      title="Email + WhatsApp the patient this prescription's upload link"
                    >
                      <QrCode className="size-3" aria-hidden /> Send upload link
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </HistorySection>
  );
}
