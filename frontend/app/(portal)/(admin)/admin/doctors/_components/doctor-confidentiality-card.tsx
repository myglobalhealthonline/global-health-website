import { Download, FileSignature } from "lucide-react";
import type { AdminDoctorConfidentialityDto } from "@/lib/admin/admin-api";
import { AdminCard, Pill } from "../../_components/atoms";

/**
 * Doctor confidentiality record, admin view.
 *
 * Two layers, both read-only here:
 *   - the in-portal electronic acceptance (what actually gates PHI access), and
 *   - the hand-signed PDF copies the doctor uploaded in their portal.
 *
 * The doctor owns the upload; admin downloads it as evidence.
 */

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("en-GB");
}

export function DoctorConfidentialityCard({
  record,
}: {
  record: AdminDoctorConfidentialityDto | null;
}) {
  return (
    <AdminCard>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 [font-family:var(--font-display)] text-base font-extrabold text-[var(--color-text-primary)]">
          Confidentiality agreement
        </h3>
        {record ? (
          <Pill tone={record.accepted ? "published" : "inactive"}>
            {record.accepted ? "Accepted" : "Not accepted"}
          </Pill>
        ) : null}
      </div>
      <p className="mb-4 mt-1 text-portal-compact text-[var(--color-text-muted)]">
        Electronic acceptance in the doctor portal, plus any hand-signed copy the doctor uploaded.
      </p>

      {!record ? (
        <p className="text-portal-compact text-[var(--color-text-muted)]">
          Could not load the confidentiality record.
        </p>
      ) : (
        <>
          <div className="gh-admin-doctor-field-grid grid gap-4 sm:grid-cols-2">
            <div className="gh-admin-doctor-field-row">
              <div className="text-portal-thead font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                Accepted on
              </div>
              <div className="mt-1 text-portal-body text-[var(--color-text-primary)]">
                {fmtDate(record.acceptedAt)}
              </div>
            </div>
            <div className="gh-admin-doctor-field-row">
              <div className="text-portal-thead font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                Version accepted / current
              </div>
              <div className="mt-1 font-mono text-portal-label text-[var(--color-text-primary)]">
                {(record.agreementVersion || "—") + " / " + record.currentVersion}
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-[var(--color-border)] pt-4">
            <div className="flex items-center gap-2">
              <FileSignature className="size-4 text-[var(--color-text-muted)]" aria-hidden />
              <span className="text-portal-thead font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                Signed copies uploaded by the doctor
              </span>
            </div>

            {!record.storageConfigured ? (
              <p className="mt-3 text-portal-compact text-[var(--color-text-muted)]">
                Object storage is not configured on this environment, so uploads cannot be listed.
              </p>
            ) : record.signedDocuments.length === 0 ? (
              <p className="mt-3 text-portal-compact text-[var(--color-text-muted)]">
                No signed copy uploaded yet.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-[var(--color-border)]">
                {record.signedDocuments.map((doc) => (
                  <li
                    key={doc.key}
                    className="flex flex-wrap items-center justify-between gap-3 py-2"
                  >
                    <div className="min-w-0">
                      <p
                        className="truncate text-portal-body font-semibold text-[var(--color-text-primary)]"
                        title={doc.filename}
                      >
                        {doc.filename}
                      </p>
                      <p className="text-portal-compact text-[var(--color-text-muted)]">
                        v{doc.agreementVersion} · {fmtSize(doc.size)} · {fmtDate(doc.uploadedAt)}
                      </p>
                    </div>
                    <a
                      href={`/api/admin/confidentiality-signed/download?key=${encodeURIComponent(doc.key)}`}
                      className="gh-btn gh-btn-soft text-xs"
                    >
                      <Download className="size-3.5" aria-hidden /> Download
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </AdminCard>
  );
}
