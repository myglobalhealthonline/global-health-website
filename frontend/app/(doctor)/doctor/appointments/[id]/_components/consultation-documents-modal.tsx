"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  doctorApiErrorMessage,
  parseDoctorApiJson,
} from "@/lib/doctor-api-client";
import {
  focusDoctorReviewSend,
  openDoctorPdfInNewTab,
} from "@/lib/doctor-appointment-ui";
import {
  ChevronRight,
  ClipboardList,
  FileText,
  Loader2,
  Pill,
  Stethoscope,
  X,
} from "lucide-react";
import { type DocumentContext } from "./document-context-banner";

export type ConsultationDocTabId = "overview" | "exams" | "medicine" | "absence";

export type EditDraftDoc = {
  id: string;
  documentType: string;
  metadata?: Record<string, string> | null;
};

export function tabForGeneratedDocumentType(documentType: string): ConsultationDocTabId {
  switch (documentType) {
    case "EXAMS_PRESCRIPTION":
      return "exams";
    case "PRESCRIPTION":
      return "medicine";
    case "ABSENCE_CERTIFICATE":
      return "absence";
    default:
      return "overview";
  }
}

function applyEditDraftToForm(
  draft: EditDraftDoc,
  setters: {
    setEditingDocId: (id: string) => void;
    setTab: (tab: ConsultationDocTabId) => void;
    setExams: (v: string) => void;
    setExamsNotes: (v: string) => void;
    setMeds: (v: string[]) => void;
    setPharmacy: (v: string) => void;
    setStartDate: (v: string) => void;
    setEndDate: (v: string) => void;
    setAbsenceReason: (v: string) => void;
  },
) {
  const meta = draft.metadata ?? {};
  setters.setEditingDocId(draft.id);
  setters.setTab(tabForGeneratedDocumentType(draft.documentType));

  if (draft.documentType === "EXAMS_PRESCRIPTION") {
    setters.setExams(meta.exams ?? "");
    setters.setExamsNotes(meta.notes ?? "");
    return;
  }

  if (draft.documentType === "PRESCRIPTION") {
    const medLines: string[] = [];
    for (let i = 1; i <= 7; i++) {
      const m = meta[`medication${i}`]?.trim();
      if (m) medLines.push(m);
    }
    setters.setMeds(medLines.length > 0 ? medLines : [""]);
    setters.setPharmacy(meta.pharmacy ?? "");
    return;
  }

  if (draft.documentType === "ABSENCE_CERTIFICATE") {
    setters.setStartDate(meta.startDate ?? "");
    setters.setEndDate(meta.endDate ?? "");
    setters.setAbsenceReason(meta.reason ?? "");
  }
}

const TABS: { id: ConsultationDocTabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "exams", label: "Exams" },
  { id: "medicine", label: "Prescription" },
  { id: "absence", label: "Absence" },
];

