"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";

/**
 * Admin (global) report download panel. Builds a same-origin
 * `/api/admin/reports/export` URL — proxied to the backend by Next so the
 * admin session cookie rides along — and triggers a plain browser download.
 */

type Dataset = "payout" | "services" | "patients" | "appointments";

const DATASETS: { value: Dataset; label: string; note: string }[] = [
  {
    value: "payout",
    label: "Doctor payout statement",
    note: "One doctor's consultations valued at their per-service payout, with a total. Select a doctor. Defaults to last calendar month.",
  },
  {
    value: "services",
    label: "Services by doctor",
    note: "Every doctor↔service assignment with payout. Pick a doctor to narrow. Ignores the date range.",
  },
  {
    value: "patients",
    label: "Patients",
    note: "All registered patient profiles. Ignores doctor/date filters.",
  },
  {
    value: "appointments",
    label: "Appointments",
    note: "All appointments, filterable by doctor, country, status, payment and date.",
  },
];

const APPT_STATUSES = [
  { value: "REQUEST_RECEIVED", label: "Created" },
  { value: "UNDER_REVIEW", label: "Under review" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "COMPLETED", label: "Concluded" },
  { value: "CANCELLED", label: "Cancelled" },
];

const PAYMENT_STATUSES = ["UNPAID", "PENDING", "PAID", "REFUNDED", "FAILED"];

export function AdminReportExports({
  doctors,
  countries,
}: {
  doctors: { id: string; name: string }[];
  countries: { code: string; name: string }[];
}) {
  const [dataset, setDataset] = useState<Dataset>("appointments");
  const [doctorId, setDoctorId] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");

  const showDoctor = dataset !== "patients";
  const showApptFilters = dataset === "appointments";
  const showDateRange = dataset === "appointments" || dataset === "payout";
  const doctorRequired = dataset === "payout";
  const blocked = doctorRequired && !doctorId;

  function download(format: "excel" | "pdf") {
    if (blocked) return;
    const params = new URLSearchParams();
    params.set("dataset", dataset);
    params.set("format", format);
    if (showDoctor && doctorId) params.set("doctorId", doctorId);
    if (showDateRange) {
      if (from) params.set("from", from);
      if (to) params.set("to", to);
    }
    if (showApptFilters) {
      if (countryCode) params.set("countryCode", countryCode);
      if (status) params.set("status", status);
      if (paymentStatus) params.set("paymentStatus", paymentStatus);
    }
    window.location.href = `/api/admin/reports/export?${params.toString()}`;
  }

  const activeNote = DATASETS.find((d) => d.value === dataset)?.note;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
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

        {showDoctor ? (
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">Doctor</span>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="gh-select"
            >
              <option value="">All doctors</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {showApptFilters ? (
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">Country</span>
            <select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="gh-select"
            >
              <option value="">All countries</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {showDateRange ? (
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">From</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="gh-input" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">To</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="gh-input" />
          </label>
          {showApptFilters ? (
            <>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Status</span>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="gh-select">
                  <option value="">Any</option>
                  {APPT_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="gh-field-label">Payment</span>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="gh-select"
                >
                  <option value="">Any</option>
                  {PAYMENT_STATUSES.map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0) + p.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => download("excel")}
          disabled={blocked}
          className="gh-btn gh-btn-primary text-sm disabled:opacity-50"
        >
          <FileSpreadsheet className="size-3.5" /> Export Excel
        </button>
        <button
          type="button"
          onClick={() => download("pdf")}
          disabled={blocked}
          className="gh-btn gh-btn-outline text-sm disabled:opacity-50"
        >
          <FileText className="size-3.5" /> Export PDF
        </button>
      </div>

      {blocked ? (
        <p className="text-xs text-amber-600">Select a doctor to export a payout statement.</p>
      ) : null}
      {activeNote ? <p className="text-xs text-[var(--color-text-muted)]">{activeNote}</p> : null}
    </div>
  );
}
