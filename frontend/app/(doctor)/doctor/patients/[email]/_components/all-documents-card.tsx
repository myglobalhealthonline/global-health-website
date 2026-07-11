import Link from "next/link";
import { FileSearch, FileText, Download } from "lucide-react";
import { fetchDoctorPatientDocuments } from "@/lib/api/doctor-api";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
// ponytail: cs/de/ro doctor.json don't yet carry these newer patients.*
// keys (only en/pt/es do); cast to the full (en) shape rather than
// editing locale JSON, which is out of scope for this change.
import type EnDoctorLocale from "@/locales/en/doctor.json";
type PatientsCopy = typeof EnDoctorLocale.patients;

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
  const locale = await getPageLocale();
  const { doctor: d } = loadLocaleBundle(locale);
  const p = d.patients as unknown as PatientsCopy;

  if (!result.ok) {
    return (
      <section className="gh-card gh-doctor-all-documents-card p-6">
        <h3 className="text-base font-bold text-[var(--portal-text)]">
          {p.allDocsTitle}
        </h3>
        <p className="mt-2 text-portal-compact text-rose-700">{result.message}</p>
      </section>
    );
  }

  const { uploads, generated } = result.data;
  const isEmpty = uploads.length === 0 && generated.length === 0;

  return (
    <section className="gh-card gh-doctor-all-documents-card p-6">
      <h3 className="text-base font-bold text-[var(--portal-text)]">
        {p.allDocsTitle}
      </h3>
      <p className="mt-1 text-portal-compact text-[var(--portal-muted)]">
        {p.allDocsDesc}
      </p>

      {isEmpty ? (
        <div className="mt-4 rounded-lg border border-dashed border-[var(--portal-line)] bg-[var(--portal-well)] p-5 text-center">
          <FileSearch className="mx-auto size-7 text-[var(--portal-muted)]" aria-hidden />
          <p className="mt-2 text-sm font-bold text-[var(--portal-text)]">
            {p.allDocsEmptyTitle}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-portal-meta text-[var(--portal-muted)]">
            {p.allDocsEmptyDesc}
          </p>
        </div>
      ) : (
        <div className="gh-doctor-document-section-list mt-4 grid gap-4">
          <Section
            title={p.doctorUploads}
            empty={p.noUploadedFiles}
            rows={uploads.map((u) => ({
              key: u.id,
              title: u.label || u.fileName || "Upload",
              meta: `${u.mimetype} · ${formatBytes(u.byteSize)}`,
              appointmentId: u.appointmentId,
              createdAt: u.createdAt,
              badge: null,
            }))}
            openLabel={d.common.open}
          />
          <Section
            title={p.generatedPdfs}
            empty={p.noGeneratedPdfs}
            rows={generated.map((g) => ({
              key: g.id,
              title: titleForGenerated(g, p),
              meta: g.fileName,
              appointmentId: g.appointmentId,
              createdAt: g.createdAt,
              badge: g.sentToPatient ? p.sent : p.pendingSend,
            }))}
            openLabel={d.common.open}
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
  openLabel,
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
  openLabel: string;
}) {
  return (
    <div className="gh-doctor-document-section">
      <h4 className="mb-2 text-portal-thead font-bold uppercase tracking-[0.08em] text-[var(--portal-muted)]">
        {title}
      </h4>
      {rows.length === 0 ? (
        <p className="text-portal-compact text-[var(--portal-muted)]">{empty}</p>
      ) : (
        <ul className="gh-doctor-document-list divide-y divide-[var(--portal-line)]">
          {rows.map((r) => (
            <li
              key={r.key}
              className="gh-doctor-document-row grid gap-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <div className="flex min-w-0 items-start gap-2">
                <FileText
                  className="size-4 shrink-0 text-[var(--portal-muted)]"
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="truncate text-portal-compact font-semibold text-[var(--portal-text)]">
                    {r.title}
                  </p>
                  <p className="text-portal-thead text-[var(--portal-muted)]">
                    {r.meta} · {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="gh-doctor-document-actions flex shrink-0 flex-wrap items-center gap-2">
                {r.badge ? (
                  <span className="rounded-full bg-[var(--portal-well)] px-2 py-0.5 text-portal-thead font-semibold text-[var(--portal-muted)]">
                    {r.badge}
                  </span>
                ) : null}
                <Link
                  href={`/doctor/appointments/${r.appointmentId}`}
                  className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-[var(--portal-line)] px-2 py-1 text-portal-meta font-semibold text-[var(--portal-primary)] hover:bg-[var(--portal-well)] sm:w-auto"
                >
                  <Download className="size-3" aria-hidden /> {openLabel}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function titleForGenerated(
  g: {
    documentType: string;
    metadata: unknown;
  },
  copy: {
    docTypeDocument: string;
    docTypeAbsenceCertificate: string;
    docTypeExamsPrescription: string;
    docTypeMedicinePrescription: string;
  },
): string {
  if (g.documentType === "OTHER") {
    const meta = g.metadata as { customLabel?: unknown } | null;
    if (meta && typeof meta.customLabel === "string" && meta.customLabel.trim()) {
      return meta.customLabel.trim();
    }
    return copy.docTypeDocument;
  }
  return {
    ABSENCE_CERTIFICATE: copy.docTypeAbsenceCertificate,
    EXAMS_PRESCRIPTION: copy.docTypeExamsPrescription,
    PRESCRIPTION: copy.docTypeMedicinePrescription,
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
