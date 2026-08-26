"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Check, Eye, MoreVertical, Pencil, QrCode, Send, Trash2 } from "lucide-react";
import {
  doctorApiErrorMessage,
  parseDoctorApiJson,
} from "@/lib/doctor-api-client";
import { HistorySection } from "@/app/(portal)/(doctor)/doctor/_components/doctor-document-tables";
import { GENERATED_DOCUMENT_TYPE_LABELS } from "@/lib/doctor-session-display";
import { AppMenu, AppMenuItem } from "@/components/AppMenu";
import {
  NOTIFICATION_LOCALES,
  NOTIFICATION_LOCALE_LABEL,
  type NotificationLocale,
} from "@/lib/notification-locale";

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

/**
 * Markets where a medicine prescription may be emailed to the patient as well
 * as filed for the national portal. Mirrors PRESCRIPTION_EMAIL_COUNTRIES in
 * backend/src/modules/generated-documents/document-template-utils.ts — the
 * backend re-checks it, this only decides whether the button is drawn.
 * `sp`/`rm` are this app's own codes for Spain/Romania; ISO `es`/`ro` appear on
 * imported rows.
 */
const PRESCRIPTION_EMAIL_COUNTRIES = ["cz", "sp", "es", "rm", "ro"];

function prescriptionEmailAllowed(countryCode: string | null): boolean {
  return PRESCRIPTION_EMAIL_COUNTRIES.includes((countryCode ?? "").toLowerCase().trim());
}

