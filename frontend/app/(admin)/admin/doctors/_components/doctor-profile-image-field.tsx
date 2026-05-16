"use client";

import { useRef, useState } from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";

type Props = {
  initialPath?: string;
};

/**
 * Doctor profile image picker.
 *
 * - Same-origin upload via `/api/admin/media/upload` (proxy forwards the
 *   session cookie to the backend server-side).
 * - Shows a thumbnail preview when a path is set, with "Replace" and
 *   "Remove" buttons overlaid on the image.
 * - Empty state is a dashed drop-zone with a single Upload button.
 * - Manual URL input stays visible below the preview so the operator can
 *   paste an external URL or a `/media/...` key if needed.
 *
 * Hidden form input named `profileImagePath` carries the persisted path
 * back to the parent <form> server action.
 */

// Width of the preview thumbnail. Doctor photos are portrait-oriented so
// we use a 3:4 aspect ratio.
const PREVIEW_WIDTH = 220;
const PREVIEW_HEIGHT = 280;

function resolvePreviewSrc(path: string): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  // `/api/media/...` lives on the backend host in production. Use
  // NEXT_PUBLIC_API_URL when set; otherwise relative path works in dev.
  if (path.startsWith("/api/media/")) {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ?? "";
    return base ? `${base}${path}` : path;
  }
  return path;
}

function toPersistedPath(data?: { key?: string; publicUrl?: string }): string | null {
  if (data?.key) {
    return `/api/media/${data.key.split("/").map(encodeURIComponent).join("/")}`;
  }
  if (data?.publicUrl) {
    if (data.publicUrl.startsWith("/")) return data.publicUrl;
    try {
      return new URL(data.publicUrl).pathname;
    } catch {
      return null;
    }
  }
  return null;
}

export function DoctorProfileImageField({ initialPath }: Props) {
  const [path, setPath] = useState(initialPath ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const previewSrc = resolvePreviewSrc(path);

  async function uploadFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setMsg("File too large. Max 5 MB.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/admin/media/upload`, {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: { key?: string; publicUrl?: string };
        message?: string;
      };
      const persistedPath = toPersistedPath(json.data);
      if (!res.ok || !json.ok || !persistedPath) {
        throw new Error(json.message ?? "Upload failed");
      }
      setPath(persistedPath);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function onFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    if (file) await uploadFile(file);
    input.value = "";
  }

  function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  }

  function removeImage() {
    setPath("");
    setMsg(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="gh-field-label">Profile image</span>

      {/* The hidden file input gets clicked by the Replace / Upload buttons. */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/avif"
        className="sr-only"
        disabled={busy}
        onChange={onFileSelected}
      />

      {previewSrc ? (
        <div
          className="relative overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-background-soft)]"
          style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewSrc}
            alt="Profile preview"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
          {/* Overlay actions — float top-right so the face stays visible. */}
          <div
            className="absolute right-2 top-2 inline-flex gap-1.5"
            style={{ pointerEvents: busy ? "none" : "auto" }}
          >
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label="Replace image"
              disabled={busy}
              title="Replace"
              className="inline-flex items-center gap-1 rounded-full px-3 text-xs font-bold text-white"
              style={{
                height: 28,
                background: "rgba(0,0,0,0.65)",
                border: "none",
                cursor: busy ? "wait" : "pointer",
              }}
            >
              <Upload aria-hidden className="size-3.5" />
              {busy ? "Uploading…" : "Replace"}
            </button>
            <button
              type="button"
              onClick={removeImage}
              aria-label="Remove image"
              disabled={busy}
              title="Remove"
              className="inline-flex items-center justify-center rounded-full text-white"
              style={{
                width: 28,
                height: 28,
                background: "rgba(0,0,0,0.65)",
                border: "none",
                cursor: busy ? "wait" : "pointer",
              }}
            >
              <Trash2 aria-hidden className="size-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => !busy && fileRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !busy) {
              e.preventDefault();
              fileRef.current?.click();
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="flex items-center justify-center rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-background-soft)] hover:bg-[var(--color-background-panel)]"
          style={{
            width: PREVIEW_WIDTH,
            height: PREVIEW_HEIGHT,
            cursor: busy ? "wait" : "pointer",
          }}
        >
          <div className="flex flex-col items-center gap-2 text-center text-[var(--color-text-muted)]">
            <ImagePlus className="size-7" aria-hidden />
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              {busy ? "Uploading…" : "Click or drop to upload"}
            </p>
            <p className="text-[11px]">JPEG / PNG / WebP · max 5 MB</p>
          </div>
        </div>
      )}

      {/* Hidden form input — what the parent server action reads. */}
      <input type="hidden" name="profileImagePath" value={path} />

      {/* Manual URL input as a small escape hatch. Editable, advanced users
          can paste an external URL or `/media/...` key directly. */}
      <input
        type="text"
        value={path}
        onChange={(e) => setPath(e.target.value)}
        placeholder="https://... or /media/..."
        className="gh-input mt-1 min-w-0 font-mono text-xs"
        style={{ maxWidth: PREVIEW_WIDTH }}
      />

      {msg ? (
        <p className="text-xs text-[var(--color-status-warning-text)]" style={{ maxWidth: PREVIEW_WIDTH }}>
          {msg}
        </p>
      ) : null}

      <span className="text-xs text-[var(--color-text-muted)]" style={{ maxWidth: PREVIEW_WIDTH }}>
        Saved as the doctor profile image asset. Leave blank and save to remove.
      </span>
    </div>
  );
}
