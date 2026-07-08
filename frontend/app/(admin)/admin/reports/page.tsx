import { BarChart3, FileUp } from "lucide-react";
import { fetchAdminCountries, fetchAdminDoctors } from "@/lib/admin/admin-api";
import { AdminCard, PageHeader } from "../_components/atoms";
import { AdminReportExports } from "./_components/report-exports";
import { AdminUploadedInvoices } from "./_components/uploaded-invoices";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const [doctorsResult, countriesResult] = await Promise.all([
    fetchAdminDoctors({ pageSize: "500" }),
    fetchAdminCountries(),
  ]);

  const doctors = doctorsResult.ok
    ? doctorsResult.data.items
        .map((d) => ({ id: d.id, name: d.fullName }))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];
  const countries = countriesResult.ok
    ? countriesResult.data.countries
        .map((c) => ({ code: c.code, name: c.name }))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  return (
    <>
      <PageHeader
        eyebrow="Analytics"
        title="Reports"
        description="Export list reports as Excel or PDF — services provided by each doctor, the patient roster, the appointment log, and per-doctor payout statements. Pick a report, narrow it with the filters, then download."
      />

      <AdminCard>
        <div className="mb-4 flex items-center gap-2 text-[var(--color-brand-primary)]">
          <BarChart3 className="size-4" />
          <h2 className="text-sm font-semibold">Download a report</h2>
        </div>
        <AdminReportExports doctors={doctors} countries={countries} />
      </AdminCard>

      <div className="mt-4">
        <AdminCard>
          <div className="mb-4 flex items-center gap-2 text-[var(--color-brand-primary)]">
            <FileUp className="size-4" />
            <h2 className="text-sm font-semibold">Doctor-uploaded invoices</h2>
          </div>
          <AdminUploadedInvoices doctors={doctors} />
        </AdminCard>
      </div>
    </>
  );
}
