"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
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
import { PrescriptionIdentityNotice } from "./prescription-identity-notice";
import { MemedPrescribePanel } from "./memed-prescribe-panel";
import { PortalTabs } from "@/components/PortalTabs";
import { buildExamTypeIdsField } from "@/lib/doctor/exam-type-ids";
import {
  ExamCataloguePicker,
  type CatalogueExam,
  type ExamCataloguePickerCopy,
} from "./exam-catalogue-picker";

export type ConsultationDocTabId = "overview" | "exams" | "medicine" | "absence" | "certificate";

export type EditDraftDoc = {
  id: string;
  documentType: string;
  metadata?: Record<string, string> | null;
};

export type ConsultationDocumentsModalCopy = {
  title: string;
  subtitle: string;
  closeAria: string;
  closeDialogAria: string;
  tabOverview: string;
  tabExams: string;
  tabMedicine: string;
  tabAbsence: string;
  tabCertificate: string;
  editingDraftNotice: string;
  loading: string;
  loadContextError: string;
  noDocxTemplate: string;
  registrationMissingNotice: string;
  fieldsAutoNotice: string;
  overviewIntro: string;
  cardExamsTitle: string;
  cardExamsDesc: string;
  cardMedicineTitle: string;
  cardMedicineDesc: string;
  cardAbsenceTitle: string;
  cardAbsenceDesc: string;
  cardCertificateTitle: string;
  cardCertificateDesc: string;
  overviewFooterNote: string;
  examsLabel: string;
  examsHint: string;
  examsPlaceholder: string;
  examsNotesLabel: string;
  examsNotesPlaceholder: string;
  examCatalogueLabel: string;
  examCataloguePlaceholder: string;
  examCatalogueHint: string;
  examCatalogueEmpty: string;
  generatePdf: string;
  examsRequiredError: string;
  medicineIntro: string;
  medicationPlaceholderRequired: string;
  medicationPlaceholder: string;
  addMedication: string;
  pharmacyLabel: string;
  pharmacyPlaceholderFromBooking: string;
  pharmacyPlaceholderDefault: string;
  medicationRequiredError: string;
  startDateLabel: string;
  endDateLabel: string;
  absenceReasonLabel: string;
  absenceReasonPlaceholder: string;
  endDateRequiredError: string;
  certQrNotice: string;
  certNameLabel: string;
  certNamePlaceholder: string;
  certDateTypeLabel: string;
  certDateSingle: string;
  certDateRange: string;
  certDateNone: string;
  certFromLabel: string;
  certToLabel: string;
  certReasonLabel: string;
  certReasonPlaceholder: string;
  certNameRequiredError: string;
  certDateRequiredError: string;
  certEndDateRequiredError: string;
  generateFailed: string;
  nationalPortalDefault: string;
  prescriptionPortalSuccess: string;
  prescriptionSuccessPdf: string;
  prescriptionSuccessNoPdf: string;
  otherDocSuccessPdf: string;
  otherDocSuccessNoPdf: string;
  genericSuccessPdf: string;
  genericSuccessNoPdf: string;
};

export function tabForGeneratedDocumentType(documentType: string): ConsultationDocTabId {
  switch (documentType) {
    case "EXAMS_PRESCRIPTION":
      return "exams";
    case "PRESCRIPTION":
      return "medicine";
    case "ABSENCE_CERTIFICATE":
      return "absence";
    case "CUSTOM_CERTIFICATE":
      return "certificate";
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
    setCertName: (v: string) => void;
    setCertDateMode: (v: "single" | "range") => void;
    setCertSingleDate: (v: string) => void;
    setCertStartDate: (v: string) => void;
    setCertEndDate: (v: string) => void;
    setCertReason: (v: string) => void;
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
    return;
  }

  if (draft.documentType === "CUSTOM_CERTIFICATE") {
    setters.setCertName(meta.certificateName ?? "");
    setters.setCertDateMode(meta.singleDate ? "single" : "range");
    setters.setCertSingleDate(meta.singleDate ?? "");
    setters.setCertStartDate(meta.startDate ?? "");
    setters.setCertEndDate(meta.endDate ?? "");
    setters.setCertReason(meta.reason ?? "");
  }
}

