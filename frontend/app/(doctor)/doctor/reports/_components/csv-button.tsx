"use client";

import { Download } from "lucide-react";
import type { DoctorReportsDto } from "@/lib/api/doctor-api";

/**
 * Client-side CSV export. Re-uses the JSON the server fetched — no
 * extra round-trip, no extra endpoint. Useful for ops handing the
 * numbers to billing / external accounting.
 */
export function ReportsCsvButton({ data }: { data: DoctorReportsDto }) {
  function buildCsv(): string {
    const lines: string[] = [];
    lines.push("section,key,value");
    lines.push(`range,from,${data.range.from}`);
    lines.push(`range,to,${data.range.to}`);
    lines.push(`appointments,total,${data.appointments.total}`);
    lines.push(`signed_consults,total,${data.signedConsults}`);
    lines.push(`distinct_patients,total,${data.distinctPatients}`);
    for (const r of data.appointments.byStatus) {
      lines.push(`by_status,${r.status},${r.count}`);
    }
    for (const r of data.appointments.byConsultationType) {
      lines.push(`by_consultation_type,${r.consultationType},${r.count}`);
    }
    for (const [code, cents] of Object.entries(data.revenueByCurrency)) {
      lines.push(`revenue_cents,${code},${cents}`);
    }
    return lines.join("\n");
  }

  function download() {
    const blob = new Blob([buildCsv()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `doctor-report-${data.range.from.slice(0, 10)}_to_${data.range.to.slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={download}
      className="gh-btn gh-btn-soft text-sm"
    >
      <Download className="size-3.5" /> Export CSV
    </button>
  );
}
