"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Eye } from "lucide-react";

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
    <span className="inline-block max-w-[180px] truncate rounded-full bg-[var(--color-brand-mint-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-brand-primary)]">
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
    <section className="gh-doctor-history-section overflow-hidden rounded-md border border-[var(--color-border)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 bg-[var(--color-brand-primary)] px-4 py-2.5 text-left text-sm font-bold text-white"
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
    <div className="gh-doctor-doc-group border-t border-[var(--color-border)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)]"
      >
        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        {title}
        <span className="text-[var(--color-text-muted)]">({rows.length})</span>
      </button>
      {open ? <DocumentTable rows={rows} /> : null}
    </div>
  );
}

const TABLE_HEAD =
  "text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]";

function DocumentTable({ rows }: { rows: DocRow[] }) {
  return (
    <div className="gh-doctor-table-wrap overflow-x-auto">
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

function UploadsTable({ rows }: { rows: UploadRow[] }) {
  return (
    <div className="gh-doctor-table-wrap overflow-x-auto">
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
      <p className="text-[13px] text-[var(--color-text-muted)]">Loading consultation history…</p>
    );
  }

  if (!data) {
    return (
      <p className="text-[13px] text-[var(--color-text-muted)]">Could not load history.</p>
    );
  }

  const hasAny =
    data.medicalNotes.length > 0 ||
    data.generatedDocuments.total > 0 ||
    data.uploadedFiles.length > 0;

  if (!hasAny) {
    return (
      <p className="text-[13px] text-[var(--color-text-muted)]">
        No consultation documents yet.
      </p>
    );
  }

  const gen = data.generatedDocuments;

  return (
    <div className="gh-doctor-consultation-history space-y-4">
      {data.medicalNotes.length > 0 ? (
        <HistorySection title="Medical notes" count={data.medicalNotes.length}>
          <div className="gh-doctor-table-wrap overflow-x-auto">
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
                      className="cursor-pointer border-t border-[var(--color-border)] hover:bg-[var(--color-background-soft)]"
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
                      <td className="max-w-[120px] truncate px-3 py-2.5 text-[var(--color-text-muted)]">
                        {n.symptoms?.trim() || "—"}
                      </td>
                      <td className="px-3 py-2.5">{n.createdByName}</td>
                      <td className="max-w-[160px] truncate px-3 py-2.5 text-[var(--color-text-muted)]">
                        {n.content.slice(0, 80)}
                        {n.content.length > 80 ? "…" : ""}
                      </td>
                      <td className="px-3 py-2.5">
                        {expandedNote === n.id ? (
                          <ChevronDown className="size-4 text-[var(--color-text-muted)]" />
                        ) : (
                          <ChevronRight className="size-4 text-[var(--color-text-muted)]" />
                        )}
                      </td>
                    </tr>
                    {expandedNote === n.id ? (
                      <tr className="border-t border-[var(--color-border)] bg-[var(--color-background-soft)]">
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