export function ConsultationDocumentsModal({
  appointmentId,
  open,
  onClose,
  initialTab,
  editDraft,
  onDocumentsChange,
  copy,
}: {
  appointmentId: string;
  open: boolean;
  onClose: () => void;
  initialTab?: ConsultationDocTabId;
  /** Pre-fill form fields when editing a draft from Review & send. */
  editDraft?: EditDraftDoc | null;
  onDocumentsChange?: () => void;
  copy: ConsultationDocumentsModalCopy;
}) {
  const TABS: { id: ConsultationDocTabId; label: string }[] = [
    { id: "overview", label: copy.tabOverview },
    { id: "exams", label: copy.tabExams },
    { id: "medicine", label: copy.tabMedicine },
    { id: "absence", label: copy.tabAbsence },
    { id: "certificate", label: copy.tabCertificate },
  ];
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
  /** Catalogue picks backing the lines in `exams`. See buildExamTypeIdsField. */
  const [pickedExams, setPickedExams] = useState<CatalogueExam[]>([]);
  const [meds, setMeds] = useState<string[]>([""]);
  const [pharmacy, setPharmacy] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [absenceReason, setAbsenceReason] = useState("");
  const [certName, setCertName] = useState("");
  const [certDateMode, setCertDateMode] = useState<"single" | "range" | "none">("single");
  const [certSingleDate, setCertSingleDate] = useState("");
  const [certStartDate, setCertStartDate] = useState("");
  const [certEndDate, setCertEndDate] = useState("");
  const [certReason, setCertReason] = useState("");

  // Focus trap + restore — same pattern as PortalDialog (query focusables
  // fresh on every Tab press; a tab switch inside this modal changes what's
  // focusable, so a mount-time snapshot would go stale).
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const loadContext = useCallback(async () => {
    setContextLoading(true);
    try {
      const res = await fetch(
        `/api/doctor/appointments/${appointmentId}/documents-context`,
      );
      const json = await parseDoctorApiJson<{ ok?: boolean; data?: DocumentContext }>(res);
      if (!json) {
        setError(doctorApiErrorMessage(res, null, copy.loadContextError));
        return;
      }
      if (json.ok && json.data) {
        setContext(json.data);
        setPharmacy((prev) => prev || json.data!.patient.pharmacy || "");
      } else {
        setError(doctorApiErrorMessage(res, json, copy.loadContextError));
      }
    } finally {
      setContextLoading(false);
    }
  }, [appointmentId, copy.loadContextError]);

  useEffect(() => {
    // Client-only mount flag to gate portal rendering until hydrated.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    // Reset transient status + refetch context each time the modal opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        setCertName,
        setCertDateMode,
        setCertSingleDate,
        setCertStartDate,
        setCertEndDate,
        setCertReason,
      });
    } else {
      setEditingDocId(null);
      setExams("");
      setExamsNotes("");
      setMeds([""]);
      setStartDate("");
      setEndDate("");
      setAbsenceReason("");
      setCertName("");
      setCertDateMode("single");
      setCertSingleDate("");
      setCertStartDate("");
      setCertEndDate("");
      setCertReason("");
      if (initialTab) setTab(initialTab);
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    returnFocusRef.current = document.activeElement as HTMLElement | null;
    function queryFocusable(): NodeListOf<HTMLElement> | undefined {
      return panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
    }
    // Focus the panel's first focusable on open (deferred a tick so the
    // portal has actually mounted the DOM this ref points at).
    const focusTimer = window.setTimeout(() => queryFocusable()?.[0]?.focus(), 0);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = queryFocusable();
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKey);
      returnFocusRef.current?.focus();
    };
  }, [open, loadContext, initialTab, editDraft, onClose]);

  useEffect(() => {
    if (!open || editDraft || !context?.patient.pharmacy) return;
    // Backfill pharmacy from patient context only if the field is still empty.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        setError(doctorApiErrorMessage(res, json, copy.generateFailed));
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
            ? copy.prescriptionPortalSuccess.replace(
                "{portal}",
                json.data.healthPortalLabel ?? copy.nationalPortalDefault,
              )
            : copy.prescriptionSuccessNoPdf,
        );
      } else if (type === "PRESCRIPTION") {
        setSuccess(pdfUrl ? copy.prescriptionSuccessPdf : copy.prescriptionSuccessNoPdf);
      } else if (type === "EXAMS_PRESCRIPTION" || type === "ABSENCE_CERTIFICATE" || type === "CUSTOM_CERTIFICATE") {
        setSuccess(pdfUrl ? copy.otherDocSuccessPdf : copy.otherDocSuccessNoPdf);
      } else {
        setSuccess(pdfUrl ? copy.genericSuccessPdf : copy.genericSuccessNoPdf);
      }
    });
  }

  function generateExams() {
    if (!exams.trim()) {
      setError(copy.examsRequiredError);
      return;
    }
    const examTypeIds = buildExamTypeIdsField(exams.trim(), pickedExams);
    void generate("EXAMS_PRESCRIPTION", {
      exams: exams.trim(),
      ...(examTypeIds ? { examTypeIds } : {}),
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
      setError(copy.medicationRequiredError);
      return;
    }
    if (pharmacy.trim()) fields.pharmacy = pharmacy.trim();
    void generate("PRESCRIPTION", fields);
  }

  function generateAbsence() {
    if (!endDate.trim()) {
      setError(copy.endDateRequiredError);
      return;
    }
    void generate("ABSENCE_CERTIFICATE", {
      ...(startDate.trim() ? { startDate: startDate.trim() } : {}),
      endDate: endDate.trim(),
      ...(absenceReason.trim() ? { reason: absenceReason.trim() } : {}),
    });
  }

  function generateCertificate() {
    if (!certName.trim()) {
      setError(copy.certNameRequiredError);
      return;
    }
    if (certDateMode === "single" && !certSingleDate.trim()) {
      setError(copy.certDateRequiredError);
      return;
    }
    if (certDateMode === "range" && !certEndDate.trim()) {
      setError(copy.certEndDateRequiredError);
      return;
    }
    const fields: Record<string, string> = { certificateName: certName.trim() };
    if (certDateMode === "single" && certSingleDate.trim()) {
      fields.singleDate = certSingleDate.trim();
    } else if (certDateMode === "range") {
      if (certStartDate.trim()) fields.startDate = certStartDate.trim();
      if (certEndDate.trim()) fields.endDate = certEndDate.trim();
    }
    if (certReason.trim()) fields.reason = certReason.trim();
    void generate("CUSTOM_CERTIFICATE", fields);
  }

  const modal = (
    <div
      className="gh-doctor-doc-modal fixed inset-0 z-[var(--z-modal-overlay)] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consultation-docs-title"
    >
      <button
        type="button"
        className="absolute inset-0"
        aria-label={copy.closeDialogAria}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="gh-doctor-doc-modal-panel relative z-[var(--z-modal)] flex max-h-[min(92svh,900px)] w-full max-w-3xl flex-col overflow-hidden"
      >
        <div className="gh-doctor-doc-modal-header flex shrink-0 items-center justify-between border-b border-[var(--portal-line)] px-4 py-3">
          <div>
            <h2
              id="consultation-docs-title"
              className="text-lg font-bold text-[var(--portal-text)]"
            >
              {copy.title}
            </h2>
            <p className="text-xs text-[var(--portal-muted)]">{copy.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[var(--portal-muted)] hover:bg-[var(--portal-well)]"
            aria-label={copy.closeAria}
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="gh-doctor-doc-modal-tabs shrink-0 overflow-x-auto border-b border-[var(--portal-line)] px-3 py-1">
          <PortalTabs
            ariaLabel={copy.title}
            value={tab}
            onChange={(v) => setTab(v as ConsultationDocTabId)}
            items={TABS.map((t) => ({ value: t.id, label: t.label }))}
          />
        </div>

        <div className="gh-doctor-doc-modal-body min-h-0 flex-1 overflow-y-auto p-4">
          {error ? <p className="mb-3 text-sm text-red-700">{error}</p> : null}
          {success ? <p className="mb-3 text-sm text-emerald-700">{success}</p> : null}
          {editingDocId ? (
            <p className="mb-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
              {copy.editingDraftNotice}
            </p>
          ) : null}

          {contextLoading ? (
            <p className="mb-4 flex items-center gap-2 text-sm text-[var(--portal-muted)]">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {copy.loading}
            </p>
          ) : context && tab === "overview" ? (
            <div className="mb-4 space-y-2">
              <MemedPrescribePanel
                appointmentId={appointmentId}
                countryCode={context.countryCode}
                onIssued={() => onDocumentsChange?.()}
              />
              {!context.hasDocxTemplate ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {copy.noDocxTemplate.replace("{country}", context.countryLabel)}
                </p>
              ) : null}
              {context.doctor.registrationMissing ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  {copy.registrationMissingNotice.replace("{country}", context.countryLabel)}
                </p>
              ) : null}
            </div>
          ) : null}

          {(tab === "exams" || tab === "medicine" || tab === "absence" || tab === "certificate") && !contextLoading ? (
            <p className="mb-3 text-xs text-[var(--portal-muted)]">{copy.fieldsAutoNotice}</p>
          ) : null}

          {tab === "overview" ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--portal-muted)]">{copy.overviewIntro}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <OverviewCard
                  icon={ClipboardList}
                  title={copy.cardExamsTitle}
                  description={copy.cardExamsDesc}
                  onClick={() => setTab("exams")}
                />
                <OverviewCard
                  icon={Pill}
                  title={copy.cardMedicineTitle}
                  description={copy.cardMedicineDesc}
                  onClick={() => setTab("medicine")}
                />
                <OverviewCard
                  icon={Stethoscope}
                  title={copy.cardAbsenceTitle}
                  description={copy.cardAbsenceDesc}
                  onClick={() => setTab("absence")}
                />
                <OverviewCard
                  icon={FileText}
                  title={copy.cardCertificateTitle}
                  description={copy.cardCertificateDesc}
                  onClick={() => setTab("certificate")}
                />
              </div>
              <p className="text-xs text-[var(--portal-muted)]">{copy.overviewFooterNote}</p>
            </div>
          ) : null}

          {tab === "exams" ? (
            <div className="space-y-3">
              <ExamCataloguePicker
                copy={copy as ExamCataloguePickerCopy}
                onPick={(exam) => {
                  setPickedExams((prev) =>
                    prev.some((p) => p.id === exam.id) ? prev : [...prev, exam],
                  );
                  setExams((prev) => {
                    const lines = prev.split(/\r?\n/).filter((l) => l.trim());
                    if (lines.some((l) => l.trim() === exam.name.trim())) return prev;
                    return [...lines, exam.name].join("\n");
                  });
                }}
              />
              <label className="block text-sm font-semibold">
                {copy.examsLabel} <span className="text-red-600">*</span>
              </label>
              <p className="text-xs text-[var(--portal-muted)]">{copy.examsHint}</p>
              <textarea
                value={exams}
                onChange={(e) => setExams(e.target.value)}
                rows={5}
                className="gh-input w-full"
                placeholder={copy.examsPlaceholder}
              />
              <label className="block text-sm font-semibold">{copy.examsNotesLabel}</label>
              <textarea
                value={examsNotes}
                onChange={(e) => setExamsNotes(e.target.value)}
                rows={2}
                className="gh-input w-full"
                placeholder={copy.examsNotesPlaceholder}
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
                {copy.generatePdf}
              </button>
            </div>
          ) : null}

          {tab === "medicine" ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--portal-muted)]">{copy.medicineIntro}</p>
              {/* Say up front what this prescription will claim about the
                  patient's identity, so an unverified one is a decision rather
                  than something noticed later on the PDF. */}
              {context ? <PrescriptionIdentityNotice email={context.patient.email} /> : null}
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
                  placeholder={
                    i === 0
                      ? copy.medicationPlaceholderRequired
                      : copy.medicationPlaceholder.replace("{n}", String(i + 1))
                  }
                  className="gh-input w-full"
                />
              ))}
              {meds.length < 7 ? (
                <button
                  type="button"
                  className="text-xs font-semibold text-[var(--portal-primary)]"
                  onClick={() => setMeds([...meds, ""])}
                >
                  {copy.addMedication}
                </button>
              ) : null}
              <label className="block text-sm font-semibold">{copy.pharmacyLabel}</label>
              <input
                type="text"
                value={pharmacy}
                onChange={(e) => setPharmacy(e.target.value)}
                placeholder={
                  context?.patient.pharmacy
                    ? copy.pharmacyPlaceholderFromBooking.replace(
                        "{pharmacy}",
                        context.patient.pharmacy,
                      )
                    : copy.pharmacyPlaceholderDefault
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
                {copy.generatePdf}
              </button>
            </div>
          ) : null}

          {tab === "absence" ? (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold">{copy.startDateLabel}</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="gh-input mt-1 w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold">
                    {copy.endDateLabel} <span className="text-red-600">*</span>
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
              <label className="block text-sm font-semibold">{copy.absenceReasonLabel}</label>
              <input
                type="text"
                value={absenceReason}
                onChange={(e) => setAbsenceReason(e.target.value)}
                placeholder={copy.absenceReasonPlaceholder}
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
                {copy.generatePdf}
              </button>
            </div>
          ) : null}

          {tab === "certificate" ? (
            <div className="space-y-3">
              <p className="text-xs text-[var(--portal-muted)]">{copy.certQrNotice}</p>
              <label className="block text-sm font-semibold">
                {copy.certNameLabel} <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={certName}
                onChange={(e) => setCertName(e.target.value)}
                placeholder={copy.certNamePlaceholder}
                className="gh-input w-full"
              />
              <label className="block text-sm font-semibold">{copy.certDateTypeLabel}</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCertDateMode("single")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                    certDateMode === "single"
                      ? "bg-[var(--portal-primary)] text-white"
                      : "border border-[var(--portal-line)] text-[var(--portal-muted)]"
                  }`}
                >
                  {copy.certDateSingle}
                </button>
                <button
                  type="button"
                  onClick={() => setCertDateMode("range")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                    certDateMode === "range"
                      ? "bg-[var(--portal-primary)] text-white"
                      : "border border-[var(--portal-line)] text-[var(--portal-muted)]"
                  }`}
                >
                  {copy.certDateRange}
                </button>
                <button
                  type="button"
                  onClick={() => setCertDateMode("none")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                    certDateMode === "none"
                      ? "bg-[var(--portal-primary)] text-white"
                      : "border border-[var(--portal-line)] text-[var(--portal-muted)]"
                  }`}
                >
                  {copy.certDateNone}
                </button>
              </div>
              {certDateMode === "single" ? (
                <div>
                  <label className="text-sm font-semibold">
                    {copy.certFromLabel} <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={certSingleDate}
                    onChange={(e) => setCertSingleDate(e.target.value)}
                    className="gh-input mt-1 w-full"
                    required
                  />
                </div>
              ) : certDateMode === "range" ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-semibold">{copy.certFromLabel}</label>
                    <input
                      type="date"
                      value={certStartDate}
                      onChange={(e) => setCertStartDate(e.target.value)}
                      className="gh-input mt-1 w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold">
                      {copy.certToLabel} <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="date"
                      value={certEndDate}
                      onChange={(e) => setCertEndDate(e.target.value)}
                      className="gh-input mt-1 w-full"
                      required
                    />
                  </div>
                </div>
              ) : null}
              <label className="block text-sm font-semibold">{copy.certReasonLabel}</label>
              <textarea
                value={certReason}
                onChange={(e) => setCertReason(e.target.value)}
                rows={2}
                placeholder={copy.certReasonPlaceholder}
                className="gh-input w-full"
              />
              <button
                type="button"
                disabled={pending}
                onClick={generateCertificate}
                className="gh-btn gh-btn-primary text-sm"
              >
                {pending ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <FileText className="size-3.5" aria-hidden />
                )}
                {copy.generatePdf}
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
      className="flex items-start justify-between gap-2 rounded-lg border border-[var(--portal-line)] p-3 text-left hover:border-[var(--portal-primary)] hover:bg-[var(--portal-well)]"
    >
      <div>
        <p className="flex items-center gap-1.5 text-sm font-bold text-[var(--portal-text)]">
          <Icon className="size-4 text-[var(--portal-primary)]" aria-hidden />
          {title}
        </p>
        <p className="mt-1 text-xs text-[var(--portal-muted)]">{description}</p>
      </div>
      <ChevronRight className="mt-0.5 size-4 shrink-0 text-[var(--portal-muted)]" aria-hidden />
    </button>
  );
}

