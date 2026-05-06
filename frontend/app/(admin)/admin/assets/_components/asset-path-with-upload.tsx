"use client";

import { useRef, useState } from "react";

type Props = {
  initialPath?: string;
};

export function AssetPathWithUpload({ initialPath }: Props) {
  const [path, setPath] = useState(initialPath ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");

  async function onFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    if (!apiBase) {
      setMsg("NEXT_PUBLIC_API_URL is not configured.");
      input.value = "";
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${apiBase}/api/admin/media/upload`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: { publicUrl?: string };
        message?: string;
      };
      if (!res.ok || !json.ok || !json.data?.publicUrl) {
        throw new Error(json.message ?? "Upload failed");
      }
      setPath(json.data.publicUrl);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      input.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="gh-field-label">Path or URL</span>
      <input
        name="path"
        className="gh-input min-w-0 font-mono text-sm"
        required
        value={path}
        onChange={(e) => setPath(e.target.value)}
        placeholder="https://… (upload or paste) or /images/…"
      />
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
          className="sr-only"
          disabled={busy || !apiBase}
          onChange={onFileSelected}
        />
        <button
          type="button"
          className="gh-btn gh-btn-soft text-xs"
          disabled={busy || !apiBase}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? "Uploading…" : "Upload image to bucket"}
        </button>
        {!apiBase ? (
          <span className="text-xs text-[var(--color-status-warning-text)]">Set NEXT_PUBLIC_API_URL to enable upload.</span>
        ) : (
          <span className="text-xs text-[var(--color-text-muted)]">JPEG, PNG, WebP, GIF, SVG — max 5MB. Requires backend bucket env vars.</span>
        )}
      </div>
      {msg ? <p className="text-xs text-[var(--color-status-warning-text)]">{msg}</p> : null}
    </div>
  );
}
