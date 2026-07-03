"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, ClipboardList, Eye, FileSearch } from "lucide-react";

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
    <span className="inline-block max-w-[180px] truncate rounded-full bg-[var(--portal-mint-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--portal-primary)]">
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
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
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
            <span className="text-[12px] font-semibold opacity-90">({count})</span>
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
}: {
  title: string;
  rows: DocRow[];
}) {
  const [open, setOpen] = useState(true);
  if (rows.length === 0) return null;
  return (
    <div className="gh-doctor-doc-group border-t border-[var(--portal-line)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-bold text-[var(--portal-text)] hover:bg-[var(--portal-well)]"
      >
        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        {title}
        <span className="text-[var(--portal-muted)]">({rows.length})</span>
      </button>
      {open ? <DocumentTable rows={rows} /> : null}
    </div>
  );
}

const TABLE_HEAD =
  "text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]";

function DocumentTable({ rows }: { rows: DocRow[] }) {
  return (
    <>
    <div className="grid gap-2 p-3 md:hidden">
      {rows.map((r) => (
        <DocumentMobileRow
          key={r.id}
          title={r.fileName}
          sessionDate={r.sessionDate}
          sessionTime={r.sessionTime}
          orderNumber={r.orderNumber}
          consultationTypeLabel={r.consultationTypeLabel}
          fileTypeLabel={r.fileTypeLabel}
          uploadedBy={r.uploadedBy}
          viewUrl={r.pdfUrl}
        />
      ))}
    </div>
    <div className="gh-doctor-table-wrap hidden overflow-x-auto md:block">
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
            <tr key={r.id} className="border-t border-[var(--portal-line)]">
              <td className="px-3 py-2.5 whitespace-nowrap">{r.sessionDate}</td>
              <td className="px-3 py-2.5 whitespace-nowrap">{r.sessionTime}</td>
              <td className="px-3 py-2.5">{r.orderNumber}</td>
              <td className="px-3 py-2.5">
                <SessionTypeBadge label={r.consultationTypeLabel} />
              </td>
              <td className="max-w-[200px] truncate px-3 py-2.5 font-medium">{r.fileName}</td>
              <td className="px-3 py-2.5">
                <FileTypeBadge label={r.fileTypeLabel} />
              </td>
              <td className="px-3 py-2.5">{r.uploadedBy}</td>
              <td className="px-3 py-2.5 text-right">
                <a
                  href={r.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--portal-line)] px-2.5 py-1 text-[12px] font-semibold text-[var(--portal-primary)] hover:bg-[var(--portal-well)]"
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
    </>
  );
}

function UploadsTable({ rows }: { rows: UploadRow[] }) {
  return (
    <>
    <div className="grid gap-2 p-3 md:hidden">
      {rows.map((u) => (
        <DocumentMobileRow
          key={u.id}
          title={u.fileName}
          sessionDate={u.sessionDate}
          sessionTime={u.sessionTime}
          orderNumber={u.orderNumber}
          consultationTypeLabel={u.consultationTypeLabel}
          fileTypeLabel={u.fileTypeLabel}
          uploadedBy={u.uploadedBy}
          viewUrl={u.viewUrl}
        />
      ))}
    </div>
    <div className="gh-doctor-table-wrap hidden overflow-x-auto md:block">
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
            <tr key={u.id} className="border-t border-[var(--portal-line)]">
              <td className="px-3 py-2.5 whitespace-nowrap">{u.sessionDate}</td>
              <td className="px-3 py-2.5 whitespace-nowrap">{u.sessionTime}</td>
              <td className="px-3 py-2.5">{u.orderNumber}</td>
              <td className="px-3 py-2.5">
                <SessionTypeBadge label={u.consultationTypeLabel} />
              </td>
              <td className="max-w-[200px] truncate px-3 py-2.5 font-medium">{u.fileName}</td>
              <td className="px-3 py-2.5">
                <FileTypeBadge label={u.fileTypeLabel} />
              </td>
              <td className="px-3 py-2.5">{u.uploadedBy}</td>
              <td className="px-3 py-2.5 text-right">
                <a
                  href={u.viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--portal-line)] px-2.5 py-1 text-[12px] font-semibold text-[var(--portal-primary)] hover:bg-[var(--portal-well)]"
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
    </>
  );
}

