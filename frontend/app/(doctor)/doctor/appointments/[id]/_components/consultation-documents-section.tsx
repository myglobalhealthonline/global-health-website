"use client";

import { useState } from "react";
import { ClipboardList, FileText, Pill, Stethoscope } from "lucide-react";
import {
  ConsultationDocumentsModal,
  type ConsultationDocTabId,
} from "./consultation-documents-modal";

export function ConsultationDocumentsSection({
  appointmentId,
}: {
  appointmentId: string;
}) {
  const [open, setOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<ConsultationDocTabId>("overview");

  function openTab(tab: ConsultationDocTabId) {
    setInitialTab(tab);
    setOpen(true);
  }

  return (
    <>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <QuickAction
          icon={ClipboardList}
          label="Exams prescription"
          hint="Request labs or imaging"
          onClick={() => openTab("exams")}
        />
        <QuickAction
          icon={Pill}
          label="Medicine prescription"
          hint="PDF for your national portal"
          onClick={() => openTab("medicine")}
        />
        <QuickAction
          icon={Stethoscope}
          label="Absence certificate"
          hint="Review & email to patient"
          onClick={() => openTab("absence")}
        />
        <QuickAction
          icon={FileText}
          label="Medical notes"
          hint="Free text, not emailed"
          onClick={() => openTab("medical-notes")}
        />
      </div>
      <button
        type="button"
        onClick={() => openTab("overview")}
        className="gh-btn gh-btn-primary mt-3 w-full text-sm sm:w-auto"
      >
        <FileText className="size-3.5" aria-hidden />
        Open document workspace
      </button>
      <ConsultationDocumentsModal
        appointmentId={appointmentId}
        open={open}
        onClose={() => setOpen(false)}
        initialTab={initialTab}
      />
    </>
  );
}

function QuickAction({
  icon: Icon,
  label,
  hint,
  onClick,
}: {
  icon: typeof FileText;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-3 text-left transition hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-background-soft)]"
    >
      <Icon className="size-4 text-[var(--color-brand-primary)]" aria-hidden />
      <span className="text-[13px] font-bold text-[var(--color-text-primary)]">{label}</span>
      <span className="text-[11px] text-[var(--color-text-muted)]">{hint}</span>
    </button>
  );
}

/** Compact trigger for consultation tab header. */
export function ConsultationDocumentsTrigger({
  appointmentId,
  className,
}: {
  appointmentId: string;
  className?: string;
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
        onClose={() => setOpen(false)}
        initialTab="overview"
      />
    </>
  );
}
