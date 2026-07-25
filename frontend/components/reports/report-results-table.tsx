import type { CSSProperties } from "react";

/**
 * On-screen renderer for a report `ReportTable` (the same JSON the CSV / Excel
 * / PDF exports are built from — fetched with `?format=json`). Used by both the
 * admin and doctor report panels so the table shown on screen can never diverge
 * from the downloaded file.
 *
 * Mirrors the PDF layout: an optional header block of key/value facts (payout
 * statements use it for account holder / IBAN / total to pay), then the table
 * with full-width `_section` rows and bold `_total` rows.
 */

export type ReportCell = string | number | boolean | null;

export type ReportTableDto = {
  title: string;
  subtitle?: string;
  summary?: { label: string; value: string }[];
  columns: { key: string; label: string; align?: "left" | "right" }[];
  rows: Array<Record<string, ReportCell> & { _total?: boolean; _section?: string }>;
  truncated?: boolean;
  generatedAt: string;
};

const border = "1px solid var(--portal-line, var(--color-border))";
const muted = "var(--portal-muted, var(--color-text-muted))";

function fmtCell(value: ReportCell): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function ReportResultsTable({ table }: { table: ReportTableDto }) {
  const colCount = table.columns.length;
  const generated = (() => {
    try {
      return new Date(table.generatedAt).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return table.generatedAt;
    }
  })();

  return (
    <section className="gh-card p-5" aria-label={table.title}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold" style={{ color: "var(--portal-text)" }}>
            {table.title}
          </h3>
          {table.subtitle ? (
            <p className="mt-0.5 text-sm" style={{ color: muted }}>
              {table.subtitle}
            </p>
          ) : null}
        </div>
        <span className="text-xs" style={{ color: muted }}>
          {table.rows.length} row{table.rows.length === 1 ? "" : "s"}
        </span>
      </div>

      {table.summary?.length ? (
        <dl className="mt-4 grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
          {table.summary.map((s) => (
            <div
              key={s.label}
              className="flex items-baseline justify-between gap-4 py-1"
              style={{ borderBottom: border }}
            >
              <dt
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: muted }}
              >
                {s.label}
              </dt>
              <dd
                className="text-right text-sm tabular-nums"
                style={{ color: "var(--portal-text)" }}
              >
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {table.columns.map((c) => (
                <th
                  key={c.key}
                  className="whitespace-nowrap px-2 py-2 text-[11px] font-semibold uppercase tracking-wide"
                  style={{
                    color: muted,
                    textAlign: c.align === "right" ? "right" : "left",
                    borderBottom: border,
                  }}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={colCount}
                  className="px-2 py-6 text-center text-sm"
                  style={{ color: muted }}
                >
                  No rows in this range.
                </td>
              </tr>
            ) : (
              table.rows.map((row, i) => {
                if (row._section) {
                  return (
                    <tr key={`s-${i}`}>
                      <td
                        colSpan={colCount}
                        className="px-2 pb-1.5 pt-4 text-xs font-bold uppercase tracking-wide"
                        style={{ color: muted, borderBottom: border }}
                      >
                        {row._section}
                      </td>
                    </tr>
                  );
                }
                const isTotal = Boolean(row._total);
                return (
                  <tr key={`r-${i}`}>
                    {table.columns.map((c) => {
                      const style: CSSProperties = {
                        textAlign: c.align === "right" ? "right" : "left",
                        borderBottom: border,
                        ...(isTotal
                          ? { fontWeight: 700, color: "var(--portal-text)" }
                          : {}),
                      };
                      return (
                        <td
                          key={c.key}
                          className="px-2 py-2 align-top tabular-nums"
                          style={style}
                        >
                          {fmtCell(row[c.key])}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {table.truncated ? (
        <p className="mt-3 text-xs" style={{ color: "var(--color-amber-600, #b45309)" }}>
          List truncated at the export row limit — narrow the date range or filters
          for a complete pull.
        </p>
      ) : null}

      <p className="mt-3 text-xs" style={{ color: muted }}>
        Generated {generated}
      </p>
    </section>
  );
}
