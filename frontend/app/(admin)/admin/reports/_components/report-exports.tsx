"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { fetchDownload } from "@/lib/download";

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
    note: "One doctor's consultations valued at their per-service payout, with a total. Select a doctor; optionally narrow by consultation type. Defaults to last calendar month.",
  },
  {
    value: "services",
    label: "Services by doctor",
    note: "Every doctor↔service assignment with payout. Narrow by doctor or country. Ignores the date range and consultation type.",
  },
  {
    value: "patients",
    label: "Patients",
    note: "The registered patient roster with each patient's markets, doctors and consultation types. Unfiltered it lists every profile, including patients who never booked. Any country/doctor/type/date filter narrows it to the patients behind the matching appointments.",
  },
  {
    value: "appointments",
    label: "Appointments",
    note: "All appointments, filterable by doctor, country, consultation type, status, payment and date.",
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

// Mirrors `consultationTypeSchema` in backend/src/validations/shared.schema.ts.
const CONSULTATION_TYPES = [
  { value: "general", label: "General" },
  { value: "specialist", label: "Specialist" },
  { value: "prescription", label: "Prescription" },
  { value: "health-test", label: "Health test" },
  { value: "follow-up", label: "Follow-up" },
];

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
  const [consultationType, setConsultationType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Each flag tracks which filters the matching backend builder actually
  // honours — a control is only rendered where it changes the output. Every
  // dataset narrows by doctor, so that select is always shown.
  const showCountry = dataset !== "payout";
  const showType = dataset !== "services";
  const showStatusFilters = dataset === "appointments";
  const showDateRange = dataset !== "services";
  const doctorRequired = dataset === "payout";
  const blocked = doctorRequired && !doctorId;

  async function download(format: "excel" | "pdf") {
    if (blocked || busy) return;
    setError(null);
    const params = new URLSearchParams();
    params.set("dataset", dataset);
    params.set("format", format);
    if (doctorId) params.set("doctorId", doctorId);
    if (showCountry && countryCode) params.set("countryCode", countryCode);
    if (showType && consultationType) params.set("consultationType", consultationType);
    if (showDateRange) {
      if (from) params.set("from", from);
      if (to) params.set("to", to);
    }
    if (showStatusFilters) {
      if (status) params.set("status", status);
      if (paymentStatus) params.set("paymentStatus", paymentStatus);
    }
    setBusy(true);
    try {
      await fetchDownload(`/api/admin/reports/export?${params.toString()}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setBusy(false);
    }
  }

  const activeNote = DATASETS.find((d) => d.value === dataset)?.note;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

        {showCountry ? (
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

        {showType ? (
          <label className="flex flex-col gap-1">
            <span className="gh-field-label">Consultation type</span>
            <select
              value={consultationType}
              onChange={(e) => setConsultationType(e.target.value)}
              className="gh-select"
            >
              <option value="">All types</option>
              {CONSULTATION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
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
          {showStatusFilters ? (
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
          disabled={blocked || busy}
          className="gh-btn gh-btn-primary text-sm disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <FileSpreadsheet className="size-3.5" />} Export Excel
        </button>
        <button
          type="button"
          onClick={() => download("pdf")}
          disabled={blocked || busy}
          className="gh-btn gh-btn-outline text-sm disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <FileText className="size-3.5" />} Export PDF
        </button>
      </div>

      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      {blocked ? (
        <p className="text-xs text-amber-600">Select a doctor to export a payout statement.</p>
      ) : null}
      {activeNote ? <p className="text-xs text-[var(--color-text-muted)]">{activeNote}</p> : null}
    </div>
  );
}
