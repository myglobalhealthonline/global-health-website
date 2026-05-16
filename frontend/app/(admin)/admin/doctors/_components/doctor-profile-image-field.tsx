"use client";

import { useRef, useState } from "react";

type Props = {
  initialPath?: string;
};

/**
 * Doctor profile-image picker. Posts the file to the same-origin proxy
 * at `/api/admin/media/upload` which forwards to the backend with the
 * session cookie attached. That avoids cross-origin cookie loss on
 * Railway subdomains AND removes the old `NEXT_PUBLIC_API_URL` gate that
 * was tripping admins with a misleading "not configured" warning.
 */
export function DoctorProfileImageField({ initialPath }: Props) {
  const [path, setPath] = useState(initialPath ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
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

  async function onFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;

    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/admin/media/upload`, {
        method: "POST",
        // Same-origin so the auth cookie travels automatically.
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
      input.value = "";
    }
  }

  return (
    <label className="flex flex-col gap-2">
      <span className="gh-field-label">Profile image</span>
      <input
        name="profileImagePath"
        className="gh-input min-w-0 font-mono text-sm"
        value={path}
        onChange={(e) => setPath(e.target.value)}
        placeholder="https://... or /media/..."
      />
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/avif"
          className="sr-only"
          disabled={busy}
          onChange={onFileSelected}
        />
        <button
          type="button"
          className="gh-btn gh-btn-soft text-xs"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? "Uploading..." : "Upload image to bucket"}
        </button>
        <span className="text-xs text-[var(--color-text-muted)]">
          JPEG, PNG, WebP, GIF, SVG, AVIF (max 5MB).
        </span>
      </div>
      {msg ? <p className="text-xs text-[var(--color-status-warning-text)]">{msg}</p> : null}
      <span className="text-xs text-[var(--color-text-muted)]">
        Saved as the doctor profile image asset. Leave blank and save to remove.
      </span>
    </label>
  );
}
