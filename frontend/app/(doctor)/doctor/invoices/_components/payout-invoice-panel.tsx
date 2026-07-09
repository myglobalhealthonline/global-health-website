"use client";

import { useEffect, useRef, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Receipt,
  Upload,
} from "lucide-react";
import { fetchDownload } from "@/lib/download";

// ponytail: ro/cs/de doctor.json "invoices" sections don't have the panel
// keys yet (only en/pt/es do) — explicit shape here instead of deriving
// from the union so tsc doesn't choke on the locale gap; those 3 locales
// need their JSON filled in before this panel is fully translated for them.
export type InvoiceStrings = {
  panelTitle: string;
  step1Title: string;
  step1Desc: string;
  month: string;
  excel: string;
  pdf: string;
  step2Title: string;
  step2Desc: string;
  file: string;
  uploadBtn: string;
  chooseFileError: string;
  uploadFailedPeriod: string;
  step3Title: string;
  loadingEllipsis: string;
  nothingUploaded: string;
  download: string;
};

/**
 * Doctor payout workflow, in one card:
 *   1. Download the monthly payout statement (Excel / PDF) — the list of
 *      consultations valued at your per-service payout, with a total.
 *   2. Upload your own invoice for that month for admin to process.
 *   3. See what you've already uploaded.
 *
 * All calls hit same-origin `/api/doctor/...` paths (proxied to the backend
 * with the session cookie). No patient billing is exposed here.
 */

type UploadItem = {
  key: string;
  period: string;
  filename: string;
  size: number;
  uploadedAt: string | null;
};

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function lastMonth(): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** YYYY-MM → { from: YYYY-MM-01, to: last day of month }. */
function monthRange(period: string): { from: string; to: string } {
  const [y, m] = period.split("-").map(Number);
  const from = `${period}-01`;
  const last = new Date(y, m, 0).getDate();
  const to = `${period}-${String(last).padStart(2, "0")}`;
  return { from, to };
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PayoutInvoicePanel({ strings }: { strings: InvoiceStrings }) {
  const [statementMonth, setStatementMonth] = useState(lastMonth());
  const [uploadMonth, setUploadMonth] = useState(lastMonth());
  const [items, setItems] = useState<UploadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/doctor/payout-invoices", { cache: "no-store" });
      const json = await res.json();
      setItems(res.ok && json.ok ? (json.data.items as UploadItem[]) : []);
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

  async function downloadStatement(format: "excel" | "pdf") {
    setError(null);
    const { from, to } = monthRange(statementMonth);
    const params = new URLSearchParams({ dataset: "payout", format, from, to });
    try {
      await fetchDownload(`/api/doctor/reports/export?${params.toString()}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    }
  }

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError(strings.chooseFileError);
      return;
    }
    setUploading(true);
    try {
      // `period` MUST be appended before the file so the backend sees it in
      // the same multipart pass as `request.file()`.
      const form = new FormData();
      form.append("period", uploadMonth);
      form.append("file", file);
      const res = await fetch("/api/doctor/payout-invoices", {
        method: "POST",
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setError(json.message ?? strings.uploadFailedPeriod);
      } else {
        if (fileRef.current) fileRef.current.value = "";
        await refresh();
      }
    } catch {
      setError(strings.uploadFailedPeriod);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="gh-card mb-4 p-6">
      <div className="mb-4 flex items-center gap-2">
        <Receipt className="size-4 text-[var(--portal-text)]" />
        <h2 className="text-sm font-semibold text-[var(--portal-text)]">
          {strings.panelTitle}
        </h2>
      </div>

      {/* 1. Statement download */}
      <div className="mb-5">
        <p className="gh-field-label">{strings.step1Title}</p>
        <p className="mt-1 text-xs text-[var(--portal-muted)]">
          {strings.step1Desc}
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">{strings.month}</span>
            <input
              type="month"
              value={statementMonth}
              max={currentMonth()}
              onChange={(e) => setStatementMonth(e.target.value)}
              className="gh-input"
            />
          </label>
          <button type="button" onClick={() => downloadStatement("excel")} className="gh-btn gh-btn-soft text-sm">
            <FileSpreadsheet className="size-3.5" /> {strings.excel}
          </button>
          <button type="button" onClick={() => downloadStatement("pdf")} className="gh-btn gh-btn-soft text-sm">
            <FileText className="size-3.5" /> {strings.pdf}
          </button>
        </div>
      </div>

      {/* 2. Upload */}
      <form onSubmit={onUpload} className="mb-5 border-t border-[var(--portal-line)] pt-5">
        <p className="gh-field-label">{strings.step2Title}</p>
        <p className="mt-1 text-xs text-[var(--portal-muted)]">
          {strings.step2Desc}
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">{strings.month}</span>
            <input
              type="month"
              value={uploadMonth}
              max={currentMonth()}
              onChange={(e) => setUploadMonth(e.target.value)}
              className="gh-input"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">{strings.file}</span>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="gh-input text-sm"
            />
          </label>
          <button type="submit" disabled={uploading} className="gh-btn gh-btn-primary text-sm disabled:opacity-50">
            {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
            {strings.uploadBtn}
          </button>
        </div>
        {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
      </form>

      {/* 3. Uploaded list */}
      <div className="border-t border-[var(--portal-line)] pt-5">
        <p className="gh-field-label">{strings.step3Title}</p>
        {loading ? (
          <p className="mt-2 text-xs text-[var(--portal-muted)]">{strings.loadingEllipsis}</p>
        ) : items.length === 0 ? (
          <p className="mt-2 text-xs text-[var(--portal-muted)]">{strings.nothingUploaded}</p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--portal-line)]">
            {items.map((it) => (
              <li key={it.key} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--portal-text)]">{it.filename}</p>
                  <p className="text-xs text-[var(--portal-muted)]">
                    {it.period} · {fmtSize(it.size)}
                    {it.uploadedAt ? ` · ${new Date(it.uploadedAt).toLocaleDateString("en-GB")}` : ""}
                  </p>
                </div>
                <a
                  href={`/api/doctor/payout-invoices/download?key=${encodeURIComponent(it.key)}`}
                  className="gh-btn gh-btn-soft text-xs"
                >
                  <Download className="size-3.5" /> {strings.download}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
