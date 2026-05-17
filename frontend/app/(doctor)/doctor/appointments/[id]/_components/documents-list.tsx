"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import type { DoctorDocumentDto } from "@/lib/api/doctor-api";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Attach + browse clinical documents for an appointment. Uses
 * multipart upload via the same-origin proxy that buffers the bytes
 * (Railway cross-subdomain quirks). PDFs, JPEG/PNG/WebP/AVIF up to 10MB.
 */
export function DocumentsList({
  appointmentId,
  initialItems,
}: {
  appointmentId: string;
  initialItems: DoctorDocumentDto[];
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
      setItems((prev) => [json.data!.document!, ...prev]);
      setLabel("");
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this document? The file will be removed from storage.")) {
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/doctor/documents/${id}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setError(json.message ?? "Could not delete");
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
          <span className="gh-field-label">Label (optional)</span>
          <input
            className="gh-input"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={200}
            placeholder="e.g. Lab report, X-ray scan, Referral letter"
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
          {pending ? "Uploading…" : "Upload document"}
        </button>
        {error ? (
          <p className="gh-status-warning rounded-md border px-3 py-2 text-[12.5px]">
            {error}
          </p>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="text-[13px] text-[var(--color-text-muted)]">
          No documents attached yet.
        </p>
      ) : (
        <ul className="grid gap-2">
          {items.map((d) => (
            <li
              key={d.id}
              className="flex items-center gap-3 rounded-md border border-[var(--color-border)] bg-white p-3"
            >
              <FileText
                className="size-5 shrink-0 text-[var(--color-text-muted)]"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-[var(--color-text-primary)]">
                  {d.label}
                </p>
                <p className="text-[11.5px] text-[var(--color-text-muted)]">
                  {d.mimetype} · {formatSize(d.byteSize)} ·{" "}
                  {new Date(d.createdAt).toLocaleString()}
                </p>
              </div>
              <a
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2 py-1 text-[12px] font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-background-soft)]"
              >
                <Download className="size-3.5" /> Open
              </a>
              <button
                type="button"
                onClick={() => remove(d.id)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-status-error)]"
                aria-label="Delete document"
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
