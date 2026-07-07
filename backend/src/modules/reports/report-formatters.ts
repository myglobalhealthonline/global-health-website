import { htmlToPdfBuffer } from "../generated-documents/html-document-renderer.js";

/**
 * Shared shape + renderers for the tabular list reports exported from the
 * doctor and admin portals. A dataset builder returns a `ReportTable`; the
 * route then serialises it to CSV or PDF depending on `?format=`.
 *
 * Both formats read the SAME table, so the numbers a doctor downloads as CSV
 * (for accounting) and as PDF (for filing) can never diverge.
 */

export type ReportColumn = {
  key: string;
  label: string;
  /** Right-align numeric columns in the PDF. Defaults to left. */
  align?: "left" | "right";
};

export type ReportCellValue = string | number | boolean | null | undefined;

export type ReportRow = {
  [key: string]: ReportCellValue;
  /** Marks a summary/total row — rendered bold in PDF + Excel. */
  _total?: boolean;
};

export type ReportTable = {
  title: string;
  /** e.g. "Dr Jane Doe · last 30 days". Rendered under the title. */
  subtitle?: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  /** Set when the row cap was hit so the reader knows the list is partial. */
  truncated?: boolean;
  /** ISO timestamp the report was generated. */
  generatedAt: string;
};

export type ExportFormat = "csv" | "excel" | "pdf";

export type SerializedReport = {
  body: Buffer | string;
  contentType: string;
  /** File extension without the dot. */
  ext: string;
};

/** Serialise a table into the requested download format. Centralises the
 *  format→(body, mime, ext) mapping so both routes stay in lock-step. */
export async function serializeReport(
  table: ReportTable,
  format: ExportFormat,
): Promise<SerializedReport> {
  if (format === "pdf") {
    return {
      body: await renderReportPdf(table),
      contentType: "application/pdf",
      ext: "pdf",
    };
  }
  if (format === "excel") {
    return {
      body: toExcelXml(table),
      // SpreadsheetML 2003 — Excel opens it natively from a .xls extension.
      contentType: "application/vnd.ms-excel",
      ext: "xls",
    };
  }
  return {
    body: toCsv(table),
    contentType: "text/csv; charset=utf-8",
    ext: "csv",
  };
}

// ── CSV (RFC 4180) ──────────────────────────────────────────────────────────

