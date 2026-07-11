"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Eye, FileSearch } from "lucide-react";
import { ColumnPriorityTable, type ColumnPriorityField } from "@/components/ColumnPriorityTable";

type MedicalNoteRow = {
  id: string;
  appointmentId: string;
  content: string;
  consultationType: string | null;
  consultationTypeLabel: string;
  createdByName: string;
  createdAt: string;
  sessionDate: string;
  sessionTime: string;
  orderNumber: string;
  symptoms: string | null;
};

type DocRow = {
  id: string;
  appointmentId: string;
  fileName: string;
  documentType: string;
  fileTypeLabel: string;
  sentToPatient: boolean;
  createdAt: string;
  sessionDate: string;
  sessionTime: string;
  orderNumber: string;
  consultationType: string;
  consultationTypeLabel: string;
  uploadedBy: string;
  pdfUrl: string;
};

type UploadRow = {
  id: string;
  appointmentId: string;
  label: string;
  fileName: string;
  mimetype: string;
  fileTypeLabel: string;
  createdAt: string;
  sessionDate: string;
  sessionTime: string;
  orderNumber: string;
  consultationType: string;
  consultationTypeLabel: string;
  uploadedBy: string;
  viewUrl: string;
};

export type ConsultationHistoryCopy = {
  historyLoadError: string;
  historyEmptyTitle: string;
  historyEmptyDesc: string;
  medicalNotesTitle: string;
  colSessionDate: string;
  colTime: string;
  colOrderNumber: string;
  colSessionType: string;
  colSymptoms: string;
  colDoctor: string;
  noSymptomsRecorded: string;
  generatedDocumentsTitle: string;
  examsPrescriptionsGroup: string;
  absenceCertificatesGroup: string;
  medicinePrescriptionsGroup: string;
  otherGroup: string;
  uploadedFilesTitle: string;
  colFileName: string;
  colFileType: string;
  colUploadedBy: string;
  colView: string;
};

type HistoryData = {
  medicalNotes: MedicalNoteRow[];
  generatedDocuments: {
    total: number;
    rows: DocRow[];
    examsPrescriptions: DocRow[];
    absenceCertificates: DocRow[];
    medicinePrescriptions: DocRow[];
    other: DocRow[];
  };
  uploadedFiles: UploadRow[];
};

function SessionTypeBadge({ label }: { label: string }) {
  return (
    <span className="inline-block max-w-[180px] truncate rounded-full bg-[var(--portal-mint-soft)] px-2 py-0.5 text-portal-thead font-semibold text-[var(--portal-primary)]">
      {label}
    </span>
  );
}

function FileTypeBadge({ label }: { label: string }) {
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

function HistorySection({
  title,
  count,
  defaultOpen = true,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="gh-doctor-history-section overflow-hidden rounded-md border border-[var(--portal-line)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 bg-[var(--portal-primary)] px-4 py-2.5 text-left text-sm font-bold text-white"
      >
        <span className="flex items-center gap-2">
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          {title}
          {count !== undefined ? (
            <span className="text-portal-meta font-semibold opacity-90">({count})</span>
          ) : null}
        </span>
      </button>
      {open ? <div className="gh-doctor-history-body bg-white">{children}</div> : null}
    </section>
  );
}

function DocTypeGroup({
  title,
  rows,
  copy,
}: {
  title: string;
  rows: DocRow[];
  copy: ConsultationHistoryCopy;
}) {
  const [open, setOpen] = useState(true);
  if (rows.length === 0) return null;
  return (
    <div className="gh-doctor-doc-group border-t border-[var(--portal-line)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-portal-compact font-bold text-[var(--portal-text)] hover:bg-[var(--portal-well)]"
      >
        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        {title}
        <span className="text-[var(--portal-muted)]">({rows.length})</span>
      </button>
      {open ? <DocumentTable rows={rows} copy={copy} /> : null}
    </div>
  );
}

function ViewLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-md border border-[var(--portal-line)] px-2.5 py-1 text-portal-meta font-semibold text-[var(--portal-primary)] hover:bg-[var(--portal-well)]"
    >
      <Eye className="size-3.5" aria-hidden />
      {label}
    </a>
  );
}

