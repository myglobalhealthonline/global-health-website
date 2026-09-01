"use client";

import { useEffect, useRef, useState } from "react";
import {
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Loader2,
  Receipt,
  Upload,
} from "lucide-react";
import { fetchDownload } from "@/lib/download";
import { PortalDialog } from "@/components/PortalDialog";

type ReportCellValue = string | number | boolean | null | undefined;
type ReportRow = Record<string, ReportCellValue> & {
  _total?: boolean;
  _section?: string;
  /** Muted line under a market section — the bank account that market pays into. */
  _sectionNote?: string;
};
type ReportTable = {
  title: string;
  subtitle?: string;
  summary?: Array<{ label: string; value: string }>;
  columns: Array<{ key: string; label: string; align?: "left" | "right" }>;
  rows: ReportRow[];
  truncated?: boolean;
};

// ponytail: ro/cs/de doctor.json "invoices" sections don't have the panel
// keys yet (only en/pt/es do) — explicit shape here instead of deriving
// from the union so tsc doesn't choke on the locale gap; those 3 locales
// need their JSON filled in before this panel is fully translated for them.
export type InvoiceStrings = {
  panelTitle: string;
  step1Title: string;
  step1Desc: string;
  month: string;
  statementLanguage: string;
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
  view: string;
  viewTitle: string;
};

/** Native display name — shown regardless of the doctor's portal UI locale,
 *  same list every time, so the language the STATEMENT comes out in is
 *  never ambiguous. */
const STATEMENT_LANGUAGES: Array<{ code: string; name: string }> = [
  { code: "en", name: "English" },
  { code: "pt", name: "Português" },
  { code: "es", name: "Español" },
  { code: "cs", name: "Čeština" },
  { code: "ro", name: "Română" },
  { code: "de", name: "Deutsch" },
];

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

export function PayoutInvoicePanel({
  strings,
  defaultLocale = "en",
}: {
  strings: InvoiceStrings;
  /** Doctor's portal UI locale — just the initial pick; the doctor can pick
   *  a different statement language regardless (e.g. read the portal in
   *  English, hand a Portuguese statement to their accountant). */
  defaultLocale?: string;
}) {
  const [statementMonth, setStatementMonth] = useState(lastMonth());
  const [statementLocale, setStatementLocale] = useState(defaultLocale);
  const [uploadMonth, setUploadMonth] = useState(lastMonth());
  const [items, setItems] = useState<UploadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewTable, setViewTable] = useState<ReportTable | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
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

  function statementParams(format: "excel" | "pdf" | "json") {
    const { from, to } = monthRange(statementMonth);
    return new URLSearchParams({
      dataset: "payout",
      format,
      from,
      to,
      locale: statementLocale,
    });
  }

  async function downloadStatement(format: "excel" | "pdf") {
    setError(null);
    try {
      await fetchDownload(`/api/doctor/reports/export?${statementParams(format).toString()}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    }
  }

  async function viewStatement() {
    setError(null);
    setViewLoading(true);
    try {
      const res = await fetch(`/api/doctor/reports/export?${statementParams("json").toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("View failed");
      setViewTable((await res.json()) as ReportTable);
    } catch (e) {
      setError(e instanceof Error ? e.message : "View failed");
    } finally {
      setViewLoading(false);
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
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">{strings.statementLanguage}</span>
            <select
              value={statementLocale}
              onChange={(e) => setStatementLocale(e.target.value)}
              className="gh-select"
            >
              {STATEMENT_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={viewStatement} disabled={viewLoading} className="gh-btn gh-btn-soft text-sm disabled:opacity-50">
            {viewLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />} {strings.view}
          </button>
          <button type="button" onClick={() => downloadStatement("excel")} className="gh-btn gh-btn-soft text-sm">
            <FileSpreadsheet className="size-3.5" /> {strings.excel}
          </button>
          <button type="button" onClick={() => downloadStatement("pdf")} className="gh-btn gh-btn-soft text-sm">
            <FileText className="size-3.5" /> {strings.pdf}
          </button>
        </div>
      </div>

      <PortalDialog
        open={viewTable !== null}
        onClose={() => setViewTable(null)}
        title={strings.viewTitle}
        width="lg"
      >
        {viewTable ? (
          <div>
            <p className="text-sm font-medium text-[var(--portal-text)]">{viewTable.title}</p>
            {viewTable.subtitle ? (
              <p className="mt-0.5 text-xs text-[var(--portal-muted)]">{viewTable.subtitle}</p>
            ) : null}
            {viewTable.summary?.length ? (
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
                {viewTable.summary.map((s) => (
                  <div key={s.label}>
                    <dt className="text-[var(--portal-muted)]">{s.label}</dt>
                    <dd className="font-medium text-[var(--portal-text)]">{s.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--portal-line)]">
                    {viewTable.columns.map((c) => (
                      <th
                        key={c.key}
                        className={`whitespace-nowrap py-1.5 pr-3 font-medium text-[var(--portal-muted)] ${c.align === "right" ? "text-right" : ""}`}
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {viewTable.rows.map((row, i) =>
                    row._section ? (
                      <tr key={i}>
                        <td colSpan={viewTable.columns.length} className="pt-3 pb-1 font-medium text-[var(--portal-text)]">
                          {row._section}
                        </td>
                      </tr>
                    ) : row._sectionNote ? (
                      <tr key={i}>
                        <td colSpan={viewTable.columns.length} className="pb-2 text-[var(--portal-muted)]">
                          {row._sectionNote}
                        </td>
                      </tr>
                    ) : (
                      <tr key={i} className={`border-b border-[var(--portal-line)] ${row._total ? "font-semibold" : ""}`}>
                        {viewTable.columns.map((c) => (
                          <td key={c.key} className={`whitespace-nowrap py-1.5 pr-3 ${c.align === "right" ? "text-right" : ""}`}>
                            {row[c.key] ?? "—"}
                          </td>
                        ))}
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </PortalDialog>

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
                  <p className="truncate font-medium text-[var(--portal-text)]" title={it.filename}>{it.filename}</p>
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