function DocumentMobileRow({
  title,
  sessionDate,
  sessionTime,
  orderNumber,
  consultationTypeLabel,
  fileTypeLabel,
  uploadedBy,
  viewUrl,
}: {
  title: string;
  sessionDate: string;
  sessionTime: string;
  orderNumber: string;
  consultationTypeLabel: string;
  fileTypeLabel: string;
  uploadedBy: string;
  viewUrl: string;
}) {
  return (
    <article className="rounded-md border border-[var(--portal-line)] bg-[var(--portal-well)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold text-[var(--portal-text)]">
            {title}
          </p>
          <p className="mt-1 text-[11px] text-[var(--portal-muted)]">
            {sessionDate} at {sessionTime} · order {orderNumber}
          </p>
        </div>
        <FileTypeBadge label={fileTypeLabel} />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <SessionTypeBadge label={consultationTypeLabel} />
        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[var(--portal-muted)]">
          {uploadedBy}
        </span>
      </div>
      <a
        href={viewUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-md border border-[var(--portal-line)] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[var(--portal-primary)]"
      >
        <Eye className="size-3.5" aria-hidden />
        View
      </a>
    </article>
  );
}

export function ConsultationHistoryPanel({ patientEmail }: { patientEmail: string }) {
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
        Could not load consultation history.
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
          No consultation documents yet
        </p>
        <p className="mx-auto mt-1 max-w-sm text-[12px] text-[var(--portal-muted)]">
          Notes, uploaded files, and generated documents will appear here after appointments are completed.
        </p>
      </div>
    );
  }

  const gen = data.generatedDocuments;

  return (
    <div className="gh-doctor-consultation-history space-y-4">
      {data.medicalNotes.length > 0 ? (
        <HistorySection title="Medical notes" count={data.medicalNotes.length}>
          <div className="grid gap-2 p-3 md:hidden">
            {data.medicalNotes.map((n) => (
              <article
                key={n.id}
                className="rounded-md border border-[var(--portal-line)] bg-[var(--portal-well)] p-3"
              >
                <p className="flex items-center gap-2 text-[13px] font-bold text-[var(--portal-text)]">
                  <ClipboardList className="size-4 text-[var(--portal-primary)]" aria-hidden />
                  {n.sessionDate} at {n.sessionTime}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <SessionTypeBadge label={n.consultationTypeLabel} />
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[var(--portal-muted)]">
                    {n.createdByName}
                  </span>
                </div>
                <p className="mt-2 text-[12px] text-[var(--portal-muted)]">
                  {n.symptoms?.trim() || "No symptoms recorded"}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-[13px] text-[var(--portal-text)]">
                  {n.content}
                </p>
              </article>
            ))}
          </div>
          <div className="gh-doctor-table-wrap hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className={TABLE_HEAD}>
                  <th className="px-3 py-2 text-left">Session date</th>
                  <th className="px-3 py-2 text-left">Time</th>
                  <th className="px-3 py-2 text-left">Order #</th>
                  <th className="px-3 py-2 text-left">Session type</th>
                  <th className="px-3 py-2 text-left">Symptoms</th>
                  <th className="px-3 py-2 text-left">Doctor</th>
                  <th className="px-3 py-2 text-left">Medical notes</th>
                  <th className="px-3 py-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {data.medicalNotes.map((n) => (
                  <Fragment key={n.id}>
                    <tr
                      className="cursor-pointer border-t border-[var(--portal-line)] hover:bg-[var(--portal-well)]"
                      onClick={() =>
                        setExpandedNote(expandedNote === n.id ? null : n.id)
                      }
                    >
                      <td className="px-3 py-2.5 whitespace-nowrap">{n.sessionDate}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{n.sessionTime}</td>
                      <td className="px-3 py-2.5">{n.orderNumber}</td>
                      <td className="px-3 py-2.5">
                        <SessionTypeBadge label={n.consultationTypeLabel} />
                      </td>
                      <td className="max-w-[120px] truncate px-3 py-2.5 text-[var(--portal-muted)]">
                        {n.symptoms?.trim() || "—"}
                      </td>
                      <td className="px-3 py-2.5">{n.createdByName}</td>
                      <td className="max-w-[160px] truncate px-3 py-2.5 text-[var(--portal-muted)]">
                        {n.content.slice(0, 80)}
                        {n.content.length > 80 ? "…" : ""}
                      </td>
                      <td className="px-3 py-2.5">
                        {expandedNote === n.id ? (
                          <ChevronDown className="size-4 text-[var(--portal-muted)]" />
                        ) : (
                          <ChevronRight className="size-4 text-[var(--portal-muted)]" />
                        )}
                      </td>
                    </tr>
                    {expandedNote === n.id ? (
                      <tr className="border-t border-[var(--portal-line)] bg-[var(--portal-well)]">
                        <td colSpan={8} className="px-4 py-3 whitespace-pre-wrap">
                          {n.content}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </HistorySection>
      ) : null}

      {gen.total > 0 ? (
        <HistorySection title="Generated documents" count={gen.total}>
          <DocTypeGroup title="Exams prescriptions" rows={gen.examsPrescriptions} />
          <DocTypeGroup title="Absence certificates" rows={gen.absenceCertificates} />
          <DocTypeGroup title="Medicine prescriptions" rows={gen.medicinePrescriptions} />
          <DocTypeGroup title="Other" rows={gen.other} />
        </HistorySection>
      ) : null}

      {data.uploadedFiles.length > 0 ? (
        <HistorySection title="Uploaded files" count={data.uploadedFiles.length}>
          <UploadsTable rows={data.uploadedFiles} />
        </HistorySection>
      ) : null}
    </div>
  );
}