export function ConsultationDocumentsModal({
  appointmentId,
  open,
  onClose,
  initialTab,
  editDraft,
  onDocumentsChange,
}: {
  appointmentId: string;
  open: boolean;
  onClose: () => void;
  initialTab?: ConsultationDocTabId;
  /** Pre-fill form fields when editing a draft from Review & send. */
  editDraft?: EditDraftDoc | null;
  onDocumentsChange?: () => void;
}) {
  const [tab, setTab] = useState<ConsultationDocTabId>(initialTab ?? "overview");
  const [context, setContext] = useState<DocumentContext | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const [exams, setExams] = useState("");
  const [examsNotes, setExamsNotes] = useState("");
  const [meds, setMeds] = useState<string[]>([""]);
  const [pharmacy, setPharmacy] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [absenceReason, setAbsenceReason] = useState("");

  const loadContext = useCallback(async () => {
    setContextLoading(true);
    try {
      const res = await fetch(
        `/api/doctor/appointments/${appointmentId}/documents-context`,
      );
      const json = await parseDoctorApiJson<{ ok?: boolean; data?: DocumentContext }>(res);
      if (!json) {
        setError(doctorApiErrorMessage(res, null, "Could not load patient context."));
        return;
      }
      if (json.ok && json.data) {
        setContext(json.data);
        setPharmacy((prev) => prev || json.data!.patient.pharmacy || "");
      } else {
        setError(doctorApiErrorMessage(res, json, "Could not load patient context."));
      }
    } finally {
      setContextLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSuccess(null);
    void loadContext();
    if (editDraft) {
      applyEditDraftToForm(editDraft, {
        setEditingDocId,
        setTab,
        setExams,
        setExamsNotes,
        setMeds,
        setPharmacy,
        setStartDate,
        setEndDate,
        setAbsenceReason,
      });
    } else {
      setEditingDocId(null);
      setExams("");
      setExamsNotes("");
      setMeds([""]);
      setStartDate("");
      setEndDate("");
      setAbsenceReason("");
      if (initialTab) setTab(initialTab);
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, loadContext, initialTab, editDraft, onClose]);

  useEffect(() => {
    if (!open || editDraft || !context?.patient.pharmacy) return;
    setPharmacy((prev) => prev || context.patient.pharmacy || "");
  }, [open, editDraft, context?.patient.pharmacy]);

  function buildFields(
    type: string,
    fields: Record<string, string>,
  ): { type: string; fields: Record<string, string>; editDocumentId?: string } {
    const payload: {
      type: string;
      fields: Record<string, string>;
      editDocumentId?: string;
    } = { type, fields };
    if (editingDocId) payload.editDocumentId = editingDocId;
    return payload;
  }

  async function generate(type: string, fields: Record<string, string>) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const res = await fetch(
        `/api/doctor/appointments/${appointmentId}/documents-generate`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(buildFields(type, fields)),
        },
      );
      const json = await parseDoctorApiJson<{
        ok?: boolean;
        message?: string;
        data?: {
          pdfUrl?: string;
          document?: { id: string };
          healthPortalUrl?: string | null;
          healthPortalLabel?: string | null;
        };
      }>(res);
      if (!res.ok || !json?.ok) {
        setError(doctorApiErrorMessage(res, json, "Generate failed"));
        return;
      }
      setEditingDocId(null);
      onDocumentsChange?.();
      const pdfUrl =
        json.data?.pdfUrl ??
        (json.data?.document?.id
          ? `/api/doctor/documents/generated/${json.data.document.id}/pdf`
          : null);
      if (pdfUrl) {
        openDoctorPdfInNewTab(pdfUrl);
      }
      onClose();
      focusDoctorReviewSend();
      if (type === "PRESCRIPTION" && json.data?.healthPortalUrl) {
        setSuccess(
          pdfUrl
            ? `PDF opened — review and send below, then submit via ${json.data.healthPortalLabel ?? "national portal"}.`
            : "Document generated — review and send below.",
        );
      } else if (
        type === "PRESCRIPTION" ||
        type === "EXAMS_PRESCRIPTION" ||
        type === "ABSENCE_CERTIFICATE"
      ) {
        setSuccess(
          pdfUrl
            ? "PDF opened in a new tab — review and send below when ready."
            : "Document generated — open Review & send below.",
        );
      } else {
        setSuccess(pdfUrl ? "PDF generated and opened." : "Document generated.");
      }
    });
  }

  function generateExams() {
    if (!exams.trim()) {
      setError("Enter at least one examination.");
      return;
    }
    void generate("EXAMS_PRESCRIPTION", {
      exams: exams.trim(),
      ...(examsNotes.trim() ? { notes: examsNotes.trim() } : {}),
    });
  }

  function generateMedicine() {
    const fields: Record<string, string> = {};
    meds.forEach((m, i) => {
      const v = m.trim();
      if (v) fields[`medication${i + 1}`] = v;
    });
    if (!fields.medication1) {
      setError("Enter at least one medication.");
      return;
    }
    if (pharmacy.trim()) fields.pharmacy = pharmacy.trim();
    void generate("PRESCRIPTION", fields);
  }

  function generateAbsence() {
    if (!endDate.trim()) {
      setError("End date is required.");
      return;
    }
    void generate("ABSENCE_CERTIFICATE", {
      ...(startDate.trim() ? { startDate: startDate.trim() } : {}),
      endDate: endDate.trim(),
      ...(absenceReason.trim() ? { reason: absenceReason.trim() } : {}),
    });
  }

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consultation-docs-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/75"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[min(92vh,900px)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-white px-4 py-3">
          <div>
            <h2
              id="consultation-docs-title"
              className="text-lg font-bold text-[var(--color-text-primary)]"
            >
              Consultation documents
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Patient &amp; prescriber details are filled from records — enter clinical
              content only.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-background-soft)]"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex shrink-0 flex-wrap gap-1 border-b border-[var(--color-border)] bg-white px-3 py-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                tab === t.id
                  ? "bg-[var(--color-brand-primary)] text-white"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-background-soft)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-white p-4">
          {error ? <p className="mb-3 text-sm text-red-700">{error}</p> : null}
          {success ? <p className="mb-3 text-sm text-emerald-700">{success}</p> : null}
          {editingDocId ? (
            <p className="mb-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
              Editing a draft — generate again to replace the PDF.
            </p>
          ) : null}

          {contextLoading ? (
            <p className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading…
            </p>
          ) : context && tab === "overview" ? (
            <div className="mb-4 space-y-2">
              {!context.hasDocxTemplate ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Branded Word templates are not available for {context.countryLabel};
                  PDFs use the HTML layout instead.
                </p>
              ) : null}
              {context.doctor.registrationMissing ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Add your {context.countryLabel} registration in your doctor profile so it
                  appears on generated documents.
                </p>
              ) : null}
            </div>
          ) : null}

          {(tab === "exams" || tab === "medicine" || tab === "absence") && !contextLoading ? (
            <p className="mb-3 text-xs text-[var(--color-text-muted)]">
              Patient and prescriber details from records are applied to the PDF automatically
              — enter clinical content only.
            </p>
          ) : null}

          {tab === "overview" ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-text-muted)]">
                Choose a document type. Only the fields below need your input; name,
                address, dates, and registration are applied automatically.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <OverviewCard
                  icon={ClipboardList}
                  title="Exams prescription"
                  description="List tests or imaging — send from Documents tab after review."
                  onClick={() => setTab("exams")}
                />
                <OverviewCard
                  icon={Pill}
                  title="Medicine prescription"
                  description="Up to 7 lines — review and send, or submit via national portal."
                  onClick={() => setTab("medicine")}
                />
                <OverviewCard
                  icon={Stethoscope}
                  title="Absence certificate"
                  description="Unfit for work dates — send from Documents tab after review."
                  onClick={() => setTab("absence")}
                />
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                Medical notes and Review &amp; send live on the Documents tab (not in this
                dialog).
              </p>
            </div>
          ) : null}

          {tab === "exams" ? (
            <div className="space-y-3">
              <label className="block text-sm font-semibold">
                Examinations requested <span className="text-red-600">*</span>
              </label>
              <p className="text-xs text-[var(--color-text-muted)]">One test per line</p>
              <textarea
                value={exams}
                onChange={(e) => setExams(e.target.value)}
                rows={5}
                className="gh-input w-full"
                placeholder={"Full blood count\nChest X-Ray"}
              />
              <label className="block text-sm font-semibold">Additional notes (optional)</label>
              <textarea
                value={examsNotes}
                onChange={(e) => setExamsNotes(e.target.value)}
                rows={2}
                className="gh-input w-full"
                placeholder="e.g. Fasting from midnight"
              />
              <button
                type="button"
                disabled={pending}
                onClick={generateExams}
                className="gh-btn gh-btn-primary text-sm"
              >
                {pending ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <FileText className="size-3.5" aria-hidden />
                )}
                Generate PDF
              </button>
            </div>
          ) : null}

          {tab === "medicine" ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-text-muted)]">
                PDF for the patient record — review and send by email below, or submit via your
                national health portal when required.
              </p>
              {meds.map((m, i) => (
                <input
                  key={i}
                  type="text"
                  value={m}
                  onChange={(e) => {
                    const next = [...meds];
                    next[i] = e.target.value;
                    setMeds(next);
                  }}
                  placeholder={i === 0 ? "Medication 1 (required)" : `Medication ${i + 1}`}
                  className="gh-input w-full"
                />
              ))}
              {meds.length < 7 ? (
                <button
                  type="button"
                  className="text-xs font-semibold text-[var(--color-brand-primary)]"
                  onClick={() => setMeds([...meds, ""])}
                >
                  + Add medication
                </button>
              ) : null}
              <label className="block text-sm font-semibold">Pharmacy (optional)</label>
              <input
                type="text"
                value={pharmacy}
                onChange={(e) => setPharmacy(e.target.value)}
                placeholder={
                  context?.patient.pharmacy
                    ? `From booking: ${context.patient.pharmacy}`
                    : "Pharmacy name and location"
                }
                className="gh-input w-full"
              />
              <button
                type="button"
                disabled={pending}
                onClick={generateMedicine}
                className="gh-btn gh-btn-primary text-sm"
              >
                {pending ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <FileText className="size-3.5" aria-hidden />
                )}
                Generate PDF
              </button>
            </div>
          ) : null}

          {tab === "absence" ? (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold">Start date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="gh-input mt-1 w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold">
                    End date <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="gh-input mt-1 w-full"
                    required
                  />
                </div>
              </div>
              <label className="block text-sm font-semibold">Reason (optional)</label>
              <input
                type="text"
                value={absenceReason}
                onChange={(e) => setAbsenceReason(e.target.value)}
                placeholder="Defaults to medical confidentiality if blank"
                className="gh-input w-full"
              />
              <button
                type="button"
                disabled={pending}
                onClick={generateAbsence}
                className="gh-btn gh-btn-primary text-sm"
              >
                {pending ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <FileText className="size-3.5" aria-hidden />
                )}
                Generate PDF
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  return mounted && open ? createPortal(modal, document.body) : null;
}

function OverviewCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: typeof FileText;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start justify-between gap-2 rounded-lg border border-[var(--color-border)] p-3 text-left hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-background-soft)]"
    >
      <div>
        <p className="flex items-center gap-1.5 text-sm font-bold text-[var(--color-text-primary)]">
          <Icon className="size-4 text-[var(--color-brand-primary)]" aria-hidden />
          {title}
        </p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">{description}</p>
      </div>
      <ChevronRight className="mt-0.5 size-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden />
    </button>
  );
}