function canEmailDocument(documentType: string, countryCode: string | null): boolean {
  return (
    documentType === "EXAMS_PRESCRIPTION" ||
    documentType === "ABSENCE_CERTIFICATE" ||
    documentType === "OTHER" ||
    documentType === "CUSTOM_CERTIFICATE" ||
    (documentType === "PRESCRIPTION" && prescriptionEmailAllowed(countryCode))
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

export type DocumentsReviewSendPanelCopy = {
  title: string;
  noneWaiting: string;
  reviewEditHint: string;
  /** Replaces `reviewEditHint` in CZ/ES/RO, where medicine prescriptions send too. */
  reviewEditHintWithPrescription: string;
  sending: string;
  sendSelected: string;
  review: string;
  edit: string;
  send: string;
  sendPrescription: string;
  sendPrescriptionTitle: string;
  finalize: string;
  finalizeTitle: string;
  sendUploadLink: string;
  sendUploadLinkTitle: string;
  deleteAria: string;
  deleteConfirm: string;
  alreadySentTitle: string;
  sendFailed: string;
  noDocumentsSent: string;
  sentOneTo: string;
  sentManyTo: string;
  defaultPatient: string;
  couldNotSendUploadLink: string;
  uploadLinkSentWithWarnings: string;
  uploadLinkSent: string;
  noPhoneWarning: string;
  whatsappWarning: string;
  couldNotFinalize: string;
  finalizedSuccess: string;
  moreActions: string;
  uploadLinkLanguage: string;
  uploadLinkLanguageHint: string;
};

// ponytail: baked-in English default so the only current caller
// (appointment-documents-tab.tsx, owned by a parallel agent) keeps working
// without being edited here — swap for a required prop once that caller
// passes doctor.documentsReviewSendPanel through.
const DEFAULT_COPY: DocumentsReviewSendPanelCopy = {
  title: "Review & send",
  noneWaiting:
    "No documents waiting. Generate an exams prescription, medicine prescription, or absence certificate, then return here to review and edit before sending.",
  reviewEditHint:
    "Review and edit each PDF. Email send is available for exams and absence certificates only — medicine prescriptions are for your records and national portal submission.",
  reviewEditHintWithPrescription:
    "Review and edit each PDF before sending. In this market the medicine prescription can be emailed to the patient as well as filed for the national portal.",
  sending: "Sending…",
  sendSelected: "Send selected",
  review: "Review",
  edit: "Edit",
  send: "Send",
  sendPrescription: "Send prescription",
  sendPrescriptionTitle: "Email this medicine prescription to the patient",
  finalize: "Finalize",
  finalizeTitle: "Mark as finalized — moves to history",
  sendUploadLink: "Send upload link",
  sendUploadLinkTitle: "Email + WhatsApp the patient this prescription's upload link",
  deleteAria: "Delete",
  deleteConfirm: "Delete this draft document?",
  alreadySentTitle: "Already sent on this appointment",
  sendFailed:
    "Send failed — check GMAIL_SEND_FROM and GMAIL_SEND_REFRESH_TOKEN in backend .env.",
  noDocumentsSent: "No documents were sent. Configure email in backend .env.",
  sentOneTo: "Sent 1 document to {email}.",
  sentManyTo: "Sent {count} documents to {email}.",
  defaultPatient: "patient",
  couldNotSendUploadLink: "Could not send the upload link.",
  uploadLinkSentWithWarnings: "Upload link sent, but some channels failed: {labels}.",
  uploadLinkSent: "Upload link sent to {email} via email + WhatsApp.",
  noPhoneWarning: "no phone on file",
  whatsappWarning: "WhatsApp",
  couldNotFinalize: "Could not finalize the prescription.",
  finalizedSuccess: "Medicine prescription finalized and moved to history.",
  moreActions: "More document actions",
  uploadLinkLanguage: "Upload link language",
  uploadLinkLanguageHint:
    "Defaults to the language of the country this consultation was booked in.",
};

export function DocumentsReviewSendPanel({
  appointmentId,
  onDocumentsChange,
  onEditDraft,
  open,
  onOpenChange,
  notificationLocale = "EN",
  copy = DEFAULT_COPY,
}: {
  appointmentId: string;
  onDocumentsChange?: () => void;
  /** Open generate modal on the correct tab with draft fields pre-filled. */
  onEditDraft: (doc: ReviewQueueDoc) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Pre-selected language for the per-prescription upload link — the
   *  booking's own locale, else the booking country's. */
  notificationLocale?: NotificationLocale;
  copy?: DocumentsReviewSendPanelCopy;
}) {
  const [queue, setQueue] = useState<ReviewQueueDoc[]>([]);
  const [history, setHistory] = useState<ReviewQueueDoc[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [patientEmail, setPatientEmail] = useState<string | null>(null);
  // Country the consultation was booked in — decides whether the medicine
  // prescription gets a send button (CZ/ES/RO) or only finalize.
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Applies to the upload link only — sending the PDFs themselves is a
  // separate flow with its own copy.
  const [uploadLinkLocale, setUploadLinkLocale] =
    useState<NotificationLocale>(notificationLocale);

  const sendableQueue = useMemo(
    () => queue.filter((row) => canEmailDocument(row.documentType, countryCode)),
    [queue, countryCode],
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
    const ctxJson = await parseDoctorApiJson<{
      ok?: boolean;
      data?: { countryCode?: string; patient?: { email?: string } };
    }>(ctxRes);
    // Read the country before pruning the selection — otherwise a reload would
    // drop an already-ticked prescription on the first pass.
    const country = ctxJson?.ok ? ctxJson.data?.countryCode ?? null : null;
    if (country) setCountryCode(country);
    if (docsJson?.ok && docsJson.data) {
      setQueue(docsJson.data.queue ?? []);
      setHistory(docsJson.data.history ?? []);
      setSelected((prev) => {
        const next = new Set<string>();
        for (const id of prev) {
          const row = (docsJson.data!.queue ?? []).find((q) => q.id === id);
          if (row && canEmailDocument(row.documentType, country)) next.add(id);
        }
        return next;
      });
    }
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
        setError(doctorApiErrorMessage(res, json, copy.sendFailed));
        return;
      }
      const sent = json.data?.sentCount ?? 0;
      if (sent === 0) {
        setError(
          json.data?.errors?.[0] ?? json.message ?? copy.noDocumentsSent,
        );
        return;
      }
      setSelected(new Set());
      setSuccess(
        sent === 1
          ? copy.sentOneTo.replace("{email}", patientEmail ?? copy.defaultPatient)
          : copy.sentManyTo
              .replace("{count}", String(sent))
              .replace("{email}", patientEmail ?? copy.defaultPatient),
      );
      await load();
      onDocumentsChange?.();
    });
  }

  function sendSelected() {
    sendDocuments([...selected]);
  }

  function remove(id: string) {
    if (!confirm(copy.deleteConfirm)) return;
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
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ locale: uploadLinkLocale }),
        },
      );
      const json = await parseDoctorApiJson<{
        ok?: boolean;
        message?: string;
        data?: { deliveryWarnings?: string[] };
      }>(res);
      if (!res.ok || !json?.ok) {
        setError(doctorApiErrorMessage(res, json, copy.couldNotSendUploadLink));
        return;
      }
      const warnings = json.data?.deliveryWarnings ?? [];
      if (warnings.length > 0) {
        const labels = warnings
          .map((w) =>
            w === "no-phone" ? copy.noPhoneWarning : w === "whatsapp" ? copy.whatsappWarning : w,
          )
          .join(", ");
        setSuccess(copy.uploadLinkSentWithWarnings.replace("{labels}", labels));
      } else {
        setSuccess(
          copy.uploadLinkSent.replace("{email}", patientEmail ?? copy.defaultPatient),
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
        setError(doctorApiErrorMessage(res, json, copy.couldNotFinalize));
        return;
      }
      setSuccess(copy.finalizedSuccess);
      await load();
      onDocumentsChange?.();
    });
  }

  return (
    <HistorySection
      id="doctor-review-send-panel"
      title={copy.title}
      count={queue.length > 0 ? queue.length : undefined}
      pendingDot
      defaultOpen={false}
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="p-4">
        {error ? (
          <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-portal-label text-red-800">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="mb-3 text-portal-label font-semibold text-[var(--portal-primary)]">
            {success}
          </p>
        ) : null}

        {/* Applies to every "send upload link" action below — queue rows and
            already-sent history rows alike. */}
        {queue.length > 0 || history.length > 0 ? (
          <label className="mb-3 grid max-w-xs gap-1">
            <span className="gh-field-label">{copy.uploadLinkLanguage}</span>
            <select
              className="gh-select"
              value={uploadLinkLocale}
              disabled={pending}
              onChange={(e) => setUploadLinkLocale(e.target.value as NotificationLocale)}
            >
              {NOTIFICATION_LOCALES.map((code) => (
                <option key={code} value={code}>
                  {NOTIFICATION_LOCALE_LABEL[code]}
                </option>
              ))}
            </select>
            <span className="text-portal-meta text-[var(--portal-muted)]">
              {copy.uploadLinkLanguageHint}
            </span>
          </label>
        ) : null}

        {queue.length === 0 ? (
          <p className="text-portal-compact text-[var(--portal-muted)]">
            {copy.noneWaiting}
          </p>
        ) : (
          <>
            <p className="mb-3 text-portal-compact text-[var(--portal-muted)]">
              {prescriptionEmailAllowed(countryCode)
                ? copy.reviewEditHintWithPrescription
                : copy.reviewEditHint}
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
                  {pending ? copy.sending : copy.sendSelected}
                </button>
              </div>
            ) : null}
            <ul className="gh-doctor-review-list divide-y divide-[var(--portal-line)] rounded-md border border-[var(--portal-line)]">
              {queue.map((row) => {
                const sendable = canEmailDocument(row.documentType, countryCode);
                const isPrescription = row.documentType === "PRESCRIPTION";
                const sendLabel = isPrescription ? copy.sendPrescription : copy.send;
                const sendTitle = isPrescription ? copy.sendPrescriptionTitle : undefined;
                return (
                  <li
                    key={row.id}
                    className="gh-doctor-review-row flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-portal-compact"
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
                      <span className="truncate" title={`${docRowLabel(row)} · ${row.fileName}`}>
                        {docRowLabel(row)} · {row.fileName}
                      </span>
                    </label>
                    <div className="gh-doctor-review-actions hidden shrink-0 flex-wrap items-center gap-1 md:flex">
                      <a
                        href={`/api/doctor/documents/generated/${row.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="gh-btn gh-btn-soft px-2 py-1 text-portal-thead"
                      >
                        <Eye className="size-3" aria-hidden /> {copy.review}
                      </a>
                      <button
                        type="button"
                        onClick={() => onEditDraft(row)}
                        className="gh-btn gh-btn-soft px-2 py-1 text-portal-thead"
                      >
                        <Pencil className="size-3" aria-hidden /> {copy.edit}
                      </button>
                      {sendable ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => sendDocuments([row.id])}
                          className="gh-btn gh-btn-soft px-2 py-1 text-portal-thead"
                          title={sendTitle}
                        >
                          <Send className="size-3" aria-hidden /> {sendLabel}
                        </button>
                      ) : null}
                      {canFinalize(row.documentType) ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => finalizeDocument(row.id)}
                          className="gh-btn gh-btn-soft px-2 py-1 text-portal-thead"
                          title={copy.finalizeTitle}
                        >
                          <Check className="size-3" aria-hidden /> {copy.finalize}
                        </button>
                      ) : null}
                      {hasUploadLink(row.documentType) ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => sendUploadLink(row.id)}
                          className="gh-btn gh-btn-soft px-2 py-1 text-portal-thead"
                          title={copy.sendUploadLinkTitle}
                        >
                          <QrCode className="size-3" aria-hidden /> {copy.sendUploadLink}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => remove(row.id)}
                        className="p-1 text-[var(--portal-muted)] hover:text-red-700"
                        aria-label={copy.deleteAria}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div className="md:hidden">
                      <div className="flex items-center gap-1">
                        <a
                          href={`/api/doctor/documents/generated/${row.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="gh-btn gh-btn-soft px-2 py-1 text-portal-thead"
                        >
                          <Eye className="size-3" aria-hidden /> {copy.review}
                        </a>
                        <button type="button" onClick={() => onEditDraft(row)} className="gh-btn gh-btn-soft px-2 py-1 text-portal-thead">
                          <Pencil className="size-3" aria-hidden /> {copy.edit}
                        </button>
                        {sendable ? (
                          <button type="button" disabled={pending} onClick={() => sendDocuments([row.id])} className="gh-btn gh-btn-soft px-2 py-1 text-portal-thead" title={sendTitle}>
                            <Send className="size-3" aria-hidden /> {sendLabel}
                          </button>
                        ) : null}
                        <AppMenu contentClassName="gh-portal-menu-content min-w-[180px] p-1.5" trigger={<button type="button" aria-label={copy.moreActions} className="gh-btn gh-btn-soft px-2 py-1"><MoreVertical className="size-3.5" aria-hidden /></button>}>
                          {canFinalize(row.documentType) ? <AppMenuItem asChild><button type="button" disabled={pending} className="gh-portal-menu-item" onClick={() => finalizeDocument(row.id)}>{copy.finalize}</button></AppMenuItem> : null}
                          {hasUploadLink(row.documentType) ? <AppMenuItem asChild><button type="button" disabled={pending} className="gh-portal-menu-item" onClick={() => sendUploadLink(row.id)}>{copy.sendUploadLink}</button></AppMenuItem> : null}
                          <AppMenuItem asChild><button type="button" className="gh-portal-menu-item text-red-700" onClick={() => remove(row.id)}>{copy.deleteAria}</button></AppMenuItem>
                        </AppMenu>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {history.length > 0 ? (
          <div className="mt-4 border-t border-[var(--portal-line)] pt-4">
            <h4 className="text-portal-compact font-bold text-[var(--portal-text)]">
              {copy.alreadySentTitle}
            </h4>
            <ul className="mt-2 space-y-1 text-portal-compact text-[var(--portal-muted)]">
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
                      className="gh-btn gh-btn-soft px-2 py-0.5 text-portal-thead"
                      title={copy.sendUploadLinkTitle}
                    >
                      <QrCode className="size-3" aria-hidden /> {copy.sendUploadLink}
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
