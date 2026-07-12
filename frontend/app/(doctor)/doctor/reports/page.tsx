import { fetchDoctorReports } from "@/lib/api/doctor-api";
import { AdminEmptyState, PageHeader, SectionHeader } from "@/components/portal-atoms";
import { ReportsCsvButton } from "./_components/csv-button";
import { DoctorReportExports } from "./_components/report-exports";
import { getPageLocale } from "@/lib/i18n/get-page-locale";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function pick(sp: SearchParams, key: string): string | undefined {
  const v = sp[key];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

function fmtCurrency(cents: number, code: string) {
  const value = cents / 100;
  try {
    // Pin the locale — `undefined` uses the runtime default, which differs
    // between the Node server and a non-English browser, causing a
    // hydration mismatch (React insertBefore crash) on this server component.
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: code === "—" ? "USD" : code,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${code}`;
  }
}

export default async function DoctorReportsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const locale = await getPageLocale();
  const { doctor: d } = loadLocaleBundle(locale);
  const sp = searchParams ? await searchParams : {};
  const from = pick(sp, "from");
  const to = pick(sp, "to");
  const consultationType = pick(sp, "consultationType");
  const paymentStatus = pick(sp, "paymentStatus");
  const status = pick(sp, "status");
  const result = await fetchDoctorReports({
    from,
    to,
    consultationType,
    paymentStatus,
    status,
  });

  return (
    <>
      <PageHeader
        eyebrow={d.reports.eyebrow}
        title={d.reports.title}
        description={d.reports.description}
        actions={result.ok ? <ReportsCsvButton data={result.data} label={d.reports.exportCsv} /> : null}
      />

      <form className="gh-card gh-doctor-filter-card gh-doctor-filter-grid mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5" method="get">
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">{d.common.from}</span>
          <input
            type="date"
            name="from"
            defaultValue={from ?? ""}
            className="gh-input"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">{d.common.to}</span>
          <input
            type="date"
            name="to"
            defaultValue={to ?? ""}
            className="gh-input"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">{d.common.type}</span>
          <select
            name="consultationType"
            defaultValue={consultationType ?? ""}
            className="gh-select"
          >
            <option value="">{d.common.any}</option>
            <option value="general">{d.appointments.typeGeneral}</option>
            <option value="specialist">{d.appointments.typeSpecialist}</option>
            <option value="prescription">{d.appointments.typePrescription}</option>
            <option value="health-test">{d.appointments.typeHealthTest}</option>
            <option value="follow-up">{d.appointments.typeFollowUp}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">{d.reports.filterApptStatus}</span>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="gh-select"
          >
            <option value="">{d.common.any}</option>
            <option value="REQUEST_RECEIVED">{d.reports.statusCreated}</option>
            <option value="UNDER_REVIEW">{d.reports.statusUnderReview}</option>
            <option value="CONTACTED">{d.reports.statusContacted}</option>
            <option value="COMPLETED">{d.reports.statusConcluded}</option>
            <option value="CANCELLED">{d.reports.statusCancelled}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">{d.reports.filterPayment}</span>
          <select
            name="paymentStatus"
            defaultValue={paymentStatus ?? ""}
            className="gh-select"
          >
            <option value="">{d.common.any}</option>
            <option value="UNPAID">{d.reports.paymentUnpaid}</option>
            <option value="PENDING">{d.reports.paymentPending}</option>
            <option value="PAID">{d.reports.paymentPaid}</option>
            <option value="REFUNDED">{d.reports.paymentRefunded}</option>
            <option value="FAILED">{d.reports.paymentFailed}</option>
          </select>
        </label>
        <div className="gh-doctor-filter-actions sm:col-span-2 lg:col-span-5 flex flex-wrap items-center gap-2">
          <button type="submit" className="gh-btn gh-btn-primary text-sm">
            {d.common.apply}
          </button>
        </div>
      </form>

      <div className="mb-4">
        <DoctorReportExports
          filters={{ from, to, consultationType, paymentStatus, status }}
          strings={d.reports}
          excelLabel={d.invoices.excel}
          pdfLabel={d.invoices.pdf}
        />
      </div>

      {!result.ok ? (
        <div className="gh-card p-6">
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            {result.message}
          </p>
        </div>
      ) : (
        <>
          <div className="gh-doctor-report-tile-grid mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Tile
              label={d.reports.tileAppointments}
              value={String(result.data.appointments?.total ?? 0)}
            />
            <Tile
              label={d.reports.tileSignedConsults}
              value={String(result.data.signedConsults ?? 0)}
            />
            <Tile
              label={d.reports.tileFollowUps}
              value={String(result.data.followUps ?? 0)}
            />
            <Tile
              label={d.reports.tileDistinctPatients}
              value={String(result.data.distinctPatients ?? 0)}
            />
            <Tile
              label={d.reports.tileRevenuePaid}
              value={
                Object.keys(result.data.revenueByCurrency ?? {}).length === 0
                  ? "—"
                  : Object.entries(result.data.revenueByCurrency ?? {})
                      .map(([code, cents]) => fmtCurrency(cents, code))
                      .join(" + ")
              }
            />
          </div>

          {(() => {
            const byStatusRows = (result.data.appointments?.byStatus ?? []).map((r) => ({
              label: r.status,
              count: r.count,
            }));
            const byTypeRows = (result.data.appointments?.byConsultationType ?? []).map((r) => ({
              label: r.consultationType,
              count: r.count,
            }));
            // 13-001: both breakdowns are empty for the exact same reason (no
            // appointments in range) — show one empty-state, not two.
            if (byStatusRows.length === 0 && byTypeRows.length === 0) {
              return (
                <section className="gh-card gh-doctor-report-card p-6">
                  <AdminEmptyState
                    className="gh-doctor-empty-state"
                    title={d.reports.emptyRangeTitle}
                    description={d.reports.emptyRangeDesc}
                  />
                </section>
              );
            }
            return (
              <div className="gh-doctor-report-grid grid gap-4 lg:grid-cols-2">
                <section className="gh-card gh-doctor-report-card p-6">
                  <SectionHeader
                    title={d.reports.byStatusTitle}
                    description={d.reports.byStatusDesc}
                  />
                  <BreakdownTable
                    rows={byStatusRows}
                    emptyTitle={d.reports.emptyRangeTitle}
                    emptyDesc={d.reports.emptyRangeDesc}
                  />
                </section>
                <section className="gh-card gh-doctor-report-card p-6">
                  <SectionHeader
                    title={d.reports.byTypeTitle}
                    description={d.reports.byTypeDesc}
                  />
                  <BreakdownTable
                    rows={byTypeRows}
                    emptyTitle={d.reports.emptyRangeTitle}
                    emptyDesc={d.reports.emptyRangeDesc}
                  />
                </section>
              </div>
            );
          })()}
        </>
      )}
    </>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="gh-card gh-doctor-report-tile p-5">
      <p className="text-portal-thead font-bold uppercase tracking-[0.12em] text-[var(--portal-muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-[var(--portal-text)]">
        {value}
      </p>
    </div>
  );
}

function BreakdownTable({
  rows,
  emptyTitle,
  emptyDesc,
}: {
  rows: { label: string; count: number }[];
  emptyTitle: string;
  emptyDesc: string;
}) {
  if (rows.length === 0) {
    return (
      <AdminEmptyState
        className="gh-doctor-empty-state mt-4"
        title={emptyTitle}
        description={emptyDesc}
      />
    );
  }
  return (
    <table className="gh-doctor-mini-table mt-4 w-full text-portal-compact">
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="border-t border-[var(--portal-line)]">
            <td className="py-2 capitalize">{r.label.toLowerCase().replace(/_/g, " ")}</td>
            <td className="py-2 text-right font-mono">{r.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
