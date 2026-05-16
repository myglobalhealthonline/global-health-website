"use client";

import { useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";

type Props = {
  initialPath?: string;
  /**
   * Optional id of the parent <form> when this component is rendered
   * outside the form element. HTML5 form-association ties the hidden
   * `profileImagePath` input to that form so it submits with the rest
   * of the body.
   */
  formId?: string;
  /**
   * Doctor's full name. When no image is set we render a gradient tile
   * with the doctor's initials, matching the look of the existing
   * "Profile photo" placeholder card.
   */
  fullName?: string;
};

/**
 * Doctor profile photo picker.
 *
 * Layout:
 *   - Square (1:1) tile that fills the parent card width.
 *   - Empty state: brand-coloured gradient background with the doctor's
 *     initials, identical to the previous decorative "Profile photo"
 *     placeholder — but now interactive (click or drop to upload).
 *   - With-image state: the uploaded image fills the tile, cropped via
 *     object-fit: cover.
 *   - Top-right overlay shows "Upload" / "Replace" + a trash button. The
 *     overlay is always visible (no hover needed) so the controls are
 *     obvious on touch devices.
 *
 * Upload posts to the same-origin `/api/admin/media/upload` proxy so the
 * session cookie travels server-side (avoids Railway cross-subdomain
 * cookie loss).
 */

function resolvePreviewSrc(path: string): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
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

function initialsFor(name: string | undefined): string {
  if (!name) return "·";
  return (
    name
      .replace(/^Dr\.?\s+/i, "")
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "·"
  );
}

export function DoctorProfileImageField({ initialPath, formId, fullName }: Props) {
  const [path, setPath] = useState(initialPath ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const previewSrc = resolvePreviewSrc(path);
  const hasImage = Boolean(previewSrc);

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
      {/* Hidden file input — clicked by the Upload / Replace buttons. */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/avif"
        className="sr-only"
        disabled={busy}
        onChange={onFileSelected}
      />

      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          // Clicking the empty tile opens the picker. Clicking the
          // with-image tile is a no-op (use Replace / Remove explicitly).
          if (!busy && !hasImage) fileRef.current?.click();
        }}
        onKeyDown={(e) => {
          if (!busy && !hasImage && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            fileRef.current?.click();
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="relative grid place-items-center overflow-hidden text-white"
        style={{
          aspectRatio: "1 / 1",
          width: "100%",
          borderRadius: 16,
          background: hasImage
            ? "var(--color-background-soft)"
            : "linear-gradient(135deg, var(--color-brand-primary), var(--color-accent))",
          fontFamily: "var(--font-display)",
          fontSize: 48,
          fontWeight: 800,
          cursor: hasImage ? "default" : busy ? "wait" : "pointer",
        }}
      >
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewSrc!}
            alt="Profile preview"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <span>{initialsFor(fullName)}</span>
        )}

        {/* Overlay actions — top-right, always visible. */}
        <div
          className="absolute right-2 top-2 inline-flex gap-1.5"
          style={{ pointerEvents: busy ? "none" : "auto" }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileRef.current?.click();
            }}
            aria-label={hasImage ? "Replace image" : "Upload image"}
            disabled={busy}
            title={hasImage ? "Replace" : "Upload"}
            className="inline-flex items-center gap-1 rounded-full px-3 text-xs font-bold text-white"
            style={{
              height: 28,
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(4px)",
              border: "none",
              cursor: busy ? "wait" : "pointer",
            }}
          >
            <Upload aria-hidden className="size-3.5" />
            {busy ? "Uploading…" : hasImage ? "Replace" : "Upload"}
          </button>
          {hasImage ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeImage();
              }}
              aria-label="Remove image"
              disabled={busy}
              title="Remove"
              className="inline-flex items-center justify-center rounded-full text-white"
              style={{
                width: 28,
                height: 28,
                background: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(4px)",
                border: "none",
                cursor: busy ? "wait" : "pointer",
              }}
            >
              <Trash2 aria-hidden className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Hidden form input — what the parent server action reads. */}
      <input
        type="hidden"
        name="profileImagePath"
        value={path}
        {...(formId ? { form: formId } : {})}
      />

      {msg ? (
        <p className="text-xs text-[var(--color-status-warning-text)]">{msg}</p>
      ) : null}

      <span className="text-[11px] text-[var(--color-text-muted)]">
        JPEG / PNG / WebP · max 5 MB. Click the tile or drop a file to upload.
      </span>
    </div>
  );
}
