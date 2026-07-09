"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Eye, FileText } from "lucide-react";
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
    <span className="inline-block max-w-[180px] truncate rounded-full bg-[var(--portal-mint-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--portal-primary)]">
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
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
      {label}
    </span>
  );
}

const TABLE_HEAD =
  "text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]";

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
              className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-extrabold leading-none text-[#0a281f]"
              aria-label={`${count} to send`}
            >
              {count}
            </span>
          ) : count !== undefined ? (
            <span className="text-[12px] font-semibold opacity-90">({count})</span>
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
};

export function GeneratedDocumentsTable({
  rows,
  session,
  copy = DEFAULT_DOCUMENT_TABLES_COPY,
}: {
  rows: GeneratedDocTableRow[];
  session: SessionMeta;
  copy?: DocumentTablesCopy;
}) {
  return (
    <>
    <div className="hidden md:block gh-doctor-table-wrap overflow-x-auto">
      <table className="w-full min-w-[720px] text-[13px]">
        <thead>
          <tr className={TABLE_HEAD}>
            <th className="px-3 py-2 text-left">{copy.colSessionDate}</th>
            <th className="px-3 py-2 text-left">{copy.colTime}</th>
            <th className="px-3 py-2 text-left">{copy.colOrderNumber}</th>
            <th className="px-3 py-2 text-left">{copy.colSessionType}</th>
            <th className="px-3 py-2 text-left">{copy.colFileName}</th>
            <th className="px-3 py-2 text-left">{copy.colFileType}</th>
            <th className="px-3 py-2 text-left">{copy.colUploadedBy}</th>
            <th className="px-3 py-2 text-right">{copy.colView}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-[var(--portal-line)]">
              <td className="px-3 py-2.5 whitespace-nowrap">{session.sessionDate}</td>
              <td className="px-3 py-2.5 whitespace-nowrap">{session.sessionTime}</td>
              <td className="px-3 py-2.5">{session.orderNumber}</td>
              <td className="px-3 py-2.5">
                <SessionTypeBadge label={session.consultationTypeLabel} />
              </td>
              <td className="max-w-[200px] px-3 py-2.5">
                <DocumentRow icon={<FileText className="size-4" />} title={r.fileName} />
              </td>
              <td className="px-3 py-2.5">
                <FileTypeBadge label={r.fileTypeLabel} />
              </td>
              <td className="px-3 py-2.5">{session.uploadedBy}</td>
              <td className="px-3 py-2.5 text-right">
                <a
                  href={r.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--portal-line)] px-2.5 py-1 text-[12px] font-semibold text-[var(--portal-primary)] hover:bg-[var(--portal-well)]"
                >
                  <Eye className="size-3.5" aria-hidden />
                  {copy.view}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="grid gap-3 p-3 md:hidden">
      {rows.map((r) => (
        <DocumentMobileCard
          key={r.id}
          fileName={r.fileName}
          fileTypeLabel={r.fileTypeLabel}
          viewUrl={r.pdfUrl}
          session={session}
          copy={copy}
        />
      ))}
    </div>
    </>
  );
}

export type UploadDocTableRow = {
  id: string;
  fileName: string;
  fileTypeLabel: string;
  viewUrl: string;
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
  return (
    <>
    <div className="hidden md:block gh-doctor-table-wrap overflow-x-auto">
      <table className="w-full min-w-[720px] text-[13px]">
        <thead>
          <tr className={TABLE_HEAD}>
            <th className="px-3 py-2 text-left">{copy.colSessionDate}</th>
            <th className="px-3 py-2 text-left">{copy.colTime}</th>
            <th className="px-3 py-2 text-left">{copy.colOrderNumber}</th>
            <th className="px-3 py-2 text-left">{copy.colSessionType}</th>
            <th className="px-3 py-2 text-left">{copy.colFileName}</th>
            <th className="px-3 py-2 text-left">{copy.colFileType}</th>
            <th className="px-3 py-2 text-left">{copy.colUploadedBy}</th>
            <th className="px-3 py-2 text-right">{copy.colView}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id} className="border-t border-[var(--portal-line)]">
              <td className="px-3 py-2.5 whitespace-nowrap">{session.sessionDate}</td>
              <td className="px-3 py-2.5 whitespace-nowrap">{session.sessionTime}</td>
              <td className="px-3 py-2.5">{session.orderNumber}</td>
              <td className="px-3 py-2.5">
                <SessionTypeBadge label={session.consultationTypeLabel} />
              </td>
              <td className="max-w-[200px] px-3 py-2.5">
                <DocumentRow icon={<FileText className="size-4" />} title={u.fileName} />
              </td>
              <td className="px-3 py-2.5">
                <FileTypeBadge label={u.fileTypeLabel} />
              </td>
              <td className="px-3 py-2.5">{session.uploadedBy}</td>
              <td className="px-3 py-2.5 text-right">
                <a
                  href={u.viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--portal-line)] px-2.5 py-1 text-[12px] font-semibold text-[var(--portal-primary)] hover:bg-[var(--portal-well)]"
                >
                  <Eye className="size-3.5" aria-hidden />
                  {copy.view}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="grid gap-3 p-3 md:hidden">
      {rows.map((u) => (
        <DocumentMobileCard
          key={u.id}
          fileName={u.fileName}
          fileTypeLabel={u.fileTypeLabel}
          viewUrl={u.viewUrl}
          session={session}
          copy={copy}
        />
      ))}
    </div>
    </>
  );
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
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-bold text-[var(--portal-text)] hover:bg-[var(--portal-well)]"
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
  session,
  copy = DEFAULT_DOCUMENT_TABLES_COPY,
}: {
  fileName: string;
  fileTypeLabel: string;
  viewUrl: string;
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
        { label: copy.uploadedBy, value: session.uploadedBy },
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
