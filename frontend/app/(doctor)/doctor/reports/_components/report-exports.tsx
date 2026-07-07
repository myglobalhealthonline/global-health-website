"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";

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

  function download(format: "excel" | "pdf") {
    const params = new URLSearchParams();
    params.set("dataset", dataset);
    params.set("format", format);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.consultationType) params.set("consultationType", filters.consultationType);
    if (filters.paymentStatus) params.set("paymentStatus", filters.paymentStatus);
    if (filters.status) params.set("status", filters.status);
    window.location.href = `/api/doctor/reports/export?${params.toString()}`;
  }

  const activeNote = DATASETS.find((d) => d.value === dataset)?.note;

  return (
    <section className="gh-card p-6">
      <p className="gh-field-label">Download lists</p>
      <p className="mt-1 text-sm text-[var(--portal-muted)]">
        Export the full underlying rows — not just the totals above — as CSV or PDF.
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
        <button type="button" onClick={() => download("excel")} className="gh-btn gh-btn-soft text-sm">
          <FileSpreadsheet className="size-3.5" /> Excel
        </button>
        <button type="button" onClick={() => download("pdf")} className="gh-btn gh-btn-soft text-sm">
          <FileText className="size-3.5" /> PDF
        </button>
      </div>
      {activeNote ? (
        <p className="mt-2 text-xs text-[var(--portal-muted)]">{activeNote}</p>
      ) : null}
    </section>
  );
}
