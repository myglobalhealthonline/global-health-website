import { PDF_TOKENS as T, PDF_SANS, PDF_SERIF, pdfLogoDataUrl } from "../../lib/pdf/brand.js";
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
  /** Full-width section-header row (e.g. a market name). When set, the row's
   *  column cells are ignored and this label spans the whole width. */
  _section?: string;
  /** Full-width sub-header line under a `_section` row, rendered smaller and
   *  muted (the payout statement uses it for the bank account THAT market is
   *  paid into). Like `_section`, the row's column cells are ignored. */
  _sectionNote?: string;
};

/** A label/value fact rendered in the report header block (above the table) —
 *  e.g. account holder, IBAN, total to pay on a payout statement. */
export type ReportSummaryItem = { label: string; value: string };

/** Generic chrome strings around the table (row count, "no rows", truncation
 *  note). Optional — a table that doesn't set this gets the English defaults
 *  below, so every existing report export is unaffected. Only a table that
 *  explicitly opts in (currently the doctor payout statement, whose language
 *  the doctor picks in the portal) renders in another language. */
export type ReportChrome = {
  reportLabel: string;
  generatedLabel: string;
  rowSingular: string;
  rowPlural: string;
  noRowsInRange: string;
  truncatedNote: string;
};

const DEFAULT_CHROME: ReportChrome = {
  reportLabel: "Report",
  generatedLabel: "Generated",
  rowSingular: "row",
  rowPlural: "rows",
  noRowsInRange: "No rows in this range.",
  truncatedNote:
    "List truncated at the export row limit — narrow the date range or filters for a complete pull.",
};

