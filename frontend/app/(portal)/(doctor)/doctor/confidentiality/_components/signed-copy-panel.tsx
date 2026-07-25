"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileSignature, Loader2, Upload } from "lucide-react";
import { fetchDownload } from "@/lib/download";

/**
 * Hand-signed copy of the confidentiality agreement, in three steps:
 *   1. Download the branded, signable PDF.
 *   2. Sign it (print/scan or a digital signature) and upload it back.
 *   3. See every copy you've uploaded — the same list admin sees.
 *
 * This supplements the in-portal click-to-accept above; it does not replace
 * it. Acceptance remains the record that gates patient-record access.
 */

export type SignedCopyStrings = {
  signedTitle: string;
  signedDesc: string;
  signedStep1Title: string;
  signedStep1Desc: string;
  signedDownloadPdf: string;
  signedStep2Title: string;
  signedStep2Desc: string;
  signedFile: string;
  signedUploadBtn: string;
  signedChooseFileError: string;
  signedUploadFailed: string;
  signedStep3Title: string;
  signedLoadingEllipsis: string;
  signedNothingUploaded: string;
  signedDownload: string;
  signedVersionLabel: string;
};

type SignedItem = {
  key: string;
  agreementVersion: string;
  filename: string;
  size: number;
  uploadedAt: string | null;
};

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SignedCopyPanel({ strings: s }: { strings: SignedCopyStrings }) {
  const [items, setItems] = useState<SignedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/doctor/confidentiality-agreement/signed", {
        cache: "no-store",
      });
      const json = await res.json();
      setItems(res.ok && json.ok ? (json.data.items as SignedItem[]) : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Fetch-on-mount: setLoading inside refresh is the standard
    // async-fetch pattern, not a cascading-render risk.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, []);

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError(s.signedChooseFileError);
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/doctor/confidentiality-agreement/signed", {
        method: "POST",
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setError(json.message ?? s.signedUploadFailed);
      } else {
        if (fileRef.current) fileRef.current.value = "";
        await refresh();
      }
    } catch {
      setError(s.signedUploadFailed);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="gh-card mt-4 p-6">
      <div className="mb-1 flex items-center gap-2">
        <FileSignature className="size-4 text-[var(--portal-primary)]" aria-hidden />
        <h2 className="text-sm font-semibold text-[var(--portal-text)]">{s.signedTitle}</h2>
      </div>
      <p className="text-xs text-[var(--portal-muted)]">{s.signedDesc}</p>

      {/* 1. Download the signable PDF */}
      <div className="mt-5">
        <p className="gh-field-label">{s.signedStep1Title}</p>
        <p className="mt-1 text-xs text-[var(--portal-muted)]">{s.signedStep1Desc}</p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            fetchDownload("/api/doctor/confidentiality-agreement/pdf").catch((e) =>
              setError(e instanceof Error ? e.message : s.signedUploadFailed),
            );
          }}
          className="gh-btn gh-btn-soft mt-3 text-sm"
        >
          <Download className="size-3.5" /> {s.signedDownloadPdf}
        </button>
      </div>

      {/* 2. Upload the signed copy */}
      <form onSubmit={onUpload} className="mt-5 border-t border-[var(--portal-line)] pt-5">
        <p className="gh-field-label">{s.signedStep2Title}</p>
        <p className="mt-1 text-xs text-[var(--portal-muted)]">{s.signedStep2Desc}</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">{s.signedFile}</span>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="gh-input text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={uploading}
            className="gh-btn gh-btn-primary text-sm disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Upload className="size-3.5" />
            )}
            {s.signedUploadBtn}
          </button>
        </div>
        {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
      </form>

      {/* 3. What's already on file */}
      <div className="mt-5 border-t border-[var(--portal-line)] pt-5">
        <p className="gh-field-label">{s.signedStep3Title}</p>
        {loading ? (
          <p className="mt-2 text-xs text-[var(--portal-muted)]">{s.signedLoadingEllipsis}</p>
        ) : items.length === 0 ? (
          <p className="mt-2 text-xs text-[var(--portal-muted)]">{s.signedNothingUploaded}</p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--portal-line)]">
            {items.map((it) => (
              <li key={it.key} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <p
                    className="truncate font-medium text-[var(--portal-text)]"
                    title={it.filename}
                  >
                    {it.filename}
                  </p>
                  <p className="text-xs text-[var(--portal-muted)]">
                    {s.signedVersionLabel.replace("{version}", it.agreementVersion)} ·{" "}
                    {fmtSize(it.size)}
                    {it.uploadedAt
                      ? ` · ${new Date(it.uploadedAt).toLocaleDateString("en-GB")}`
                      : ""}
                  </p>
                </div>
                <a
                  href={`/api/doctor/confidentiality-agreement/signed/download?key=${encodeURIComponent(it.key)}`}
                  className="gh-btn gh-btn-soft text-xs"
                >
                  <Download className="size-3.5" /> {s.signedDownload}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
