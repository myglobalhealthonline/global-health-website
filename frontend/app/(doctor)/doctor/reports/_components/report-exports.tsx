"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { fetchDownload } from "@/lib/download";

/**
 * Download panel for the raw list reports behind the dashboard tiles.
 * Server passes the current filter values; the buttons build a same-origin
 * `/api/doctor/reports/export` URL (proxied to the backend by Next, which
 * carries the `gh_auth` cookie) and trigger a plain browser download.
 */

type Dataset = "payout" | "services" | "patients" | "appointments";

const DATASETS: { value: Dataset; label: string; note: string }[] = [
  { value: "payout", label: "Payout statement (last month)", note: "Consultations you provided, valued at your per-service payout, with a total. Basis for your invoice." },
  { value: "services", label: "Services provided", note: "All services you're assigned to (ignores the date range)." },
  { value: "patients", label: "Patients", note: "Distinct patients you've seen in the selected range." },
  { value: "appointments", label: "Appointments", note: "Every appointment matching the filters above." },
];

export function DoctorReportExports({
  filters,
}: {
  filters: {
    from?: string;
    to?: string;
    consultationType?: string;
    paymentStatus?: string;
    status?: string;
  };
}) {
  const [dataset, setDataset] = useState<Dataset>("payout");
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
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setBusy(false);
    }
  }

  const activeNote = DATASETS.find((d) => d.value === dataset)?.note;

  return (
    <section className="gh-card p-6">
      <p className="gh-field-label">Download lists</p>
      <p className="mt-1 text-sm text-[var(--portal-muted)]">
        Export the full underlying rows — not just the totals above — as Excel or PDF.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">Report</span>
          <select
            value={dataset}
            onChange={(e) => setDataset(e.target.value as Dataset)}
            className="gh-select"
          >
            {DATASETS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => download("excel")} disabled={busy} className="gh-btn gh-btn-soft text-sm disabled:opacity-50">
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <FileSpreadsheet className="size-3.5" />} Excel
        </button>
        <button type="button" onClick={() => download("pdf")} disabled={busy} className="gh-btn gh-btn-soft text-sm disabled:opacity-50">
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />} PDF
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
      {activeNote ? (
        <p className="mt-2 text-xs text-[var(--portal-muted)]">{activeNote}</p>
      ) : null}
    </section>
  );
}
