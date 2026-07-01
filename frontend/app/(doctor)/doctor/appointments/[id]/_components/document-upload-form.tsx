"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Upload } from "lucide-react";
import type { DoctorDocumentDto } from "@/lib/api/doctor-api";

/**
 * Upload form for the appointment Documents tab (max 10MB PDF/images).
 */
export function DocumentUploadForm({
  appointmentId,
  onUploaded,
}: {
  appointmentId: string;
  onUploaded: (doc: DoctorDocumentDto) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function upload(file: File) {
    setError(null);
    if (file.size > 10 * 1024 * 1024) {
      setError("File too large (max 10MB).");
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
        setError(json.message ?? "Upload failed");
        return;
      }
      onUploaded(json.data.document);
      setLabel("");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-3 rounded-lg border border-[var(--color-border)] bg-white/75 p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[var(--color-background-soft)] text-[var(--color-brand-primary)]">
          <FileUp className="size-4" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-bold text-[var(--color-text-primary)]">
            Upload appointment document
          </p>
          <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
            Add clinical files that should stay attached to this patient appointment.
          </p>
        </div>
      </div>
      <label className="flex flex-col gap-1">
        <span className="gh-field-label">File type / label</span>
        <input
          className="gh-input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={200}
          placeholder="e.g. Lab report, X-ray scan, Referral letter"
        />
      </label>
      <div
        className="flex min-h-[100px] cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-background-soft)] px-4 py-6 text-center"
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
        }}
        role="button"
        tabIndex={0}
      >
        <Upload className="size-6 text-[var(--color-text-muted)]" aria-hidden />
        <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">
          Choose files (max 10MB)
        </p>
        <p className="text-[11px] text-[var(--color-text-muted)]">PDF, JPEG, PNG, WebP, or AVIF</p>
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
        {pending ? "Uploading…" : "Upload files"}
      </button>
      {error ? (
        <p className="gh-status-warning rounded-md border px-3 py-2 text-[12.5px]">{error}</p>
      ) : null}
    </div>
  );
}
