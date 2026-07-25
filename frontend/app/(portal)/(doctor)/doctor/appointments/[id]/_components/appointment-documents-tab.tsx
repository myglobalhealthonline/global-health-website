"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import {
  DocumentsReviewSendPanel,
  type DocumentsReviewSendPanelCopy,
  type ReviewQueueDoc,
} from "./documents-review-send-panel";
import type { DoctorDocumentDto } from "@/lib/api/doctor-api";
import {
  doctorApiErrorMessage,
  parseDoctorApiJson,
} from "@/lib/doctor-api-client";
import { DOCTOR_FOCUS_REVIEW_SEND_EVENT } from "@/lib/doctor-appointment-ui";
import {
  formatConsultationTypeLabel,
  formatOrderRef,
  formatSessionParts,
  GENERATED_DOCUMENT_TYPE_LABELS,
  generatedDocumentTitle,
  uploadFileTypeLabel,
} from "@/lib/doctor-session-display";
import {
  DocTypeGroup,
  HistorySection,
  type GeneratedDocTableRow,
  type SessionMeta,
  UploadedFilesTable,
  type UploadDocTableRow,
} from "@/app/(portal)/(doctor)/doctor/_components/doctor-document-tables";
import {
  ConsultationDocumentsModal,
  tabForGeneratedDocumentType,
  type ConsultationDocTabId,
  type ConsultationDocumentsModalCopy,
  type EditDraftDoc,
} from "./consultation-documents-modal";
import { DocumentUploadForm, type DocumentUploadFormCopy } from "./document-upload-form";
import {
  SendPatientUploadLinkCard,
  type SendPatientUploadLinkCopy,
} from "@/components/SendPatientUploadLinkCard";

export type AppointmentDocumentsTabCopy = {
  summary: string;
  generateDocuments: string;
  loadError: string;
  loading: string;
  generatedDocumentsTitle: string;
  emptyGeneratedPre: string;
  emptyGeneratedPost: string;
  typeExamsPrescriptions: string;
  typeAbsenceCertificates: string;
  typeMedicinePrescriptions: string;
  typeOther: string;
  uploadedFilesTitle: string;
  noUploadedFiles: string;
  uploadFilesTitle: string;
};

type GeneratedDoc = {
  id: string;
  documentType: string;
  fileName: string;
  sentToPatient: boolean;
  createdAt: string;
  metadata?: Record<string, string> | null;
};

function toGeneratedTableRow(doc: GeneratedDoc): GeneratedDocTableRow {
  return {
    id: doc.id,
    fileName: generatedDocumentTitle(doc.documentType, doc.fileName, doc.metadata),
    fileTypeLabel:
      GENERATED_DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType,
    pdfUrl: `/api/doctor/documents/generated/${doc.id}/pdf`,
  };
}

