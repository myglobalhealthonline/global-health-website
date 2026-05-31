"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Download } from "lucide-react";

type MedicalNoteRow = {
  id: string;
  appointmentId: string;
  content: string;
  consultationType: string | null;
  createdByName: string;
  createdAt: string;
  sessionDate: string;
  symptoms: string | null;
};

type DocRow = {
  id: string;
  appointmentId: string;
  fileName: string;
  sentToPatient: boolean;
  createdAt: string;
  sessionDate: string;
  consultationType: string;
};

type UploadRow = {
  id: string;
  appointmentId: string;
  label: string;
  fileName: string;
  createdAt: string;
  sessionDate: string;
  consultationType: string;
};

type HistoryData = {
  medicalNotes: MedicalNoteRow[];
  generatedDocuments: {
    examsPrescriptions: DocRow[];
    absenceCertificates: DocRow[];
    medicinePrescriptions: DocRow[];
    other: DocRow[];
  };
  uploadedFiles: UploadRow[];
};

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function DocSubSection({ title, rows }: { title: string; rows: DocRow[] }) {
  const [open, setOpen] = useState(rows.length > 0);
  if (rows.length === 0) return null;
  return (
    <div className="border-t border-[var(--color-border)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)]"
      >
        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        {title} ({rows.length})
      </button>
      {open ? (
        <ul className="px-3 pb-3 text-[13px]">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 py-1.5">
              <span className="text-[var(--color-text-muted)]">
                {formatWhen(r.sessionDate)} · {r.consultationType}
              </span>
              <a
                href={`/api/doctor/documents/generated/${r.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-[var(--color-brand-primary)]"
              >
                <Download className="size-3" /> {r.fileName}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
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
    data.generatedDocuments.examsPrescriptions.length > 0 ||
    data.generatedDocuments.absenceCertificates.length > 0 ||
    data.generatedDocuments.medicinePrescriptions.length > 0 ||
    data.generatedDocuments.other.length > 0 ||
    data.uploadedFiles.length > 0;

  if (!hasAny) {
    return (
      <p className="text-[13px] text-[var(--color-text-muted)]">
        No consultation documents yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {data.medicalNotes.length > 0 ? (
        <section>
          <h4 className="text-sm font-bold text-[var(--color-text-primary)]">Medical notes</h4>
          <table className="mt-2 w-full text-[13px]">
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                <th className="py-2 text-left">Session</th>
                <th className="py-2 text-left">Type</th>
                <th className="py-2 text-left">Doctor</th>
                <th className="py-2 text-left">Preview</th>
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
                    <td className="py-2">{formatWhen(n.sessionDate)}</td>
                    <td className="py-2">{n.consultationType ?? "—"}</td>
                    <td className="py-2">{n.createdByName}</td>
                    <td className="py-2 max-w-[200px] truncate text-[var(--color-text-muted)]">
                      {n.content.slice(0, 80)}
                      {n.content.length > 80 ? "…" : ""}
                    </td>
                  </tr>
                  {expandedNote === n.id ? (
                    <tr className="border-t border-[var(--color-border)] bg-[var(--color-background-soft)]">
                      <td colSpan={4} className="px-3 py-3 whitespace-pre-wrap">
                        {n.symptoms ? (
                          <p className="mb-2 text-xs text-[var(--color-text-muted)]">
                            <strong>Symptoms:</strong> {n.symptoms}
                          </p>
                        ) : null}
                        {n.content}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {(data.generatedDocuments.examsPrescriptions.length > 0 ||
        data.generatedDocuments.absenceCertificates.length > 0 ||
        data.generatedDocuments.medicinePrescriptions.length > 0 ||
        data.generatedDocuments.other.length > 0) && (
        <section className="rounded-md border border-[var(--color-border)]">
          <h4 className="px-3 py-2 text-sm font-bold text-[var(--color-text-primary)]">
            Generated documents
          </h4>
          <DocSubSection title="Exams prescriptions" rows={data.generatedDocuments.examsPrescriptions} />
          <DocSubSection title="Absence certificates" rows={data.generatedDocuments.absenceCertificates} />
          <DocSubSection title="Medicine prescriptions" rows={data.generatedDocuments.medicinePrescriptions} />
          <DocSubSection title="Other" rows={data.generatedDocuments.other} />
        </section>
      )}

      {data.uploadedFiles.length > 0 ? (
        <section>
          <h4 className="text-sm font-bold text-[var(--color-text-primary)]">Uploaded files</h4>
          <ul className="mt-2 space-y-1 text-[13px]">
            {data.uploadedFiles.map((u) => (
              <li key={u.id} className="flex justify-between gap-2 border-t border-[var(--color-border)] py-2">
                <span className="text-[var(--color-text-muted)]">
                  {formatWhen(u.sessionDate)} · {u.label}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
