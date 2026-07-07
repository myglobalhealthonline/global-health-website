"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { DocumentsReviewSendPanel, type ReviewQueueDoc } from "./documents-review-send-panel";
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
} from "@/app/(doctor)/doctor/_components/doctor-document-tables";
import {
  ConsultationDocumentsModal,
  tabForGeneratedDocumentType,
  type ConsultationDocTabId,
  type EditDraftDoc,
} from "./consultation-documents-modal";
import { DocumentUploadForm } from "./document-upload-form";

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
}: {
  appointmentId: string;
  scheduledAt: string | null;
  createdAt: string;
  consultationType: string;
  doctorName: string;
  initialUploads: DoctorDocumentDto[];
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
      setLoadError(doctorApiErrorMessage(res, null, "Could not load generated documents."));
      setLoadingGenerated(false);
      return;
    }
    if (!json.ok || !json.data) {
      setLoadError(doctorApiErrorMessage(res, json, "Could not load generated documents."));
      setLoadingGenerated(false);
      return;
    }
    setGeneratedHistory(json.data.history ?? []);
    setGeneratedTotal(json.data.items?.length ?? 0);
    setLoadingGenerated(false);
  }, [appointmentId]);

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

  const uploadRows: UploadDocTableRow[] = uploads.map((u) => ({
    id: u.id,
    fileName: u.label,
    fileTypeLabel: uploadFileTypeLabel(u.mimetype),
    viewUrl: u.url || `/api/doctor/documents/${u.id}/download`,
  }));

  const docCount = generatedTotal + uploads.length;

  return (
    <div className="gh-doctor-documents-tab mt-4 grid gap-4">
      <div className="gh-doctor-documents-toolbar flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-[var(--portal-muted)]">
          Generated PDFs and uploaded files for this appointment ({docCount} total).
        </p>
        <button
          type="button"
          onClick={() => openDocumentsModal()}
          className="gh-btn gh-btn-primary text-sm"
        >
          <FileText className="size-3.5" aria-hidden /> Generate documents
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
      />

      {loadError ? (
        <p className="gh-status-warning rounded-md border px-3 py-2 text-[12.5px]">{loadError}</p>
      ) : null}

      <DocumentsReviewSendPanel
        key={panelsRefreshKey}
        appointmentId={appointmentId}
        onDocumentsChange={refreshAll}
        onEditDraft={handleEditDraft}
        open={reviewSendOpen}
        onOpenChange={setReviewSendOpen}
      />

      {loadingGenerated ? (
        <p className="text-[13px] text-[var(--portal-muted)]">Loading generated documents…</p>
      ) : generatedHistory.length === 0 ? (
        <HistorySection title="Generated documents" count={0} defaultOpen={false}>
          <p className="px-4 py-3 text-[13px] text-[var(--portal-muted)]">
            No sent PDFs yet. Use <strong>Generate documents</strong> to create exams, prescriptions, or
            absence certificates — drafts appear in Review &amp; send until emailed.
          </p>
        </HistorySection>
      ) : (
        <HistorySection title="Generated documents" count={generatedHistory.length} defaultOpen={false}>
          <DocTypeGroup
            title="Exams prescriptions"
            rows={byType("EXAMS_PRESCRIPTION")}
            session={session}
          />
          <DocTypeGroup
            title="Absence certificates"
            rows={byType("ABSENCE_CERTIFICATE")}
            session={session}
          />
          <DocTypeGroup
            title="Medicine prescriptions"
            rows={byType("PRESCRIPTION")}
            session={session}
          />
          <DocTypeGroup title="Other" rows={byType("OTHER")} session={session} />
        </HistorySection>
      )}

      <HistorySection title="Uploaded files" count={uploads.length} defaultOpen={false}>
        {uploads.length === 0 ? (
          <p className="px-4 py-3 text-[13px] text-[var(--portal-muted)]">
            No uploaded files yet.
          </p>
        ) : (
          <UploadedFilesTable rows={uploadRows} session={session} />
        )}
      </HistorySection>

      <HistorySection title="Upload files" count={undefined} defaultOpen>
        <div className="p-4">
          <DocumentUploadForm
            appointmentId={appointmentId}
            onUploaded={(doc) => setUploads((prev) => [doc, ...prev])}
          />
        </div>
      </HistorySection>
    </div>
  );
}
