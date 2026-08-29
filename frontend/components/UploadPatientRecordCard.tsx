"use client";

import { useRef, useState, useTransition } from "react";
import { FileUp, Upload } from "lucide-react";

/**
 * "Upload a medical record for this patient" action, sitting next to
 * `SendPatientUploadLinkCard` on the admin appointment page.
 *
 * Writes the same `AppointmentDocument` row a doctor upload or a patient
 * upload-link upload writes, so the file shows up in the doctor's Documents
 * tab ("Uploaded files"), the doctor's patient record, and the patient
 * portal's medical files — no separate store.
 */
export type UploadPatientRecordCopy = {
  title: string;
  description: string;
  fieldLabel: string;
  labelPlaceholder: string;
  fieldFile: string;
  fileHint: string;
  upload: string;
  uploading: string;
  success: string;
  failed: string;
  pickFile: string;
};

export const DEFAULT_UPLOAD_PATIENT_RECORD_COPY: UploadPatientRecordCopy = {
  title: "Upload a medical record",
  description:
    "Attach a record on the patient's behalf. It lands on this appointment and appears in the doctor's Documents tab and in the patient's portal.",
  fieldLabel: "Document name",
  labelPlaceholder: "Blood test results",
  fieldFile: "File",
  fileHint: "PDF, JPG, PNG, WebP or AVIF · max 10 MB",
  upload: "Upload",
  uploading: "Uploading…",
  success: "Record uploaded.",
  failed: "Could not upload the record.",
  pickFile: "Choose a file first.",
};

type UploadResponse = {
  ok?: boolean;
  message?: string;
  data?: { document?: { id?: string; label?: string } };
};

export function UploadPatientRecordCard({
  endpoint,
  copy = DEFAULT_UPLOAD_PATIENT_RECORD_COPY,
  className,
}: {
  /** POST target, e.g. `/api/admin/appointments/<id>/documents`. */
  endpoint: string;
  copy?: UploadPatientRecordCopy;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function submit() {
    const file = fileRef.current?.files?.[0] ?? null;
    if (!file) {
      setError(copy.pickFile);
      return;
    }
    setError(null);
    startTransition(async () => {
      const form = new FormData();
      // `label` goes in before `file` so it is already on `file.fields` by the
      // time the backend buffers the file part.
      if (label.trim()) form.append("label", label.trim());
      form.append("file", file);
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          body: form,
          credentials: "include",
        });
        const json = (await res.json().catch(() => ({}))) as UploadResponse;
        if (!res.ok || !json.ok) {
          setError(json.message ?? copy.failed);
          return;
        }
        setUploaded((prev) => [
          json.data?.document?.label ?? file.name,
          ...prev,
        ]);
        setLabel("");
        setFileName(null);
        if (fileRef.current) fileRef.current.value = "";
      } catch {
        setError(copy.failed);
      }
    });
  }

  return (
    <div
      className={`grid gap-3 rounded-lg border border-[var(--portal-line)] bg-white/75 p-3 shadow-sm ${className ?? ""}`}
    >
      <div className="flex items-start gap-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[var(--portal-well)] text-[var(--portal-primary)]">
          <FileUp className="size-4" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-bold text-[var(--portal-text)]">{copy.title}</p>
          <p className="mt-1 text-portal-meta text-[var(--portal-muted)]">{copy.description}</p>
        </div>
      </div>

      <label className="grid gap-1">
        <span className="gh-field-label">{copy.fieldLabel}</span>
        <input
          type="text"
          className="gh-input"
          value={label}
          maxLength={200}
          disabled={pending}
          placeholder={copy.labelPlaceholder}
          onChange={(e) => setLabel(e.target.value)}
        />
      </label>

      <label className="grid gap-1">
        <span className="gh-field-label">{copy.fieldFile}</span>
        <input
          ref={fileRef}
          type="file"
          className="gh-input"
          accept="application/pdf,image/jpeg,image/png,image/webp,image/avif"
          disabled={pending}
          onChange={(e) => {
            setFileName(e.target.files?.[0]?.name ?? null);
            setError(null);
          }}
        />
        <span className="text-portal-meta text-[var(--portal-muted)]">{copy.fileHint}</span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending || !fileName}
          onClick={() => submit()}
          className="gh-btn gh-btn-primary text-sm"
        >
          <Upload className="size-3.5" aria-hidden />
          {pending ? copy.uploading : copy.upload}
        </button>
      </div>

      {uploaded.length ? (
        <ul className="grid gap-1 text-portal-meta text-[var(--portal-muted)]">
          {uploaded.map((name, i) => (
            <li key={`${name}-${i}`}>
              {copy.success} — {name}
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p className="gh-status-warning rounded-md border px-3 py-2 text-portal-label">{error}</p>
      ) : null}
    </div>
  );
}
