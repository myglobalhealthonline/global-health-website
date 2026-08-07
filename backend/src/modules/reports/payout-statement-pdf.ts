import { PDF_TOKENS as T, PDF_SANS, PDF_SERIF, pdfLogoDataUrl, pdfEcgRule } from "../../lib/pdf/brand.js";
import { htmlToPdfBuffer } from "../generated-documents/html-document-renderer.js";
import type { ReportTable } from "./report-formatters.js";
import type { PayoutStatementLabels } from "./payout-statement-content.js";

/**
 * Invoice-styled PDF for the doctor payout statement — same Variant K visual
 * system as the patient invoice (`invoice-pdf.ts`: masthead, parties block,
 * items table, settle/totals), so a doctor filing both documents recognises
 * them as the same family. NOT a fiscal/VAT document — see `footerNote`.
 *
 * Reads the `ReportTable` built by `doctorPayoutStatementReport` rather than
 * a separate data shape: `summary` items are looked up by label against the
 * SAME `labels` object the table was built with, so the match is exact.
 */

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function findSummary(table: ReportTable, label: string): string | undefined {
  return table.summary?.find((s) => s.label === label)?.value;
}

export function buildPayoutStatementInvoiceHtml(
  table: ReportTable,
  t: PayoutStatementLabels,
): string {
  const loc = t.htmlLang ?? "en-GB";
  const logo = pdfLogoDataUrl();

  const period = findSummary(table, t.period) ?? "—";
  const accountHolder = findSummary(table, t.accountHolder) ?? "—";
  const iban = findSummary(table, t.iban) ?? t.ibanNotOnFile;
  const bic = findSummary(table, t.bic);
  const totalToPay = findSummary(table, t.totalToPay) ?? "—";

  const issuedDate = new Date(table.generatedAt).toLocaleDateString(loc, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  let idx = 0;
  const itemRows = table.rows
    .map((row) => {
      if (row._section) {
        return `<tr><td colspan="${table.columns.length + 1}" class="section">${esc(String(row._section))}</td></tr>`;
      }
      if (row._total) {
        return `<tr class="totalrow">
          <td class="td idx"></td>
          ${table.columns
            .map(
              (c) =>
                `<td class="td strong ${c.align === "right" ? "num" : "desc"}">${esc(String(row[c.key] ?? ""))}</td>`,
            )
            .join("")}
        </tr>`;
      }
      idx += 1;
      return `<tr>
        <td class="td idx">${String(idx).padStart(2, "0")}</td>
        ${table.columns
          .map(
            (c) =>
              `<td class="td ${c.align === "right" ? "num" : "desc"}">${esc(String(row[c.key] ?? "—"))}</td>`,
          )
          .join("")}
      </tr>`;
    })
    .join("");

  const colHead = table.columns
    .map((c) => `<th class="${c.align === "right" ? "num" : ""}">${esc(c.label)}</th>`)
    .join("");

  const footerHtml = t.footerNote
    .split("\n\n")
    .map((para) => `<p style="margin:0 0 1.4mm;">${esc(para).replace(/\n/g, "<br>")}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="${loc.split("-")[0]}">
<head>
<meta charset="UTF-8">
<title>${esc(t.title)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: ${PDF_SANS}; font-size: 9.5pt; line-height: 1.5; color: ${T.ink};
    background: ${T.paper}; -webkit-print-color-adjust: exact; print-color-adjust: exact; width: 210mm; }
  .spine { position: fixed; left: 0; top: 0; bottom: 0; width: 7mm; background: ${T.night}; }
  .spine-caption { position: fixed; left: 0; top: 0; width: 7mm; height: 297mm;
    display: flex; align-items: flex-end; justify-content: center; padding-bottom: 12mm; }
  .spine-caption span { writing-mode: vertical-rl; transform: rotate(180deg);
    font-size: 6pt; font-weight: 600; letter-spacing: 0.42em; text-transform: uppercase;
    color: rgba(242, 245, 236, 0.75); }
  .page { position: relative; min-height: 297mm; padding: 13mm 16mm 50mm 24mm; }
  .caps { font-size: 6.6pt; font-weight: 600; letter-spacing: 0.28em; text-transform: uppercase; color: ${T.faint}; }

  .topline { display: flex; justify-content: space-between; align-items: center;
    border-bottom: 0.5pt solid ${T.hairlineDark}; padding-bottom: 3.6mm; }
  .topline .caps { color: ${T.forest}; }
  .logo { height: 17mm; width: auto; }
  .logo-text { font-size: 13pt; font-weight: 700; color: ${T.forest}; letter-spacing: 0.04em; }

  .masthead { margin-top: 10mm; }
  .mast-title { font-family: ${PDF_SERIF}; font-style: italic; font-size: 40pt; line-height: 1.02;
    color: ${T.night}; letter-spacing: -0.015em; }
  .mast-sub { margin-top: 4mm; display: flex; align-items: baseline; gap: 6mm; flex-wrap: wrap; }
  .mast-no { font-size: 9pt; font-weight: 700; letter-spacing: 0.1em; color: ${T.forest}; }
  .mast-issued { font-size: 8.6pt; color: ${T.muted}; }
  .mast-status { font-size: 7pt; font-weight: 700; letter-spacing: 0.26em; text-transform: uppercase;
    color: ${T.night}; border-bottom: 1.6pt solid ${T.lime}; padding-bottom: 0.8mm; }
  .ecg { margin-top: 7mm; }

  .parties { display: flex; gap: 11mm; margin-top: 9mm; }
  .party { flex: 1; min-width: 0; }
  .party .caps { display: block; margin-bottom: 2mm; }
  .party .n { font-family: ${PDF_SERIF}; font-size: 12pt; color: ${T.night}; }
  .party .l { font-size: 8.6pt; color: ${T.muted}; margin-top: 0.9mm; }

  .items { width: 100%; border-collapse: collapse; margin-top: 10mm; }
  .items th { text-align: left; padding: 0 0 2.4mm;
    font-size: 6.6pt; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: ${T.forest};
    border-bottom: 1pt solid ${T.night}; }
  .items th.num { text-align: right; }
  .td { padding: 3.4mm 4mm 3.4mm 0; border-bottom: 0.4pt solid ${T.hairline}; }
  .td.idx { width: 9mm; font-size: 8pt; color: ${T.faint}; font-variant-numeric: tabular-nums; }
  .td.desc { font-size: 9pt; color: ${T.night}; }
  .td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; font-size: 9pt; color: ${T.muted}; }
  .td.strong { color: ${T.night}; font-weight: 700; }
  tr.totalrow .td { border-top: 1pt solid ${T.night}; border-bottom: none; }
  .section { font-size: 7pt; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase;
    color: ${T.forest}; padding: 4mm 0 1.6mm; border-bottom: 0.6pt solid ${T.night}; }

  .settle { display: flex; justify-content: flex-end; margin-top: 8mm; }
  .totals { width: 84mm; }
  .grand { border-top: 1pt solid ${T.night}; padding-top: 2.6mm;
    display: flex; justify-content: space-between; align-items: baseline; }
  .grand .gl { font-size: 6.8pt; font-weight: 600; letter-spacing: 0.28em; text-transform: uppercase; color: ${T.forest}; }
  .grand .gv { font-family: ${PDF_SERIF}; font-style: italic; font-size: 24pt; color: ${T.night}; letter-spacing: -0.01em; }

  .foot { position: absolute; left: 24mm; right: 16mm; bottom: 11mm; }
  .foot-rule { border-top: 0.4pt solid ${T.hairline}; margin-bottom: 3mm; }
  .legal { font-size: 6.6pt; color: ${T.faint}; line-height: 1.65; }
  .fb { display: flex; justify-content: space-between; margin-top: 3mm; font-size: 6.8pt; }
  .fb .b { font-weight: 700; letter-spacing: 0.28em; text-transform: uppercase; color: ${T.forest}; }
  .fb .t { color: ${T.faint}; font-family: ${PDF_SERIF}; font-style: italic; font-size: 8pt; }
</style>
</head>
<body>
<div class="spine"></div>
<div class="spine-caption"><span>Global Health</span></div>
<div class="page">

  <div class="topline">
    ${logo ? `<img class="logo" src="${logo}" alt="Global Health" />` : `<span class="logo-text">Global Health</span>`}
    <span class="caps">${esc(t.statementNo)} — ${esc(period)}</span>
  </div>

  <div class="masthead">
    <div class="mast-title">${esc(t.title)}</div>
    <div class="mast-sub">
      <span class="mast-no">${esc(t.statementNo)} · ${esc(period)}</span>
      <span class="mast-issued">${esc(t.issued)} ${esc(issuedDate)}</span>
    </div>
    <div class="ecg">${pdfEcgRule()}</div>
  </div>

  <div class="parties">
    <div class="party">
      <span class="caps">${esc(t.from)}</span>
      <div class="n">Global Health</div>
      <div class="l">globalhealth@myglobalhealth.online</div>
    </div>
    <div class="party">
      <span class="caps">${esc(t.payTo)}</span>
      <div class="n">${esc(accountHolder)}</div>
      <div class="l">${esc(t.iban)}: ${esc(iban)}</div>
      ${bic ? `<div class="l">${esc(t.bic)}: ${esc(bic)}</div>` : ""}
    </div>
  </div>

  <table class="items">
    <thead><tr><th class="idx-h">${esc(t.colIdx)}</th>${colHead}</tr></thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="settle">
    <div class="totals">
      <div class="grand"><span class="gl">${esc(t.totalToPayCaps)}</span><span class="gv">${esc(totalToPay)}</span></div>
    </div>
  </div>

  <div class="foot">
    <div class="foot-rule"></div>
    <div class="legal">${footerHtml}</div>
    <div class="fb"><span class="b">Global Health</span><span class="t">${esc(t.tagline)} — myglobalhealth.online</span></div>
  </div>

</div>
</body>
</html>`;
}

export async function renderPayoutStatementPdfBuffer(
  table: ReportTable,
  t: PayoutStatementLabels,
): Promise<Buffer> {
  return htmlToPdfBuffer(buildPayoutStatementInvoiceHtml(table, t));
}
