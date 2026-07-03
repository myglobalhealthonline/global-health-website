"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import {
  ConsultationDocumentsModal,
  type ConsultationDocTabId,
} from "./consultation-documents-modal";

export function ConsultationDocumentsSection({
  appointmentId,
  onDocumentsChange,
}: {
  appointmentId: string;
  onDocumentsChange?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<ConsultationDocTabId>("overview");

  return (
    <>
      <p className="mt-3 text-[13px] leading-relaxed text-[var(--portal-muted)]">
        Generate exams, prescriptions, or absence certificates. Patient details and your
        registration are filled in automatically from records.
      </p>
      <button
        type="button"
        onClick={() => {
          setInitialTab("overview");
          setOpen(true);
        }}
        className="gh-btn gh-btn-primary mt-4 w-full text-sm sm:w-auto"
      >
        <FileText className="size-3.5" aria-hidden />
        Open document workspace
      </button>
      <ConsultationDocumentsModal
        appointmentId={appointmentId}
        open={open}
        onClose={() => setOpen(false)}
        initialTab={initialTab}
        onDocumentsChange={onDocumentsChange}
      />
    </>
  );
}

/** Compact trigger for consultation tab header. */
export function ConsultationDocumentsTrigger({
  appointmentId,
  className,
  onDocumentsChange,
}: {
  appointmentId: string;
  className?: string;
  onDocumentsChange?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? "gh-btn gh-btn-soft text-sm"}
      >
        <FileText className="size-3.5" aria-hidden /> Generate documents
      </button>
      <ConsultationDocumentsModal
        appointmentId={appointmentId}
        open={open}
        onClose={() => {
          setOpen(false);
          onDocumentsChange?.();
        }}
        initialTab="overview"
        onDocumentsChange={onDocumentsChange}
      />
    </>
  );
}
