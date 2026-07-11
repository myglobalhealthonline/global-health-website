"use client";

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { Btn, IconBtn } from "@/components/portal-atoms";

// SVG removed: backend rejects them (stored-XSS risk via <script>
// inside an SVG that /api/media/* would echo back with the original
// content-type). Keep the picker honest by not advertising support.
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
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
      setMsg("Unsupported file type. Use JPEG, PNG, WebP, GIF, or AVIF.");
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
    <div className="gh-admin-media-field">
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
        className={`gh-admin-media-dropzone relative overflow-hidden transition-colors ${
          dragOver ? "gh-admin-media-dropzone--dragging" : ""
        } ${previewSrc ? "gh-admin-media-dropzone--preview" : ""}`}
        style={{
          minHeight: 180,
          borderRadius: 14,
          border: `1.5px dashed ${
            dragOver ? "var(--portal-accent)" : "var(--portal-line-strong)"
          }`,
          background: dragOver ? "var(--portal-signal-soft)" : "var(--portal-well)",
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
              className="gh-admin-media-actions"
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                display: "inline-flex",
                gap: 6,
              }}
            >
              <Btn
                type="button"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  if (!busy) fileRef.current?.click();
                }}
                aria-label="Replace image"
                disabled={busy}
                variant="on-chrome"
                size="sm"
                iconLeft={<Upload aria-hidden className="size-3.5" />}
                style={{ height: 30, minHeight: 30, padding: "0 12px", background: "var(--portal-chrome-solid)" }}
              >
                {busy ? "Uploading…" : "Replace"}
              </Btn>
              <IconBtn
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  clearImage();
                }}
                ariaLabel="Remove image"
                style={{ width: 30, height: 30, background: "var(--portal-chrome-solid)", color: "var(--portal-chrome-text-active)" }}
              >
                <X aria-hidden className="size-3.5" />
              </IconBtn>
            </div>
          </>
        ) : (
          <div
            className="gh-admin-media-empty grid place-items-center px-4 py-8 text-center"
            style={{ color: "var(--portal-muted)", minHeight: 180 }}
          >
            <div className="flex flex-col items-center">
              <Upload aria-hidden className="size-6" />
              <p
                className="m-0 mt-2 text-portal-compact font-semibold"
                style={{ color: "var(--portal-text)" }}
              >
                {busy ? "Uploading…" : "Drag & drop an image here"}
              </p>
              <p className="m-0 mt-1 text-portal-meta">
                {hint ?? "JPEG, PNG, WebP, GIF, AVIF · max 5 MB"}
              </p>
              <Btn
                type="button"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.stopPropagation();
                  if (!busy) fileRef.current?.click();
                }}
                disabled={busy}
                variant="primary"
                size="sm"
                iconLeft={<Upload aria-hidden className="size-3.5" />}
                style={{ marginTop: 14 }}
              >
                Browse files
              </Btn>
            </div>
          </div>
        )}
      </div>

      {/* Manual URL fallback (advanced — paste a URL or /api/media path) */}
      <details className="text-portal-meta text-[var(--portal-muted)]">
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
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        className="sr-only"
        disabled={busy}
        onChange={onFileSelected}
      />

      {msg ? (
        <p className="text-portal-meta" style={{ color: "var(--portal-warning-text)" }}>{msg}</p>
      ) : null}
      {helperText ? (
        <span className="text-portal-meta text-[var(--portal-muted)]">{helperText}</span>
      ) : null}
    </div>
  );
}
