"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type Props = {
  initialCoverAssetId?: string | null;
  /** Stored path e.g. /api/media/... (used for preview via Next rewrite). */
  initialCoverPath?: string | null;
  /** Suggested alt text seed (e.g. post title). */
  altSeed?: string;
};

function mediaPathFromUploadKey(key: string): string {
  return `/api/media/${key.split("/").map(encodeURIComponent).join("/")}`;
}

/**
 * Uploads cover art to object storage, registers an Asset row, and binds `coverAssetId` for the blog form.
 */
export function BlogCoverAssetField({
  initialCoverAssetId,
  initialCoverPath,
  altSeed = "",
}: Props) {
  const [coverAssetId, setCoverAssetId] = useState(initialCoverAssetId ?? "");
  const [previewPath, setPreviewPath] = useState(initialCoverPath ?? "");
  const [altText, setAltText] = useState("");
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
      const uploadRes = await fetch(`${apiBase}/api/admin/media/upload`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const uploadJson = (await uploadRes.json()) as {
        ok?: boolean;
        data?: { key?: string };
        message?: string;
      };
      const key = uploadJson.data?.key?.trim();
      if (!uploadRes.ok || !uploadJson.ok || !key) {
        throw new Error(uploadJson.message ?? "Upload failed");
      }

      const path = mediaPathFromUploadKey(key);
      const effectiveAlt = (altText.trim() || altSeed.trim() || "Blog post cover image").slice(0, 500);

      const assetRes = await fetch(`${apiBase}/api/admin/assets`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countryId: null,
          doctorId: null,
          kind: "IMAGE",
          key,
          path,
          altText: effectiveAlt,
          usageNote: "Blog post cover",
          isActive: true,
        }),
      });
      const assetJson = (await assetRes.json()) as {
        ok?: boolean;
        data?: { asset?: { id?: string } };
        message?: string;
      };
      const id = assetJson.data?.asset?.id;
      if (!assetRes.ok || !assetJson.ok || !id) {
        throw new Error(assetJson.message ?? "Could not register cover asset");
      }

      setCoverAssetId(id);
      setPreviewPath(path);
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Cover upload failed");
    } finally {
      setBusy(false);
      input.value = "";
    }
  }

  function clearCover() {
    setCoverAssetId("");
    setPreviewPath("");
    setMsg(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="gh-field-label">Cover image</span>
      <input type="hidden" name="coverAssetId" value={coverAssetId} />

      <div className="flex flex-col gap-2">
        <label className="text-xs text-[var(--color-text-muted)]">
          Alt text (used when registering the image asset)
          <input
            className="gh-input mt-1"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder={altSeed.trim() ? `Default: ${altSeed.slice(0, 80)}` : "Blog post cover image"}
            disabled={busy}
          />
        </label>
      </div>

      {previewPath ? (
        <div className="overflow-hidden rounded-[var(--radius-card-sm)] border border-[var(--color-border)] bg-[var(--color-background-soft)] p-2">
          {/* Admin preview only; src is same-origin /api/media via rewrite */}
          {/* eslint-disable-next-line @next/next/no-img-element -- small preview, dynamic path */}
          <img src={previewPath} alt="" className="max-h-48 w-full object-contain" />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/avif"
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
          {busy ? "Uploading…" : "Upload cover image"}
        </button>
        {coverAssetId ? (
          <button type="button" className="gh-link text-xs" onClick={clearCover} disabled={busy}>
            Remove cover
          </button>
        ) : null}
        {!apiBase ? (
          <span className="text-xs text-[var(--color-status-warning-text)]">Set NEXT_PUBLIC_API_URL to enable upload.</span>
        ) : (
          <span className="text-xs text-[var(--color-text-muted)]">JPEG, PNG, WebP, GIF, SVG, AVIF — max 5MB.</span>
        )}
      </div>

      {msg ? <p className="text-xs text-[var(--color-status-warning-text)]">{msg}</p> : null}

      <p className="text-xs text-[var(--color-text-muted)]">
        Advanced: register additional images from{" "}
        <Link href="/admin/assets" className="gh-link">
          Assets
        </Link>
        ; for covers, use Upload above.
      </p>
    </div>
  );
}
