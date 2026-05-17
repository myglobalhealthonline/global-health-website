import { fetchDoctorReports } from "@/lib/api/doctor-api";
import { ReportsCsvButton } from "./_components/csv-button";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function pick(sp: SearchParams, key: string): string | undefined {
  const v = sp[key];
  return typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;
}

function fmtCurrency(cents: number, code: string) {
  const value = cents / 100;
  try {
    return new Intl.NumberFormat(undefined, {
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
  const sp = searchParams ? await searchParams : {};
  const from = pick(sp, "from");
  const to = pick(sp, "to");
  const result = await fetchDoctorReports(from, to);

  return (
    <>
      <header className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Doctor
        </p>
        <h2 className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">
          Reports
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Aggregated counts over your assigned appointments. Defaults to the
          last 30 days.
        </p>
      </header>

      <form className="gh-card mb-4 flex flex-wrap items-end gap-3 p-4" method="get">
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">From</span>
          <input
            type="date"
            name="from"
            defaultValue={from ?? ""}
            className="gh-input"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="gh-field-label">To</span>
          <input
            type="date"
            name="to"
            defaultValue={to ?? ""}
            className="gh-input"
          />
        </label>
        <button type="submit" className="gh-btn gh-btn-primary text-sm">
          Apply
        </button>
        {result.ok ? <ReportsCsvButton data={result.data} /> : null}
      </form>

      {!result.ok ? (
        <div className="gh-card p-6">
          <p className="gh-status-warning rounded-md border px-4 py-3 text-sm">
            {result.message}
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tile
              label="Appointments"
              value={String(result.data.appointments.total)}
            />
            <Tile
              label="Signed consults"
              value={String(result.data.signedConsults)}
            />
            <Tile label="Distinct patients" value={String(result.data.distinctPatients)} />
            <Tile
              label="Revenue (paid)"
              value={
                Object.keys(result.data.revenueByCurrency).length === 0
                  ? "—"
                  : Object.entries(result.data.revenueByCurrency)
                      .map(([code, cents]) => fmtCurrency(cents, code))
                      .join(" + ")
              }
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="gh-card p-6">
              <h3
                className="m-0 text-[var(--color-text-primary)]"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 16,
                  fontWeight: 800,
                }}
              >
                By status
              </h3>
              <BreakdownTable
                rows={result.data.appointments.byStatus.map((r) => ({
                  label: r.status,
                  count: r.count,
                }))}
              />
            </section>
            <section className="gh-card p-6">
              <h3
                className="m-0 text-[var(--color-text-primary)]"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 16,
                  fontWeight: 800,
                }}
              >
                By consultation type
              </h3>
              <BreakdownTable
                rows={result.data.appointments.byConsultationType.map((r) => ({
                  label: r.consultationType,
                  count: r.count,
                }))}
              />
            </section>
          </div>
        </>
      )}
    </>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="gh-card p-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-[var(--color-text-primary)]">
        {value}
      </p>
    </div>
  );
}

function BreakdownTable({ rows }: { rows: { label: string; count: number }[] }) {
  if (rows.length === 0) {
    return (
      <p className="mt-4 text-[13px] text-[var(--color-text-muted)]">
        Nothing in this range.
      </p>
    );
  }
  return (
    <table className="mt-4 w-full text-[13px]">
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="border-t border-[var(--color-border)]">
            <td className="py-2 capitalize">{r.label.toLowerCase().replace(/_/g, " ")}</td>
            <td className="py-2 text-right font-mono">{r.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
