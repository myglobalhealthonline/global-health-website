"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import {
  ConsultationDocumentsModal,
  type ConsultationDocTabId,
  type ConsultationDocumentsModalCopy,
} from "./consultation-documents-modal";

export type ConsultationDocumentsCopy = ConsultationDocumentsModalCopy & {
  sectionDesc: string;
  openWorkspace: string;
  generateDocuments: string;
};

export function ConsultationDocumentsSection({
  appointmentId,
  onDocumentsChange,
  copy,
}: {
  appointmentId: string;
  onDocumentsChange?: () => void;
  copy: ConsultationDocumentsCopy;
}) {
  const [open, setOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<ConsultationDocTabId>("overview");

  return (
    <>
      <p className="mt-3 text-portal-compact leading-relaxed text-[var(--portal-muted)]">
        {copy.sectionDesc}
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
        {copy.openWorkspace}
      </button>
      <ConsultationDocumentsModal
        appointmentId={appointmentId}
        open={open}
        onClose={() => setOpen(false)}
        initialTab={initialTab}
        onDocumentsChange={onDocumentsChange}
        copy={copy}
      />
    </>
  );
}

/** Compact trigger for consultation tab header. */
export function ConsultationDocumentsTrigger({
  appointmentId,
  className,
  onDocumentsChange,
  copy,
}: {
  appointmentId: string;
  className?: string;
  onDocumentsChange?: () => void;
  copy: ConsultationDocumentsCopy;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? "gh-btn gh-btn-soft text-sm"}
      >
        <FileText className="size-3.5" aria-hidden /> {copy.generateDocuments}
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
        copy={copy}
      />
    </>
  );
}
