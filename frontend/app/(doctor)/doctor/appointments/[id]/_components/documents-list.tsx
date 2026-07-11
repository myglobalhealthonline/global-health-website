"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, FolderOpen, Trash2, Upload } from "lucide-react";
import type { DoctorDocumentDto } from "@/lib/api/doctor-api";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export type DocumentsListCopy = {
  fileTooLarge: string;
  uploadFailed: string;
  couldNotDelete: string;
  deleteConfirm: string;
  labelField: string;
  labelPlaceholder: string;
  uploading: string;
  uploadDocument: string;
  emptyTitle: string;
  emptyDesc: string;
  open: string;
  deleteAria: string;
};

// ponytail: this component has no current caller in the codebase — copy
// stays optional with an English fallback so it's safe if/when it gets used.
const DEFAULT_COPY: DocumentsListCopy = {
  fileTooLarge: "File too large (max 10MB).",
  uploadFailed: "Upload failed",
  couldNotDelete: "Could not delete",
  deleteConfirm: "Delete this document? The file will be removed from storage.",
  labelField: "Label (optional)",
  labelPlaceholder: "e.g. Lab report, X-ray scan, Referral letter",
  uploading: "Uploading…",
  uploadDocument: "Upload document",
  emptyTitle: "No appointment documents yet",
  emptyDesc:
    "Upload referrals, lab results, scans, or notes so the consultation record stays complete.",
  open: "Open",
  deleteAria: "Delete document",
};

/**
 * Attach + browse clinical documents for an appointment. Uses
 * multipart upload via the same-origin proxy that buffers the bytes
 * (Railway cross-subdomain quirks). PDFs, JPEG/PNG/WebP/AVIF up to 10MB.
 */
export function DocumentsList({
  appointmentId,
  initialItems,
  copy = DEFAULT_COPY,
}: {
  appointmentId: string;
  initialItems: DoctorDocumentDto[];
  copy?: DocumentsListCopy;
}) {
  const router = useRouter();
  const [items, setItems] = useState<DoctorDocumentDto[]>(initialItems);
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
      setItems((prev) => [json.data!.document!, ...prev]);
      setLabel("");
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm(copy.deleteConfirm)) {
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/doctor/documents/${id}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setError(json.message ?? copy.couldNotDelete);
        return;
      }
      setItems((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    });
  }

  return (
    <div className="mt-3 grid gap-4">
      <div className="grid gap-2">
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
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp,image/avif"
          style={{ display: "none" }}
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
          className="gh-btn gh-btn-soft"
        >
          <Upload className="size-3.5" />
          {pending ? copy.uploading : copy.uploadDocument}
        </button>
        {error ? (
          <p className="gh-status-warning rounded-md border px-3 py-2 text-portal-label">
            {error}
          </p>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--portal-line)] bg-[var(--portal-well)] p-4 text-center">
          <FolderOpen
            className="mx-auto size-6 text-[var(--portal-muted)]"
            aria-hidden
          />
          <p className="mt-2 text-sm font-bold text-[var(--portal-text)]">{copy.emptyTitle}</p>
          <p className="mx-auto mt-1 max-w-sm text-portal-meta text-[var(--portal-muted)]">
            {copy.emptyDesc}
          </p>
        </div>
      ) : (
        <ul className="grid gap-2">
          {items.map((d) => (
            <li
              key={d.id}
              className="grid gap-3 rounded-md border border-[var(--portal-line)] bg-white p-3 sm:grid-cols-[auto_1fr_auto_auto] sm:items-center"
            >
              <FileText
                className="size-5 shrink-0 text-[var(--portal-muted)]"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-portal-compact font-semibold text-[var(--portal-text)]">
                  {d.label}
                </p>
                <p className="text-[11.5px] text-[var(--portal-muted)]">
                  {d.mimetype} · {formatSize(d.byteSize)} ·{" "}
                  {new Date(d.createdAt).toLocaleString()}
                </p>
              </div>
              <a
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-[var(--portal-line)] px-2 py-1 text-portal-meta font-semibold text-[var(--portal-text)] hover:bg-[var(--portal-well)] sm:w-auto"
              >
                <Download className="size-3.5" /> {copy.open}
              </a>
              <button
                type="button"
                onClick={() => remove(d.id)}
                className="inline-flex w-full items-center justify-center rounded-md border border-[var(--portal-line)] px-2 py-1 text-[var(--portal-muted)] hover:text-[var(--portal-danger)] sm:w-auto sm:border-0 sm:px-0"
                aria-label={copy.deleteAria}
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