type DocLikeRow = {
  id: string;
  sessionDate: string;
  sessionTime: string;
  orderNumber: string;
  consultationTypeLabel: string;
  fileName: string;
  fileTypeLabel: string;
  uploadedBy: string;
};

// Shared by DocumentTable (generated docs) and UploadsTable — identical
// 8-column layout, only the view-link target differs (pdfUrl vs viewUrl).
function DocumentsTable<T extends DocLikeRow>({
  rows,
  copy,
  getViewUrl,
}: {
  rows: T[];
  copy: ConsultationHistoryCopy;
  getViewUrl: (row: T) => string;
}) {
  const fields: ColumnPriorityField<T>[] = [
    { key: "sessionDate", label: copy.colSessionDate, priority: 1, render: (r) => <span className="whitespace-nowrap">{r.sessionDate}</span> },
    { key: "time", label: copy.colTime, priority: 3, render: (r) => <span className="whitespace-nowrap">{r.sessionTime}</span> },
    { key: "order", label: copy.colOrderNumber, priority: 3, render: (r) => r.orderNumber },
    { key: "sessionType", label: copy.colSessionType, priority: 2, render: (r) => <SessionTypeBadge label={r.consultationTypeLabel} /> },
    {
      key: "fileName",
      label: copy.colFileName,
      priority: 1,
      cardPrimary: true,
      render: (r) => (
        <span className="block max-w-[200px] truncate font-medium" title={r.fileName}>
          {r.fileName}
        </span>
      ),
    },
    { key: "fileType", label: copy.colFileType, priority: 2, render: (r) => <FileTypeBadge label={r.fileTypeLabel} /> },
    { key: "uploadedBy", label: copy.colUploadedBy, priority: 4, render: (r) => r.uploadedBy },
    {
      key: "view",
      label: copy.colView,
      priority: 2,
      align: "right",
      desktopOnly: true,
      render: (r) => <ViewLink href={getViewUrl(r)} label={copy.colView} />,
    },
  ];

  return (
    <ColumnPriorityTable
      fields={fields}
      rows={rows}
      getRowKey={(r) => r.id}
      cardActions={(r) => <ViewLink href={getViewUrl(r)} label={copy.colView} />}
    />
  );
}

function DocumentTable({ rows, copy }: { rows: DocRow[]; copy: ConsultationHistoryCopy }) {
  return <DocumentsTable rows={rows} copy={copy} getViewUrl={(r) => r.pdfUrl} />;
}

function UploadsTable({ rows, copy }: { rows: UploadRow[]; copy: ConsultationHistoryCopy }) {
  return <DocumentsTable rows={rows} copy={copy} getViewUrl={(r) => r.viewUrl} />;
}

