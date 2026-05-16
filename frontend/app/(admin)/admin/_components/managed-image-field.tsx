"use client";

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
]);

type Props = {
  name: string;
  label: string;
  helperText?: string;
  initialPath?: string | null;
  /** Aspect ratio hint shown in the empty-state (e.g. "1200×800 recommended"). */
  hint?: string;
};

export function ManagedImageField({
  name,
  label,
  helperText,
  initialPath,
  hint,
}: Props) {
  const [path, setPath] = useState(initialPath ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  async function uploadFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setMsg("File too large. Max 5 MB.");
      return;
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      setMsg("Unsupported file type. Use JPEG, PNG, WebP, GIF, SVG, or AVIF.");
      return;
    }

    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      // Same-origin proxy → backend with cookie forwarded server-side.
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
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Upload failed");
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
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  }

  function clearImage() {
    setPath("");
    setMsg(null);
  }

  // Build the preview src — if path is a local /api/media reference, prefix
  // with the backend origin so the browser fetches from :4000 rather than
  // the frontend dev origin (which doesn't serve those files).
  const apiBaseForPreview = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
  const previewSrc = (() => {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    if (path.startsWith("/api/media/") && apiBaseForPreview) {
      return `${apiBaseForPreview}${path}`;
    }
    return path;
  })();

  return (
    <div className="flex flex-col gap-2">
      <span className="gh-field-label">{label}</span>

      {/* Hidden text input that participates in the form submission. */}
      <input type="hidden" name={name} value={path} />

      {/* Drop zone / preview surface */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => {
          if (!busy && !previewSrc) fileRef.current?.click();
        }}
        role="button"
        tabIndex={0}
        aria-label={previewSrc ? "Image uploaded" : "Drop image here or click to upload"}
        className="relative overflow-hidden transition-colors"
        style={{
          minHeight: 180,
          borderRadius: 12,
          border: `1px dashed ${
            dragOver
              ? "var(--color-brand-primary)"
              : "var(--color-border-strong)"
          }`,
          background: dragOver
            ? "rgba(27,77,62,0.06)"
            : "var(--color-background-soft)",
          cursor: previewSrc ? "default" : "pointer",
        }}
      >
        {previewSrc ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewSrc}
              alt={label}
              className="block w-full"
              style={{ maxHeight: 360, objectFit: "contain", background: "white" }}
            />
            {/* Top-right action cluster: Replace + Remove */}
            <div
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                display: "inline-flex",
                gap: 6,
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!busy) fileRef.current?.click();
                }}
                aria-label="Replace image"
                disabled={busy}
                style={{
                  height: 30,
                  padding: "0 12px",
                  borderRadius: 999,
                  background: "rgba(0,0,0,0.65)",
                  color: "#fff",
                  border: "none",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: busy ? "wait" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Upload aria-hidden className="size-3.5" />
                {busy ? "Uploading…" : "Replace"}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearImage();
                }}
                aria-label="Remove image"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 999,
                  background: "rgba(0,0,0,0.65)",
                  color: "#fff",
                  border: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X aria-hidden className="size-3.5" />
              </button>
            </div>
          </>
        ) : (
          <div
            className="grid place-items-center px-4 py-8 text-center"
            style={{ color: "var(--color-text-muted)", minHeight: 180 }}
          >
            <div className="flex flex-col items-center">
              <Upload aria-hidden className="size-6" />
              <p
                className="m-0 mt-2 text-[13px] font-semibold"
                style={{ color: "var(--color-text-body)" }}
              >
                {busy ? "Uploading…" : "Drag & drop an image here"}
              </p>
              <p className="m-0 mt-1 text-[12px]">
                {hint ?? "JPEG, PNG, WebP, GIF, SVG, AVIF · max 5 MB"}
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!busy) fileRef.current?.click();
                }}
                disabled={busy}
                style={{
                  marginTop: 14,
                  height: 36,
                  padding: "0 18px",
                  borderRadius: 999,
                  background: "var(--color-brand-primary)",
                  color: "#fff",
                  border: "none",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: busy ? "wait" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "var(--shadow-soft)",
                }}
              >
                <Upload aria-hidden className="size-3.5" />
                Browse files
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual URL fallback (advanced — paste a URL or /api/media path) */}
      <details className="text-[12px] text-[var(--color-text-muted)]">
        <summary className="cursor-pointer select-none">Use a URL instead</summary>
        <input
          type="text"
          className="gh-input mt-2 min-w-0 font-mono text-sm"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="https://… or /api/media/…"
        />
      </details>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/avif"
        className="sr-only"
        disabled={busy}
        onChange={onFileSelected}
      />

      {msg ? (
        <p className="text-[12px] text-[var(--color-status-warning-text)]">{msg}</p>
      ) : null}
      {helperText ? (
        <span className="text-[12px] text-[var(--color-text-muted)]">{helperText}</span>
      ) : null}
    </div>
  );
}