export function AppointmentDocumentsTab({
  appointmentId,
  scheduledAt,
  createdAt,
  consultationType,
  doctorName,
  initialUploads,
  copy,
  modalCopy,
  uploadCopy,
  uploadLinkCopy,
  reviewCopy,
}: {
  appointmentId: string;
  scheduledAt: string | null;
  createdAt: string;
  consultationType: string;
  doctorName: string;
  initialUploads: DoctorDocumentDto[];
  copy: AppointmentDocumentsTabCopy;
  modalCopy: ConsultationDocumentsModalCopy;
  uploadCopy: DocumentUploadFormCopy;
  uploadLinkCopy: SendPatientUploadLinkCopy;
  reviewCopy: DocumentsReviewSendPanelCopy;
}) {
  const [uploads, setUploads] = useState<DoctorDocumentDto[]>(initialUploads);
  const [generatedHistory, setGeneratedHistory] = useState<GeneratedDoc[]>([]);
  const [generatedTotal, setGeneratedTotal] = useState(0);
  const [loadingGenerated, setLoadingGenerated] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelsRefreshKey, setPanelsRefreshKey] = useState(0);
  const [reviewSendOpen, setReviewSendOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<ConsultationDocTabId>("overview");
  const [editDraft, setEditDraft] = useState<EditDraftDoc | null>(null);

  const session: SessionMeta = useMemo(() => {
    const { sessionDate, sessionTime } = formatSessionParts(scheduledAt, createdAt);
    return {
      sessionDate,
      sessionTime,
      orderNumber: formatOrderRef(appointmentId),
      consultationTypeLabel: formatConsultationTypeLabel(consultationType),
      uploadedBy: doctorName,
    };
  }, [appointmentId, scheduledAt, createdAt, consultationType, doctorName]);

  const loadGenerated = useCallback(async () => {
    setLoadingGenerated(true);
    setLoadError(null);
    const res = await fetch(
      `/api/doctor/appointments/${appointmentId}/documents-generated`,
    );
    const json = await parseDoctorApiJson<{
      ok?: boolean;
      data?: { items?: GeneratedDoc[]; history?: GeneratedDoc[] };
      message?: string;
    }>(res);
    if (!json) {
      setLoadError(doctorApiErrorMessage(res, null, copy.loadError));
      setLoadingGenerated(false);
      return;
    }
    if (!json.ok || !json.data) {
      setLoadError(doctorApiErrorMessage(res, json, copy.loadError));
      setLoadingGenerated(false);
      return;
    }
    setGeneratedHistory(json.data.history ?? []);
    setGeneratedTotal(json.data.items?.length ?? 0);
    setLoadingGenerated(false);
  }, [appointmentId, copy.loadError]);

  const openDocumentsModal = useCallback(
    (tab: ConsultationDocTabId = "overview", draft: EditDraftDoc | null = null) => {
      setModalTab(tab);
      setEditDraft(draft);
      setModalOpen(true);
    },
    [],
  );

  const handleEditDraft = useCallback(
    (doc: ReviewQueueDoc) => {
      openDocumentsModal(tabForGeneratedDocumentType(doc.documentType), {
        id: doc.id,
        documentType: doc.documentType,
        metadata: doc.metadata,
      });
    },
    [openDocumentsModal],
  );

  const refreshAll = useCallback(() => {
    void loadGenerated();
    setPanelsRefreshKey((k) => k + 1);
  }, [loadGenerated]);

  const focusReviewSend = useCallback(() => {
    setReviewSendOpen(true);
    setPanelsRefreshKey((k) => k + 1);
    window.requestAnimationFrame(() => {
      document
        .getElementById("doctor-review-send-panel")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  useEffect(() => {
    const handler = () => focusReviewSend();
    window.addEventListener(DOCTOR_FOCUS_REVIEW_SEND_EVENT, handler);
    return () => window.removeEventListener(DOCTOR_FOCUS_REVIEW_SEND_EVENT, handler);
  }, [focusReviewSend]);

  useEffect(() => {
    // Fetch-on-mount/dep-change — loadGenerated itself is the setState source.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadGenerated();
  }, [loadGenerated]);

  const byType = (type: string) =>
    generatedHistory.filter((d) => d.documentType === type).map(toGeneratedTableRow);
  // Catch-all so unmapped types (e.g. CUSTOM_CERTIFICATE) never vanish —
  // an open section with zero rows reads as "the accordion is broken".
  const NAMED_TYPES = ["EXAMS_PRESCRIPTION", "ABSENCE_CERTIFICATE", "PRESCRIPTION"];
  const otherRows = generatedHistory
    .filter((d) => !NAMED_TYPES.includes(d.documentType))
    .map(toGeneratedTableRow);

  const uploadRows: UploadDocTableRow[] = uploads.map((u) => ({
    id: u.id,
    fileName: u.label,
    fileTypeLabel: uploadFileTypeLabel(u.mimetype),
    viewUrl: u.url || `/api/doctor/documents/${u.id}/download`,
  }));

  const docCount = generatedTotal + uploads.length;

  return (
    <div className="gh-doctor-documents-tab mt-4 grid gap-4" data-tour="appointment-documents">
      <div className="gh-doctor-documents-toolbar flex flex-wrap items-center justify-between gap-3">
        <p className="text-portal-compact text-[var(--portal-muted)]">
          {copy.summary.replace("{count}", String(docCount))}
        </p>
        <button
          type="button"
          onClick={() => openDocumentsModal()}
          className="gh-btn gh-btn-primary text-sm"
        >
          <FileText className="size-3.5" aria-hidden /> {copy.generateDocuments}
        </button>
      </div>

      <ConsultationDocumentsModal
        appointmentId={appointmentId}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditDraft(null);
        }}
        initialTab={modalTab}
        editDraft={editDraft}
        onDocumentsChange={refreshAll}
        copy={modalCopy}
      />

      {loadError ? (
        <p className="gh-status-warning rounded-md border px-3 py-2 text-portal-label">{loadError}</p>
      ) : null}

      <DocumentsReviewSendPanel
        key={panelsRefreshKey}
        appointmentId={appointmentId}
        onDocumentsChange={refreshAll}
        onEditDraft={handleEditDraft}
        open={reviewSendOpen}
        onOpenChange={setReviewSendOpen}
        copy={reviewCopy}
      />

      {loadingGenerated ? (
        <p className="text-portal-compact text-[var(--portal-muted)]">{copy.loading}</p>
      ) : generatedHistory.length === 0 ? (
        <HistorySection title={copy.generatedDocumentsTitle} count={0} defaultOpen={false}>
          <p className="px-4 py-3 text-portal-compact text-[var(--portal-muted)]">
            {copy.emptyGeneratedPre} <strong>{copy.generateDocuments}</strong>{" "}
            {copy.emptyGeneratedPost}
          </p>
        </HistorySection>
      ) : (
        <HistorySection
          title={copy.generatedDocumentsTitle}
          count={generatedHistory.length}
          defaultOpen={false}
        >
          <DocTypeGroup
            title={copy.typeExamsPrescriptions}
            rows={byType("EXAMS_PRESCRIPTION")}
            session={session}
          />
          <DocTypeGroup
            title={copy.typeAbsenceCertificates}
            rows={byType("ABSENCE_CERTIFICATE")}
            session={session}
          />
          <DocTypeGroup
            title={copy.typeMedicinePrescriptions}
            rows={byType("PRESCRIPTION")}
            session={session}
          />
          <DocTypeGroup title={copy.typeOther} rows={otherRows} session={session} />
        </HistorySection>
      )}

      <HistorySection title={copy.uploadedFilesTitle} count={uploads.length} defaultOpen={false}>
        {uploads.length === 0 ? (
          <p className="px-4 py-3 text-portal-compact text-[var(--portal-muted)]">
            {copy.noUploadedFiles}
          </p>
        ) : (
          <UploadedFilesTable rows={uploadRows} session={session} />
        )}
      </HistorySection>

      <HistorySection title={copy.uploadFilesTitle} count={undefined} defaultOpen>
        <div className="grid gap-3 p-4">
          <DocumentUploadForm
            appointmentId={appointmentId}
            onUploaded={(doc) => setUploads((prev) => [doc, ...prev])}
            copy={uploadCopy}
          />
          {/* Patient-side counterpart to the form above — same destination,
              the AppointmentDocument rows listed in "Uploaded files". */}
          <SendPatientUploadLinkCard
            endpoint={`/api/doctor/appointments/${appointmentId}/upload-link`}
            copy={uploadLinkCopy}
          />
        </div>
      </HistorySection>
    </div>
  );
}