export function ConsultationHistoryPanel({
  patientEmail,
  strings: copy,
}: {
  patientEmail: string;
  strings: ConsultationHistoryCopy;
}) {
  const [data, setData] = useState<HistoryData | null>(null);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(
      `/api/doctor/patients/${encodeURIComponent(patientEmail)}/consultation-history`,
    );
    const json = (await res.json()) as { ok?: boolean; data?: HistoryData };
    if (json.ok && json.data) setData(json.data);
    setLoading(false);
  }, [patientEmail]);

  useEffect(() => {
    // Fetch-on-mount/dep-change — load itself is the setState source.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="rounded-lg border border-[var(--portal-line)] bg-white/75 p-4">
        <div className="h-4 w-40 rounded bg-[var(--portal-well)]" />
        <div className="mt-3 grid gap-2">
          <div className="h-16 rounded bg-[var(--portal-well)]" />
          <div className="h-16 rounded bg-[var(--portal-well)]" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        {copy.historyLoadError}
      </div>
    );
  }

  const hasAny =
    data.medicalNotes.length > 0 ||
    data.generatedDocuments.total > 0 ||
    data.uploadedFiles.length > 0;

  if (!hasAny) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--portal-line)] bg-[var(--portal-well)] p-5 text-center">
        <FileSearch className="mx-auto size-7 text-[var(--portal-muted)]" aria-hidden />
        <p className="mt-2 text-sm font-bold text-[var(--portal-text)]">
          {copy.historyEmptyTitle}
        </p>
        <p className="mx-auto mt-1 max-w-sm text-portal-meta text-[var(--portal-muted)]">
          {copy.historyEmptyDesc}
        </p>
      </div>
    );
  }

  const gen = data.generatedDocuments;

  const medicalNoteFields: ColumnPriorityField<MedicalNoteRow>[] = [
    { key: "sessionDate", label: copy.colSessionDate, priority: 1, render: (n) => <span className="whitespace-nowrap">{n.sessionDate}</span> },
    { key: "time", label: copy.colTime, priority: 3, render: (n) => <span className="whitespace-nowrap">{n.sessionTime}</span> },
    { key: "order", label: copy.colOrderNumber, priority: 3, render: (n) => n.orderNumber },
    { key: "sessionType", label: copy.colSessionType, priority: 2, render: (n) => <SessionTypeBadge label={n.consultationTypeLabel} /> },
    {
      key: "symptoms",
      label: copy.colSymptoms,
      priority: 3,
      render: (n) => (
        <span className="block max-w-[120px] truncate text-[var(--portal-muted)]">
          {n.symptoms?.trim() || copy.noSymptomsRecorded}
        </span>
      ),
    },
    { key: "doctor", label: copy.colDoctor, priority: 4, render: (n) => n.createdByName },
    {
      key: "note",
      label: copy.medicalNotesTitle,
      priority: 1,
      cardPrimary: true,
      render: (n) =>
        expandedNote === n.id ? (
          <span className="flex items-center gap-2 whitespace-pre-wrap text-[var(--portal-text)]">
            <ChevronDown className="size-3.5 shrink-0 text-[var(--portal-muted)]" />
            {n.content}
          </span>
        ) : (
          <span className="flex max-w-[160px] items-center gap-2 truncate text-[var(--portal-muted)]">
            <ChevronRight className="size-3.5 shrink-0" />
            {n.content.slice(0, 80)}
            {n.content.length > 80 ? "…" : ""}
          </span>
        ),
    },
  ];

  return (
    <div className="gh-doctor-consultation-history space-y-4">
      {data.medicalNotes.length > 0 ? (
        <HistorySection title={copy.medicalNotesTitle} count={data.medicalNotes.length}>
          <ColumnPriorityTable
            fields={medicalNoteFields}
            rows={data.medicalNotes}
            getRowKey={(n) => n.id}
            onRowClick={(n) => setExpandedNote(expandedNote === n.id ? null : n.id)}
            renderExpandedRow={(n, columnCount) =>
              expandedNote === n.id ? (
                <tr className="border-t border-[var(--portal-line)] bg-[var(--portal-well)]">
                  <td colSpan={columnCount} className="px-4 py-3 whitespace-pre-wrap">
                    {n.content}
                  </td>
                </tr>
              ) : null
            }
          />
        </HistorySection>
      ) : null}

      {gen.total > 0 ? (
        <HistorySection title={copy.generatedDocumentsTitle} count={gen.total}>
          <DocTypeGroup title={copy.examsPrescriptionsGroup} rows={gen.examsPrescriptions} copy={copy} />
          <DocTypeGroup title={copy.absenceCertificatesGroup} rows={gen.absenceCertificates} copy={copy} />
          <DocTypeGroup title={copy.medicinePrescriptionsGroup} rows={gen.medicinePrescriptions} copy={copy} />
          <DocTypeGroup title={copy.otherGroup} rows={gen.other} copy={copy} />
        </HistorySection>
      ) : null}

      {data.uploadedFiles.length > 0 ? (
        <HistorySection title={copy.uploadedFilesTitle} count={data.uploadedFiles.length}>
          <UploadsTable rows={data.uploadedFiles} copy={copy} />
        </HistorySection>
      ) : null}
    </div>
  );
}
