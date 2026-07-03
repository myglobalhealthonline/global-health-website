"use client";

import { useRef, useState } from "react";
import { Plus, Trash2, Upload } from "lucide-react";
import { IconBtn } from "@/components/portal-atoms";

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
  /** FormData field name. The component emits one hidden input under
   *  this name with newline-separated paths — the same shape existing
   *  `parseLines(formData.get(name))` parsers already expect. */
  name: string;
  label: string;
  helperText?: string;
  /** Existing paths. Empty array renders an empty "Add image" CTA. */
  initialPaths?: string[];
  /** Cap on the number of images. Defaults to 12 to match backend Zod
   *  array max. */
  max?: number;
};

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

/**
 * Multi-image picker. Each row is a slot with its own preview + replace +
 * remove. Submits a single hidden input with newline-separated paths so
 * server actions that parse the field with `parseLines` keep working
 * without changes.
 */
export function MultiImageField({
  name,
  label,
  helperText,
  initialPaths = [],
  max = 12,
}: Props) {
  const [paths, setPaths] = useState<string[]>(
    initialPaths.filter((p) => p && p.trim().length > 0),
  );
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const apiBaseForPreview = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");

  function previewSrcFor(path: string): string | null {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    if (path.startsWith("/api/media/") && apiBaseForPreview) {
      return `${apiBaseForPreview}${path}`;
    }
    return path;
  }

  async function uploadInto(index: number, file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setMsg("File too large. Max 5 MB.");
      return;
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      setMsg("Unsupported file type. Use JPEG, PNG, WebP, GIF, or AVIF.");
      return;
    }
    setBusyIndex(index);
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
      setPaths((prev) => {
        const next = [...prev];
        next[index] = persistedPath;
        return next;
      });
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusyIndex(null);
    }
  }

  function addSlot() {
    if (paths.length >= max) return;
    setPaths((prev) => [...prev, ""]);
    // Defer click so the new input renders before we trigger it.
    queueMicrotask(() => {
      inputRefs.current[paths.length]?.click();
    });
  }

  function removeAt(index: number) {
    setPaths((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="gh-admin-media-field">
      <div className="flex items-center justify-between">
        <span className="gh-field-label">{label}</span>
        <span className="text-[11px] text-[var(--portal-muted)]">
          {paths.length} / {max}
        </span>
      </div>

      {/* Hidden input that participates in the form submission — newline-
          separated so the existing parseLines parser works unchanged. */}
      <input type="hidden" name={name} value={paths.filter(Boolean).join("\n")} />

      {paths.length === 0 ? (
        <button
          type="button"
          onClick={addSlot}
          className="gh-admin-media-empty-button grid place-items-center"
          style={{
            minHeight: 140,
            borderRadius: 14,
            border: "1.5px dashed var(--portal-line-strong)",
            background: "var(--portal-well)",
            color: "var(--portal-muted)",
            cursor: "pointer",
          }}
        >
          <div className="flex flex-col items-center gap-1.5 px-4 py-6 text-center">
            <Upload aria-hidden className="size-5" />
            <span className="text-[13px] font-semibold text-[var(--portal-text)]">
              Add an image
            </span>
            <span className="text-[11px]">
              JPEG / PNG / WebP / GIF / AVIF · max 5 MB each
            </span>
          </div>
        </button>
      ) : (
        <ul className="gh-admin-media-grid">
          {paths.map((p, index) => {
            const preview = previewSrcFor(p);
            const busy = busyIndex === index;
            return (
              <li
                key={index}
                className="gh-admin-media-thumb relative overflow-hidden"
                style={{
                  borderRadius: 12,
                  border: "1px solid var(--portal-line)",
                  background: "var(--portal-well)",
                  aspectRatio: "4 / 3",
                }}
              >
                <input
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                  className="sr-only"
                  disabled={busy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadInto(index, f);
                    e.target.value = "";
                  }}
                />
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt={`${label} ${index + 1}`}
                    className="block h-full w-full"
                    style={{ objectFit: "cover", background: "white" }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => inputRefs.current[index]?.click()}
                    className="grid h-full w-full place-items-center text-[12px] text-[var(--portal-muted)]"
                    style={{ cursor: busy ? "wait" : "pointer" }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Upload aria-hidden className="size-4" />
                      {busy ? "Uploading…" : "Choose image"}
                    </span>
                  </button>
                )}

                {/* Hover/visible action cluster — replace + remove. */}
                <div
                  className="gh-admin-media-actions absolute right-1.5 top-1.5 inline-flex gap-1"
                  style={{ pointerEvents: busy ? "none" : "auto" }}
                >
                  <IconBtn
                    onClick={() => inputRefs.current[index]?.click()}
                    ariaLabel="Replace"
                    title="Replace"
                    style={{
                      width: 28,
                      height: 28,
                      background: "var(--portal-chrome-solid)",
                      color: "var(--portal-chrome-text-active)",
                      cursor: busy ? "wait" : "pointer",
                    }}
                  >
                    <Upload aria-hidden className="size-3.5" />
                  </IconBtn>
                  <IconBtn
                    onClick={() => removeAt(index)}
                    ariaLabel="Remove"
                    title="Remove"
                    style={{
                      width: 28,
                      height: 28,
                      background: "var(--portal-chrome-solid)",
                      color: "var(--portal-chrome-text-active)",
                    }}
                  >
                    <Trash2 aria-hidden className="size-3.5" />
                  </IconBtn>
                </div>
              </li>
            );
          })}
          {paths.length < max ? (
            <li>
              <button
                type="button"
                onClick={addSlot}
                className="gh-admin-media-add-thumb grid h-full w-full place-items-center"
                style={{
                  borderRadius: 14,
                  border: "1.5px dashed var(--portal-line-strong)",
                  background: "transparent",
                  color: "var(--portal-muted)",
                  cursor: "pointer",
                  aspectRatio: "4 / 3",
                }}
              >
                <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold">
                  <Plus aria-hidden className="size-4" />
                  Add image
                </span>
              </button>
            </li>
          ) : null}
        </ul>
      )}

      {msg ? (
        <p className="text-[12px] text-[var(--portal-warning-text)]">{msg}</p>
      ) : null}
      {helperText ? (
        <span className="text-[12px] text-[var(--portal-muted)]">{helperText}</span>
      ) : null}
    </div>
  );
}
