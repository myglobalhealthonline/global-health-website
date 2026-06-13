"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Eye } from "lucide-react";

export type SessionMeta = {
  sessionDate: string;
  sessionTime: string;
  orderNumber: string;
  consultationTypeLabel: string;
  uploadedBy: string;
};

export function SessionTypeBadge({ label }: { label: string }) {
  return (
    <span className="inline-block max-w-[180px] truncate rounded-full bg-[var(--color-brand-mint-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-brand-primary)]">
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
  "text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]";

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
    <section id={id} className="overflow-hidden rounded-md border border-[var(--color-border)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 bg-[var(--color-brand-primary)] px-4 py-2.5 text-left text-sm font-bold text-white"
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
}: {
  rows: GeneratedDocTableRow[];
  session: SessionMeta;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-[13px]">
        <thead>
          <tr className={TABLE_HEAD}>
            <th className="px-3 py-2 text-left">Session date</th>
            <th className="px-3 py-2 text-left">Time</th>
            <th className="px-3 py-2 text-left">Order #</th>
            <th className="px-3 py-2 text-left">Session type</th>
            <th className="px-3 py-2 text-left">File name</th>
            <th className="px-3 py-2 text-left">File type</th>
            <th className="px-3 py-2 text-left">Uploaded by</th>
            <th className="px-3 py-2 text-right">View</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-[var(--color-border)]">
              <td className="px-3 py-2.5 whitespace-nowrap">{session.sessionDate}</td>
              <td className="px-3 py-2.5 whitespace-nowrap">{session.sessionTime}</td>
              <td className="px-3 py-2.5">{session.orderNumber}</td>
              <td className="px-3 py-2.5">
                <SessionTypeBadge label={session.consultationTypeLabel} />
              </td>
              <td className="max-w-[200px] truncate px-3 py-2.5 font-medium">{r.fileName}</td>
              <td className="px-3 py-2.5">
                <FileTypeBadge label={r.fileTypeLabel} />
              </td>
              <td className="px-3 py-2.5">{session.uploadedBy}</td>
              <td className="px-3 py-2.5 text-right">
                <a
                  href={r.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2.5 py-1 text-[12px] font-semibold text-[var(--color-brand-primary)] hover:bg-[var(--color-background-soft)]"
                >
                  <Eye className="size-3.5" aria-hidden />
                  View
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
}: {
  rows: UploadDocTableRow[];
  session: SessionMeta;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-[13px]">
        <thead>
          <tr className={TABLE_HEAD}>
            <th className="px-3 py-2 text-left">Session date</th>
            <th className="px-3 py-2 text-left">Time</th>
            <th className="px-3 py-2 text-left">Order #</th>
            <th className="px-3 py-2 text-left">Session type</th>
            <th className="px-3 py-2 text-left">File name</th>
            <th className="px-3 py-2 text-left">File type</th>
            <th className="px-3 py-2 text-left">Uploaded by</th>
            <th className="px-3 py-2 text-right">View</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id} className="border-t border-[var(--color-border)]">
              <td className="px-3 py-2.5 whitespace-nowrap">{session.sessionDate}</td>
              <td className="px-3 py-2.5 whitespace-nowrap">{session.sessionTime}</td>
              <td className="px-3 py-2.5">{session.orderNumber}</td>
              <td className="px-3 py-2.5">
                <SessionTypeBadge label={session.consultationTypeLabel} />
              </td>
              <td className="max-w-[200px] truncate px-3 py-2.5 font-medium">{u.fileName}</td>
              <td className="px-3 py-2.5">
                <FileTypeBadge label={u.fileTypeLabel} />
              </td>
              <td className="px-3 py-2.5">{session.uploadedBy}</td>
              <td className="px-3 py-2.5 text-right">
                <a
                  href={u.viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2.5 py-1 text-[12px] font-semibold text-[var(--color-brand-primary)] hover:bg-[var(--color-background-soft)]"
                >
                  <Eye className="size-3.5" aria-hidden />
                  View
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DocTypeGroup({
  title,
  rows,
  session,
}: {
  title: string;
  rows: GeneratedDocTableRow[];
  session: SessionMeta;
}) {
  const [open, setOpen] = useState(false);
  if (rows.length === 0) return null;
  return (
    <div className="border-t border-[var(--color-border)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)]"
      >
        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        {title}
        <span className="text-[var(--color-text-muted)]">({rows.length})</span>
      </button>
      {open ? <GeneratedDocumentsTable rows={rows} session={session} /> : null}
    </div>
  );
}
