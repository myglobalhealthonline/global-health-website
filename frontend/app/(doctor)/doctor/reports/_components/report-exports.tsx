"use client";

import { useState } from "react";
import Link from "next/link";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { fetchDownload } from "@/lib/download";

/**
 * Download panel for the raw list reports behind the dashboard tiles.
 * Server passes the current filter values; the buttons build a same-origin
 * `/api/doctor/reports/export` URL (proxied to the backend by Next, which
 * carries the `gh_auth` cookie) and trigger a plain browser download.
 */

type Dataset = "services" | "patients" | "appointments";
type ReportsStrings = Record<string, string>;

export function DoctorReportExports({
  filters,
  strings: s,
  excelLabel,
  pdfLabel,
}: {
  filters: {
    from?: string;
    to?: string;
    consultationType?: string;
    paymentStatus?: string;
    status?: string;
  };
  strings: ReportsStrings;
  excelLabel: string;
  pdfLabel: string;
}) {
  const DATASETS: { value: Dataset; label: string; note: string }[] = [
    { value: "services", label: s.datasetServicesLabel, note: s.datasetServicesNote },
    { value: "patients", label: s.datasetPatientsLabel, note: s.datasetPatientsNote },
    { value: "appointments", label: s.datasetAppointmentsLabel, note: s.datasetAppointmentsNote },
  ];
  const [dataset, setDataset] = useState<Dataset>("services");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download(format: "excel" | "pdf") {
    if (busy) return;
    setError(null);
    const params = new URLSearchParams();
    params.set("dataset", dataset);
    params.set("format", format);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.consultationType) params.set("consultationType", filters.consultationType);
    if (filters.paymentStatus) params.set("paymentStatus", filters.paymentStatus);
    if (filters.status) params.set("status", filters.status);
    setBusy(true);
    try {
      await fetchDownload(`/api/doctor/reports/export?${params.toString()}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : s.downloadFailed);
    } finally {
      setBusy(false);
    }
  }

  const activeNote = DATASETS.find((d) => d.value === dataset)?.note;

  return (
    <section className="gh-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="gh-field-label">{s.downloadListsTitle}</p>
          <p className="mt-1 text-sm text-[var(--portal-muted)]">
            {s.downloadListsDesc}
          </p>
        </div>
        <Link
          href="/doctor/invoices?tab=statement"
          className="text-xs text-[var(--portal-muted)] underline underline-offset-2 hover:text-[var(--portal-text)]"
        >
          {s.crossLinkToInvoices}
        </Link>
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">{s.reportLabel}</span>
          <select
            value={dataset}
            onChange={(e) => setDataset(e.target.value as Dataset)}
            className="gh-select"
          >
            {DATASETS.map((ds) => (
              <option key={ds.value} value={ds.value}>
                {ds.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => download("excel")} disabled={busy} className="gh-btn gh-btn-soft text-sm disabled:opacity-50">
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <FileSpreadsheet className="size-3.5" />} {excelLabel}
        </button>
        <button type="button" onClick={() => download("pdf")} disabled={busy} className="gh-btn gh-btn-soft text-sm disabled:opacity-50">
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />} {pdfLabel}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
      {activeNote ? (
        <p className="mt-2 text-xs text-[var(--portal-muted)]">{activeNote}</p>
      ) : null}
    </section>
  );
}