/** Quote a value + double-up inner quotes so commas / newlines are safe. */
function csvCell(value: ReportCellValue): string {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(table: ReportTable): string {
  const lines: string[] = [];
  lines.push(table.columns.map((c) => csvCell(c.label)).join(","));
  for (const row of table.rows) {
    lines.push(table.columns.map((c) => csvCell(row[c.key])).join(","));
  }
  if (table.truncated) {
    lines.push(
      csvCell(
        "NOTE: list truncated at the export row limit — narrow the date range or filters for a complete pull.",
      ),
    );
  }
  // CRLF + trailing newline mirrors the audit-log export for Excel parity.
  return lines.join("\r\n") + "\r\n";
}

// ── PDF (HTML → Chromium) ────────────────────────────────────────────────────

function esc(value: ReportCellValue): string {
  const s = value === null || value === undefined ? "" : String(value);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtGeneratedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function buildReportHtml(table: ReportTable): string {
  const head = table.columns
    .map(
      (c) =>
        `<th style="text-align:${c.align === "right" ? "right" : "left"};">${esc(c.label)}</th>`,
    )
    .join("");

  const body =
    table.rows.length === 0
      ? `<tr><td colspan="${table.columns.length}" style="padding:18px 8px;text-align:center;color:#888;">No rows in this range.</td></tr>`
      : table.rows
          .map(
            (row) =>
              `<tr${row._total ? ' class="total"' : ""}>${table.columns
                .map(
                  (c) =>
                    `<td style="text-align:${c.align === "right" ? "right" : "left"};">${esc(row[c.key])}</td>`,
                )
                .join("")}</tr>`,
          )
          .join("");

  const truncatedNote = table.truncated
    ? `<p style="margin:12px 0 0;font-size:10px;color:#b45309;">List truncated at the export row limit — narrow the date range or filters for a complete pull.</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${esc(table.title)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #111;
    font-size: 11px;
    margin: 0;
    padding: 28px 32px;
    line-height: 1.4;
  }
  .head {
    border-bottom: 2px solid #1B4D3E;
    padding-bottom: 12px;
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .brand { font-size: 16px; font-weight: 800; color: #1B4D3E; }
  h1 { font-size: 15px; margin: 4px 0 0; color: #111; }
  .subtitle { font-size: 11px; color: #555; margin: 3px 0 0; }
  .meta { font-size: 10px; color: #888; text-align: right; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #555;
    font-weight: 700;
    border-bottom: 1.5px solid #1B4D3E;
    padding: 6px 6px;
  }
  td { padding: 5px 6px; border-bottom: 1px solid #eee; vertical-align: top; }
  tr:nth-child(even) td { background: #fafafa; }
  tr.total td { font-weight: 700; border-top: 1.5px solid #1B4D3E; background: #f0f4f2; }
  .count { font-size: 10px; color: #666; margin: 12px 0 0; }
</style>
</head>
<body>
  <div class="head">
    <div>
      <div class="brand">Global Health</div>
      <h1>${esc(table.title)}</h1>
      ${table.subtitle ? `<p class="subtitle">${esc(table.subtitle)}</p>` : ""}
    </div>
    <div class="meta">Generated ${esc(fmtGeneratedAt(table.generatedAt))}</div>
  </div>
  <table>
    <thead><tr>${head}</tr></thead>
    <tbody>${body}</tbody>
  </table>
  <p class="count">${table.rows.length} row${table.rows.length === 1 ? "" : "s"}</p>
  ${truncatedNote}
</body>
</html>`;
}

export function renderReportPdf(table: ReportTable): Promise<Buffer> {
  return htmlToPdfBuffer(buildReportHtml(table));
}

// ── Excel (SpreadsheetML 2003 XML) ───────────────────────────────────────────

/** XML-escape a value for a SpreadsheetML cell. */
function xmlEsc(value: ReportCellValue): string {
  const s = value === null || value === undefined ? "" : String(value);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Numeric cell if the value is a finite number, else a String cell. */
function excelCell(value: ReportCellValue, styleId?: string): string {
  const style = styleId ? ` ss:StyleID="${styleId}"` : "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<Cell${style}><Data ss:Type="Number">${value}</Data></Cell>`;
  }
  return `<Cell${style}><Data ss:Type="String">${xmlEsc(value)}</Data></Cell>`;
}

/**
 * Emit a SpreadsheetML 2003 workbook. Zero-dependency Excel format — no
 * xlsx zip lib needed. Excel opens it natively; numeric columns stay numeric
 * so totals + filters work in-sheet.
 */
export function toExcelXml(table: ReportTable): string {
  const header = table.columns
    .map((c) => `<Cell ss:StyleID="hdr"><Data ss:Type="String">${xmlEsc(c.label)}</Data></Cell>`)
    .join("");

  const bodyRows = table.rows
    .map((row) => {
      const style = row._total ? "total" : undefined;
      const cells = table.columns.map((c) => excelCell(row[c.key], style)).join("");
      return `<Row>${cells}</Row>`;
    })
    .join("");

  const sheetName = table.title.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Report";

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="hdr"><Font ss:Bold="1"/><Interior ss:Color="#E5EAE7" ss:Pattern="Solid"/></Style>
    <Style ss:ID="total"><Font ss:Bold="1"/></Style>
  </Styles>
  <Worksheet ss:Name="${xmlEsc(sheetName)}">
    <Table>
      <Row>${header}</Row>
      ${bodyRows}
    </Table>
  </Worksheet>
</Workbook>`;
}

// ── Shared value helpers for dataset builders ────────────────────────────────

export function fmtMoney(
  cents: number | null | undefined,
  currency: string | null | undefined,
): string {
  if (cents === null || cents === undefined) return "";
  const code = currency && currency.trim() ? currency : "USD";
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: code }).format(
      cents / 100,
    );
  } catch {
    return `${(cents / 100).toFixed(2)} ${code}`;
  }
}

export function fmtDate(value: Date | null | undefined): string {
  if (!value) return "";
  return value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function fmtDateTime(value: Date | null | undefined): string {
  if (!value) return "";
  return value.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
