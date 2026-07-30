"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText, Loader2, Search } from "lucide-react";
import { fetchDownload, fetchReportJson } from "@/lib/download";
import {
  ReportResultsTable,
  type ReportTableDto,
} from "@/components/reports/report-results-table";

/**
 * Admin (global) report download panel. Builds a same-origin
 * `/api/admin/reports/export` URL — proxied to the backend by Next so the
 * admin session cookie rides along — and triggers a plain browser download.
 */

type Dataset =
  | "payout"
  | "commission-payouts"
  | "services"
  | "patients"
  | "appointments";

const DATASETS: { value: Dataset; label: string; note: string }[] = [
  {
    value: "payout",
    label: "Doctor payout statement",
    note: "One doctor's consultations valued at their per-service payout, with a total and the doctor's IBAN. Select a doctor; optionally narrow by country (for doctors working several markets) or consultation type. Starts from 17 Jul 2026 — earlier consultations are excluded. Defaults to last calendar month. Pick a statement language (English, Portuguese, Spanish, Czech, Romanian, German) to hand the doctor a document in their own language — the whole document, headings and totals included.",
  },
  {
    value: "commission-payouts",
    label: "Doctor payouts — commission markets (Brazil)",
    note: "What to transfer each doctor, for the manual bank run. Grouped by doctor, with the amount charged, Global Health's commission and the doctor's payout per consultation, plus a TO TRANSFER subtotal each and a grand total. Covers ALL doctors unless you pick one. Only paid, non-refunded orders count, and the figures are the ones frozen on the order at checkout — so the run always reconciles against the receipts actually issued, even if a service's payout was edited since. Defaults to last calendar month.",
  },
  {
    value: "services",
    label: "Services by doctor",
    note: "Every doctor↔service assignment with payout. Narrow by doctor or country. An optional date range narrows to assignments created in that window (see the Assigned column). Ignores consultation type.",
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

/**
 * Languages the payout statement can be rendered in — mirrors
 * `PAYOUT_STATEMENT_LOCALES` in backend/src/modules/reports/payout-statement-content.ts.
 * Native display names, shown regardless of the admin's own UI language, so the
 * language the STATEMENT comes out in is never ambiguous. Only the payout
 * dataset is translated; every other export stays English.
 */
const STATEMENT_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "pt", name: "Português" },
  { code: "es", name: "Español" },
  { code: "cs", name: "Čeština" },
  { code: "ro", name: "Română" },
  { code: "de", name: "Deutsch" },
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
  const [statementLocale, setStatementLocale] = useState("en");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ReportTableDto | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);

  // Each flag tracks which filters the matching backend builder actually
  // honours — a control is only rendered where it changes the output. Every
  // dataset narrows by doctor, so that select is always shown. Payout now
  // honours a country filter too (for doctors working more than one market).
  const showCountry = true;
  const showType = dataset !== "services";
  const showStatusFilters = dataset === "appointments";
  // Services by doctor now honours an optional From/To (filters by assignment
  // date), so every dataset shows the date range.
  const showDateRange = true;
  // Only the payout statement is localised (labels, section headings, PDF/CSV
  // chrome); the other builders emit English headers only.
  const showLanguage = dataset === "payout";
  const doctorRequired = dataset === "payout";
  const blocked = doctorRequired && !doctorId;

  function buildParams(format: "excel" | "pdf" | "json"): string {
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
    if (showLanguage) params.set("locale", statementLocale);
    if (showStatusFilters) {
      if (status) params.set("status", status);
      if (paymentStatus) params.set("paymentStatus", paymentStatus);
    }
    return params.toString();
  }

  async function download(format: "excel" | "pdf") {
    if (blocked || busy) return;
    setError(null);
    setBusy(true);
    try {
      await fetchDownload(`/api/admin/reports/export?${buildParams(format)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setBusy(false);
    }
  }

  async function viewResults() {
    if (blocked || loadingResults) return;
    setError(null);
    setLoadingResults(true);
    try {
      const table = await fetchReportJson<ReportTableDto>(
        `/api/admin/reports/export?${buildParams("json")}`,
      );
      setResults(table);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load results");
    } finally {
      setLoadingResults(false);
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
          {showLanguage ? (
            <label className="flex flex-col gap-1">
              <span className="gh-field-label">Statement language</span>
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
          ) : null}
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
          onClick={viewResults}
          disabled={blocked || loadingResults}
          className="gh-btn gh-btn-primary text-sm disabled:opacity-50"
        >
          {loadingResults ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />} View results
        </button>
        <button
          type="button"
          onClick={() => download("excel")}
          disabled={blocked || busy}
          className="gh-btn gh-btn-outline text-sm disabled:opacity-50"
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
        <p className="text-xs text-amber-600">Select a doctor to view or export a payout statement.</p>
      ) : null}
      {activeNote ? <p className="text-xs text-[var(--color-text-muted)]">{activeNote}</p> : null}

      {results ? (
        <div className="mt-2">
          <ReportResultsTable table={results} />
        </div>
      ) : null}
    </div>
  );
}