export type ReportTable = {
  title: string;
  /** e.g. "Dr Jane Doe · last 30 days". Rendered under the title. */
  subtitle?: string;
  /** Key facts shown in a header block above the table (payout statements use
   *  this for account holder / IBAN / period / total to pay). */
  summary?: ReportSummaryItem[];
  columns: ReportColumn[];
  rows: ReportRow[];
  /** Set when the row cap was hit so the reader knows the list is partial. */
  truncated?: boolean;
  /** ISO timestamp the report was generated. */
  generatedAt: string;
  /** BCP-47 tag for `<html lang>` + date formatting. Defaults to "en-GB". */
  locale?: string;
  /** Chrome text override — see `ReportChrome`. Defaults to English. */
  chrome?: ReportChrome;
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
  const chrome = table.chrome ?? DEFAULT_CHROME;
  const lines: string[] = [];
  if (table.summary?.length) {
    for (const s of table.summary) {
      lines.push(`${csvCell(s.label)},${csvCell(s.value)}`);
    }
    lines.push("");
  }
  lines.push(table.columns.map((c) => csvCell(c.label)).join(","));
  for (const row of table.rows) {
    if (row._section) {
      lines.push(csvCell(row._section));
      continue;
    }
    if (row._sectionNote) {
      lines.push(csvCell(row._sectionNote));
      continue;
    }
    lines.push(table.columns.map((c) => csvCell(row[c.key])).join(","));
  }
  if (table.truncated) {
    lines.push(csvCell(`NOTE: ${chrome.truncatedNote}`));
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

function fmtGeneratedAt(iso: string, locale = "en-GB"): string {
  try {
    return new Date(iso).toLocaleString(locale, {
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
  const logo = pdfLogoDataUrl();
  const locale = table.locale ?? "en-GB";
  const chrome = table.chrome ?? DEFAULT_CHROME;
  const generatedLabel = `${chrome.generatedLabel} ${fmtGeneratedAt(table.generatedAt, locale)}`;
  const rowCountLabel = `${table.rows.length} ${table.rows.length === 1 ? chrome.rowSingular : chrome.rowPlural}`;
  const head = table.columns
    .map(
      (c) =>
        `<th style="text-align:${c.align === "right" ? "right" : "left"};">${esc(c.label)}</th>`,
    )
    .join("");

  const body =
    table.rows.length === 0
      ? `<tr><td colspan="${table.columns.length}" style="padding:18px 8px;text-align:center;color:#888;">${esc(chrome.noRowsInRange)}</td></tr>`
      : table.rows
          .map((row) => {
            if (row._section) {
              return `<tr class="section"><td colspan="${table.columns.length}">${esc(row._section)}</td></tr>`;
            }
            if (row._sectionNote) {
              return `<tr class="section-note"><td colspan="${table.columns.length}">${esc(row._sectionNote)}</td></tr>`;
            }
            return `<tr${row._total ? ' class="total"' : ""}>${table.columns
              .map(
                (c) =>
                  `<td style="text-align:${c.align === "right" ? "right" : "left"};">${esc(row[c.key])}</td>`,
              )
              .join("")}</tr>`;
          })
          .join("");

  const summaryHtml = table.summary?.length
    ? `<div class="summary">${table.summary
        .map(
          (s) =>
            `<div class="sum-item"><span class="sum-label">${esc(s.label)}</span><span class="sum-value">${esc(s.value)}</span></div>`,
        )
        .join("")}</div>`
    : "";

  const truncatedNote = table.truncated
    ? `<p style="margin:12px 0 0;font-size:10px;color:#b45309;">${esc(chrome.truncatedNote)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="${esc(locale)}">
<head>
<meta charset="UTF-8">
<title>${esc(table.title)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: ${PDF_SANS};
    font-size: 8.5pt; line-height: 1.45; color: ${T.ink};
    background: ${T.paper};
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
    width: 210mm;
  }
  .spine { position: fixed; left: 0; top: 0; bottom: 0; width: 5mm; background: ${T.night}; }
  .page { padding: 12mm 14mm 14mm 20mm; }
  .topline {
    display: flex; justify-content: space-between; align-items: center;
    border-bottom: 0.5pt solid ${T.hairlineDark}; padding-bottom: 3mm;
  }
  .logo { height: 12mm; width: auto; }
  .logo-text { font-size: 11pt; font-weight: 700; color: ${T.forest}; letter-spacing: 0.04em; }
  .topline .caps {
    font-size: 6.4pt; font-weight: 600; letter-spacing: 0.28em;
    text-transform: uppercase; color: ${T.forest};
  }
  .masthead { margin-top: 6mm; display: flex; justify-content: space-between; align-items: flex-end; }
  .mast-title {
    font-family: ${PDF_SERIF}; font-style: italic;
    font-size: 18pt; line-height: 1.1; color: ${T.night}; letter-spacing: -0.01em;
  }
  .subtitle { font-size: 8.4pt; color: ${T.muted}; margin-top: 1.6mm; }
  .meta { font-size: 7.6pt; color: ${T.faint}; text-align: right; white-space: nowrap; padding-left: 6mm; }
  .rule { margin-top: 4mm; border-top: 1pt solid ${T.night}; }
  table { width: 100%; border-collapse: collapse; margin-top: 4mm; }
  th {
    font-size: 6.4pt; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase;
    color: ${T.forest}; padding: 2mm 1.8mm 1.8mm;
    border-bottom: 1pt solid ${T.night};
  }
  td { padding: 1.9mm 1.8mm; border-bottom: 0.4pt solid ${T.hairline}; vertical-align: top; font-variant-numeric: tabular-nums; }
  tr.total td { font-weight: 700; color: ${T.night}; border-top: 1pt solid ${T.night}; border-bottom: none; }
  tr.section td {
    font-size: 7pt; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase;
    color: ${T.forest}; padding: 4mm 1.8mm 1.6mm; border-bottom: 0.6pt solid ${T.night};
  }
  tr.section-note td {
    font-size: 7.2pt; color: ${T.muted}; padding: 1.4mm 1.8mm;
    border-bottom: 0.4pt solid ${T.hairline};
  }
  .summary {
    margin-top: 4mm; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.4mm 8mm;
  }
  .sum-item {
    display: flex; justify-content: space-between; gap: 4mm; align-items: baseline;
    border-bottom: 0.4pt solid ${T.hairline}; padding-bottom: 1.2mm;
  }
  .sum-label {
    font-size: 6.6pt; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: ${T.forest};
  }
  .sum-value { font-size: 8.4pt; color: ${T.night}; font-variant-numeric: tabular-nums; text-align: right; }
  .count { font-size: 7.6pt; color: ${T.faint}; margin-top: 4mm; }
</style>
</head>
<body>
  <div class="spine"></div>
  <div class="page">
    <div class="topline">
      ${logo ? `<img class="logo" src="${logo}" alt="Global Health" />` : `<span class="logo-text">Global Health</span>`}
      <span class="caps">${esc(chrome.reportLabel)} — ${esc(fmtGeneratedAt(table.generatedAt, locale))}</span>
    </div>
    <div class="masthead">
      <div>
        <div class="mast-title">${esc(table.title)}</div>
        ${table.subtitle ? `<p class="subtitle">${esc(table.subtitle)}</p>` : ""}
      </div>
      <div class="meta">${esc(rowCountLabel)}</div>
    </div>
    ${summaryHtml}
    <div class="rule"></div>
    <table>
      <thead><tr>${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>
    <p class="count">${esc(generatedLabel)} · Global Health · myglobalhealth.online</p>
    ${truncatedNote}
  </div>
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

  const colCount = table.columns.length;
  const bodyRows = table.rows
    .map((row) => {
      if (row._section) {
        const merge = colCount > 1 ? ` ss:MergeAcross="${colCount - 1}"` : "";
        return `<Row><Cell ss:StyleID="section"${merge}><Data ss:Type="String">${xmlEsc(row._section)}</Data></Cell></Row>`;
      }
      if (row._sectionNote) {
        const merge = colCount > 1 ? ` ss:MergeAcross="${colCount - 1}"` : "";
        return `<Row><Cell ss:StyleID="sectionnote"${merge}><Data ss:Type="String">${xmlEsc(row._sectionNote)}</Data></Cell></Row>`;
      }
      const style = row._total ? "total" : undefined;
      const cells = table.columns.map((c) => excelCell(row[c.key], style)).join("");
      return `<Row>${cells}</Row>`;
    })
    .join("");

  const summaryRows = (table.summary ?? [])
    .map(
      (s) =>
        `<Row><Cell ss:StyleID="hdr"><Data ss:Type="String">${xmlEsc(s.label)}</Data></Cell><Cell><Data ss:Type="String">${xmlEsc(s.value)}</Data></Cell></Row>`,
    )
    .join("");
  const summaryBlock = summaryRows ? `${summaryRows}<Row></Row>` : "";

  const sheetName = table.title.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Report";

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="hdr"><Font ss:Bold="1"/><Interior ss:Color="#E5EAE7" ss:Pattern="Solid"/></Style>
    <Style ss:ID="total"><Font ss:Bold="1"/></Style>
    <Style ss:ID="section"><Font ss:Bold="1"/><Interior ss:Color="#EAF0EC" ss:Pattern="Solid"/></Style>
    <Style ss:ID="sectionnote"><Font ss:Italic="1" ss:Color="#4B5563"/></Style>
  </Styles>
  <Worksheet ss:Name="${xmlEsc(sheetName)}">
    <Table>
      ${summaryBlock}
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
  locale = "en-GB",
): string {
  if (cents === null || cents === undefined) return "";
  const code = currency && currency.trim() ? currency : "USD";
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: code }).format(
      cents / 100,
    );
  } catch {
    return `${(cents / 100).toFixed(2)} ${code}`;
  }
}

export function fmtDate(value: Date | null | undefined, locale = "en-GB"): string {
  if (!value) return "";
  return value.toLocaleDateString(locale, {
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
