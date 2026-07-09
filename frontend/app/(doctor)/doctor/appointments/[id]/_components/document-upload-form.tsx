"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Upload } from "lucide-react";
import type { DoctorDocumentDto } from "@/lib/api/doctor-api";

export type DocumentUploadFormCopy = {
  fileTooLarge: string;
  uploadFailed: string;
  title: string;
  description: string;
  labelField: string;
  labelPlaceholder: string;
  chooseFiles: string;
  acceptedTypes: string;
  uploading: string;
  uploadFiles: string;
};

/**
 * Upload form for the appointment Documents tab (max 10MB PDF/images).
 */
export function DocumentUploadForm({
  appointmentId,
  onUploaded,
  copy,
}: {
  appointmentId: string;
  onUploaded: (doc: DoctorDocumentDto) => void;
  copy: DocumentUploadFormCopy;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function upload(file: File) {
    setError(null);
    if (file.size > 10 * 1024 * 1024) {
      setError(copy.fileTooLarge);
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.append("file", file);
      const trimmed = label.trim();
      if (trimmed) fd.append("label", trimmed);
      const res = await fetch(
        `/api/doctor/appointments/${appointmentId}/documents`,
        { method: "POST", body: fd },
      );
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        data?: { document?: DoctorDocumentDto };
      };
      if (!res.ok || !json.ok || !json.data?.document) {
        setError(json.message ?? copy.uploadFailed);
        return;
      }
      onUploaded(json.data.document);
      setLabel("");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-3 rounded-lg border border-[var(--portal-line)] bg-white/75 p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[var(--portal-well)] text-[var(--portal-primary)]">
          <FileUp className="size-4" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-bold text-[var(--portal-text)]">{copy.title}</p>
          <p className="mt-1 text-[12px] text-[var(--portal-muted)]">{copy.description}</p>
        </div>
      </div>
      <label className="flex flex-col gap-1">
        <span className="gh-field-label">{copy.labelField}</span>
        <input
          className="gh-input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={200}
          placeholder={copy.labelPlaceholder}
        />
      </label>
      <div
        className="flex min-h-[100px] cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-[var(--portal-line)] bg-[var(--portal-well)] px-4 py-6 text-center"
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
        }}
        role="button"
        tabIndex={0}
      >
        <Upload className="size-6 text-[var(--portal-muted)]" aria-hidden />
        <p className="text-[13px] font-semibold text-[var(--portal-text)]">{copy.chooseFiles}</p>
        <p className="text-[11px] text-[var(--portal-muted)]">{copy.acceptedTypes}</p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp,image/avif"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={pending}
        className="gh-btn gh-btn-primary w-full sm:w-auto"
      >
        <Upload className="size-3.5" />
        {pending ? copy.uploading : copy.uploadFiles}
      </button>
      {error ? (
        <p className="gh-status-warning rounded-md border px-3 py-2 text-[12.5px]">{error}</p>
      ) : null}
    </div>
  );
}
