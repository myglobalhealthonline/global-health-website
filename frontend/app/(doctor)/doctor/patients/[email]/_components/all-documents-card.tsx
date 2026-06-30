import Link from "next/link";
import { FileText, Download } from "lucide-react";
import { fetchDoctorPatientDocuments } from "@/lib/api/doctor-api";

/**
 * Server-rendered list of every clinical document this doctor shares
 * with the patient — unions `AppointmentDocument` (doctor uploads +
 * patient uploads via T7 token flow) and `GeneratedDocument` (system
 * PDFs) across every appointment.
 *
 * Each item links back to the originating appointment so the doctor
 * can jump into the workspace for context.
 */
export async function AllDocumentsCard({ email }: { email: string }) {
  const result = await fetchDoctorPatientDocuments(email);

  if (!result.ok) {
    return (
      <section className="gh-card gh-doctor-all-documents-card p-6">
        <h3 className="text-base font-bold text-[var(--color-text-primary)]">
          All documents
        </h3>
        <p className="mt-2 text-[13px] text-rose-700">{result.message}</p>
      </section>
    );
  }

  const { uploads, generated } = result.data;
  const isEmpty = uploads.length === 0 && generated.length === 0;

  return (
    <section className="gh-card gh-doctor-all-documents-card p-6">
      <h3 className="text-base font-bold text-[var(--color-text-primary)]">
        All documents
      </h3>
      <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
        Every upload + generated PDF across this patient&apos;s appointments
        with you. Tap an appointment to open the workspace.
      </p>

      {isEmpty ? (
        <p className="mt-4 text-[13px] text-[var(--color-text-muted)]">
          No documents on file.
        </p>
      ) : (
        <div className="gh-doctor-document-section-list mt-4 grid gap-4">
          <Section
            title="Doctor uploads"
            empty="No uploaded files."
            rows={uploads.map((u) => ({
              key: u.id,
              title: u.label || u.fileName || "Upload",
              meta: `${u.mimetype} · ${formatBytes(u.byteSize)}`,
              appointmentId: u.appointmentId,
              createdAt: u.createdAt,
              badge: null,
            }))}
          />
          <Section
            title="Generated PDFs"
            empty="No generated PDFs."
            rows={generated.map((g) => ({
              key: g.id,
              title: titleForGenerated(g),
              meta: g.fileName,
              appointmentId: g.appointmentId,
              createdAt: g.createdAt,
              badge: g.sentToPatient ? "Sent" : "Pending send",
            }))}
          />
        </div>
      )}
    </section>
  );
}

function Section({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: Array<{
    key: string;
    title: string;
    meta: string;
    appointmentId: string;
    createdAt: string;
    badge: string | null;
  }>;
}) {
  return (
    <div className="gh-doctor-document-section">
      <h4 className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
        {title}
      </h4>
      {rows.length === 0 ? (
        <p className="text-[13px] text-[var(--color-text-muted)]">{empty}</p>
      ) : (
        <ul className="gh-doctor-document-list divide-y divide-[var(--color-border)]">
          {rows.map((r) => (
            <li
              key={r.key}
              className="gh-doctor-document-row flex items-center justify-between gap-3 py-2"
            >
              <div className="flex min-w-0 items-start gap-2">
                <FileText
                  className="size-4 shrink-0 text-[var(--color-text-muted)]"
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-[var(--color-text-primary)]">
                    {r.title}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    {r.meta} · {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="gh-doctor-document-actions flex shrink-0 items-center gap-2">
                {r.badge ? (
                  <span className="rounded-full bg-[var(--color-background-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-text-muted)]">
                    {r.badge}
                  </span>
                ) : null}
                <Link
                  href={`/doctor/appointments/${r.appointmentId}`}
                  className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-brand-primary)] hover:underline"
                >
                  <Download className="size-3" aria-hidden /> Open
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function titleForGenerated(g: {
  documentType: string;
  metadata: unknown;
}): string {
  if (g.documentType === "OTHER") {
    const meta = g.metadata as { customLabel?: unknown } | null;
    if (meta && typeof meta.customLabel === "string" && meta.customLabel.trim()) {
      return meta.customLabel.trim();
    }
    return "Document";
  }
  return {
    ABSENCE_CERTIFICATE: "Medical absence certificate",
    EXAMS_PRESCRIPTION: "Examinations prescription",
    PRESCRIPTION: "Medical prescription",
  }[g.documentType] ?? g.documentType;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[i]}`;
}
