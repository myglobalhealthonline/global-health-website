"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Eye, FileText } from "lucide-react";
import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";
import { PortalMobileCard } from "@/components/PortalMobileCard";
import { DocumentRow } from "@/components/DocumentRow";

export type SessionMeta = {
  sessionDate: string;
  sessionTime: string;
  orderNumber: string;
  consultationTypeLabel: string;
  uploadedBy: string;
};

export function SessionTypeBadge({ label }: { label: string }) {
  return (
    <span className="inline-block max-w-[180px] truncate rounded-full bg-[var(--portal-mint-soft)] px-2 py-0.5 text-portal-thead font-semibold text-[var(--portal-primary)]">
      {label}
    </span>
  );
}

export function FileTypeBadge({ label }: { label: string }) {
  const tone =
    label === "PDF"
      ? "bg-rose-50 text-rose-800"
      : label === "Image"
        ? "bg-sky-50 text-sky-800"
        : label.includes("prescription") || label.includes("Prescription")
          ? "bg-violet-50 text-violet-800"
          : label.includes("Absence")
            ? "bg-amber-50 text-amber-900"
            : label.includes("Exams")
              ? "bg-blue-50 text-blue-800"
              : "bg-emerald-50 text-emerald-800";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-portal-thead font-semibold ${tone}`}>
      {label}
    </span>
  );
}

export type DocumentTablesCopy = {
  colSessionDate: string;
  colTime: string;
  colOrderNumber: string;
  colSessionType: string;
  colFileName: string;
  colFileType: string;
  colUploadedBy: string;
  colView: string;
  view: string;
  viewDocument: string;
  type: string;
  order: string;
  uploadedBy: string;
};

// ponytail: fallback keeps the sibling doctor/patients/[email] consumer
// (out of this task's scope) compiling without a `copy` prop; that page
// can wire real i18n copy in its own pass.
const DEFAULT_DOCUMENT_TABLES_COPY: DocumentTablesCopy = {
  colSessionDate: "Session date",
  colTime: "Time",
  colOrderNumber: "Order #",
  colSessionType: "Session type",
  colFileName: "File name",
  colFileType: "File type",
  colUploadedBy: "Uploaded by",
  colView: "View",
  view: "View",
  viewDocument: "View document",
  type: "Type",
  order: "Order",
  uploadedBy: "Uploaded by",
};

export function HistorySection({
  title,
  count,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  pendingDot,
  id,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Amber dot with unsent count (Review & send). */
  pendingDot?: boolean;
  id?: string;
  children: React.ReactNode;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (next: boolean) => {
    onOpenChange?.(next);
    if (controlledOpen === undefined) setInternalOpen(next);
  };

  return (
    <section
      id={id}
      className="gh-doctor-history-section overflow-hidden rounded-md border border-[var(--portal-line)]"
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 bg-[var(--portal-primary)] px-4 py-2.5 text-left text-sm font-bold text-white"
      >
        <span className="flex items-center gap-2">
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          {title}
          {pendingDot && count !== undefined && count > 0 ? (
            <span
              className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-amber-400 px-1 text-portal-micro font-extrabold leading-none text-[#0a281f]"
              aria-label={`${count} to send`}
            >
              {count}
            </span>
          ) : count !== undefined ? (
            <span className="text-portal-meta font-semibold opacity-90">({count})</span>
          ) : null}
        </span>
      </button>
      {open ? <div className="bg-white">{children}</div> : null}
    </section>
  );
}

export type GeneratedDocTableRow = {
  id: string;
  fileName: string;
  fileTypeLabel: string;
  pdfUrl: string;
  /** Overrides `session.uploadedBy` when this file came from someone other
   *  than the doctor whose workspace is being viewed (cross-border
   *  disclosure). Omitted for ordinary files. */
  uploadedBy?: string | null;
};

type AnyDocumentRow = GeneratedDocTableRow | UploadDocTableRow;

function DocumentTable<T extends AnyDocumentRow>({
  rows,
  session,
  copy,
  getViewUrl,
}: {
  rows: T[];
  session: SessionMeta;
  copy: DocumentTablesCopy;
  getViewUrl: (row: T) => string;
}) {
  const fields: ColumnPriorityField<T>[] = [
    { key: "sessionDate", label: copy.colSessionDate, priority: 2, render: () => <span className="whitespace-nowrap">{session.sessionDate}</span> },
    { key: "time", label: copy.colTime, priority: 3, render: () => <span className="whitespace-nowrap">{session.sessionTime}</span> },
    { key: "order", label: copy.colOrderNumber, priority: 3, render: () => session.orderNumber },
    { key: "sessionType", label: copy.colSessionType, priority: 4, render: () => <SessionTypeBadge label={session.consultationTypeLabel} /> },
    {
      key: "fileName",
      label: copy.colFileName,
      priority: 1,
      cardPrimary: true,
      render: (row) => <div className="max-w-[200px]"><DocumentRow icon={<FileText className="size-4" />} title={row.fileName} /></div>,
    },
    { key: "fileType", label: copy.colFileType, priority: 2, render: (row) => <FileTypeBadge label={row.fileTypeLabel} /> },
    // Per-row uploader wins: `session.uploadedBy` is the doctor whose
    // workspace this is, which is wrong for a file disclosed by another doctor.
    { key: "uploadedBy", label: copy.colUploadedBy, priority: 4, render: (row) => row.uploadedBy ?? session.uploadedBy },
    {
      key: "view",
      label: copy.colView,
      priority: 2,
      align: "right",
      desktopOnly: true,
      render: (row) => <DocumentViewLink href={getViewUrl(row)} label={copy.view} />,
    },
  ];

  return (
    <ColumnPriorityTable
      fields={fields}
      rows={rows}
      getRowKey={(row) => row.id}
      cardActions={(row) => <DocumentViewLink href={getViewUrl(row)} label={copy.viewDocument} />}
    />
  );
}

function DocumentViewLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-md border border-[var(--portal-line)] px-2.5 py-1 text-portal-meta font-semibold text-[var(--portal-primary)] hover:bg-[var(--portal-well)]">
      <Eye className="size-3.5" aria-hidden />
      {label}
    </a>
  );
}

export function GeneratedDocumentsTable({
  rows,
  session,
  copy = DEFAULT_DOCUMENT_TABLES_COPY,
}: {
  rows: GeneratedDocTableRow[];
  session: SessionMeta;
  copy?: DocumentTablesCopy;
}) {
  return <DocumentTable rows={rows} session={session} copy={copy} getViewUrl={(row) => row.pdfUrl} />;
}

export type UploadDocTableRow = {
  id: string;
  fileName: string;
  fileTypeLabel: string;
  viewUrl: string;
  /** See GeneratedDocTableRow.uploadedBy. */
  uploadedBy?: string | null;
};

export function UploadedFilesTable({
  rows,
  session,
  copy = DEFAULT_DOCUMENT_TABLES_COPY,
}: {
  rows: UploadDocTableRow[];
  session: SessionMeta;
  copy?: DocumentTablesCopy;
}) {
  return <DocumentTable rows={rows} session={session} copy={copy} getViewUrl={(row) => row.viewUrl} />;
}

export function DocTypeGroup({
  title,
  rows,
  session,
  copy = DEFAULT_DOCUMENT_TABLES_COPY,
}: {
  title: string;
  rows: GeneratedDocTableRow[];
  session: SessionMeta;
  copy?: DocumentTablesCopy;
}) {
  const [open, setOpen] = useState(false);
  if (rows.length === 0) return null;
  return (
    <div className="gh-doctor-doc-type-group border-t border-[var(--portal-line)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-portal-compact font-bold text-[var(--portal-text)] hover:bg-[var(--portal-well)]"
      >
        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        {title}
        <span className="text-[var(--portal-muted)]">({rows.length})</span>
      </button>
      {open ? <GeneratedDocumentsTable rows={rows} session={session} copy={copy} /> : null}
    </div>
  );
}

export function DocumentMobileCard({
  fileName,
  fileTypeLabel,
  viewUrl,
  uploadedBy,
  session,
  copy = DEFAULT_DOCUMENT_TABLES_COPY,
}: {
  fileName: string;
  fileTypeLabel: string;
  viewUrl: string;
  /** See GeneratedDocTableRow.uploadedBy. */
  uploadedBy?: string | null;
  session: SessionMeta;
  copy?: DocumentTablesCopy;
}) {
  return (
    <PortalMobileCard
      leading={<span className="gh-document-row__icon"><FileText className="size-4" aria-hidden /></span>}
      title={fileName}
      subtitle={`${session.sessionDate} · ${session.sessionTime}`}
      statusPill={<FileTypeBadge label={fileTypeLabel} />}
      meta={[
        { label: copy.type, value: <SessionTypeBadge label={session.consultationTypeLabel} /> },
        { label: copy.order, value: session.orderNumber },
        { label: copy.uploadedBy, value: uploadedBy ?? session.uploadedBy },
      ]}
      actions={
        <a
          href={viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="gh-btn gh-btn-soft text-sm"
        >
          <Eye className="size-3.5" aria-hidden />
          {copy.viewDocument}
        </a>
      }
    />
  );
}
