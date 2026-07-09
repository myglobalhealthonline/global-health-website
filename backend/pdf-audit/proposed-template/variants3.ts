// Print-first invoice directions (H, I, J) — designed grayscale-first.
// Rules: ink (forest-night ≈ black in B/W) + paper + hairlines only.
// No mid-tone color, no lime, status = text/outline, never color-only.
// Mock data only.
import type { InvoicePdfData } from "../../src/modules/invoices/invoice-pdf.js";

const T = {
  night: "#0F2E25", // prints near-black
  forest: "#1D4B36",
  ink: "#26332D",
  muted: "#66716A",
  faint: "#9AA49D",
  hairline: "#E4E7E0",
  hairlineDark: "#C9CFC7",
  paper: "#FFFFFF",
  offwhite: "#FAFAF7",
};

const SANS = `"Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif`;
const SERIF = `Georgia, "Times New Roman", serif`;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function money(cents: number, cur: string): string {
  try {
    return new Intl.NumberFormat("en-IE", { style: "currency", currency: cur }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${cur}`;
  }
}
function date(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

const LEGAL =
  "Healthcare services exempt from VAT under the Value-Added Tax Consolidation Act 2010, Section 61 and Schedule 1, Paragraph 23. Global Health is a trading name registered under Global Guest. All transactions conducted under the Global Health brand are legally processed under the business registration and tax details of Global Guest.";
const VAT_NOTE = "VAT exempt — healthcare services, VATCA 2010 s.61, Sch.1 ¶23";

const TITLES: Record<InvoicePdfData["documentType"], string> = {
  INVOICE: "Invoice",
  RECEIPT: "Receipt",
  INVOICE_RECEIPT: "Invoice / Receipt",
  CREDIT_NOTE: "Credit Note",
};

function statusOf(data: InvoicePdfData) {
  const isCN = data.documentType === "CREDIT_NOTE";
  const isUnpaid = data.documentType === "INVOICE";
  return { isCN, isUnpaid, label: isCN ? "Refunded" : isUnpaid ? "Payment due" : "Paid" };
}

// ═════════════════════════════════════════════════════════════════════════════
// VARIANT H — Ink ledger. Heritage accounting document: serif caps masthead,
// double rules, overlined meta, classic double-underline total. Monochrome by
// design — B/W print is pixel-identical in feel.
// ═════════════════════════════════════════════════════════════════════════════
export function buildVariantH(data: InvoicePdfData, logoDataUrl: string): string {
  const { order } = data;
  const cur = order.currencyCode;
  const { isCN, isUnpaid, label } = statusOf(data);

  const rows = order.items
    .map(
      (i, idx) => `
      <tr>
        <td class="td idx">${String(idx + 1).padStart(2, "0")}</td>
        <td class="td desc">${esc(i.name)}</td>
        <td class="td num">${i.quantity}</td>
        <td class="td num">${money(i.unitPriceCents, cur)}</td>
        <td class="td num strong">${money(i.lineTotalCents, cur)}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>${TITLES[data.documentType]} ${esc(data.invoiceNumber)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: ${SANS}; font-size: 9.5pt; line-height: 1.5; color: ${T.ink};
    background: ${T.paper}; -webkit-print-color-adjust: exact; print-color-adjust: exact; width: 210mm; }
  .page { position: relative; min-height: 297mm; padding: 15mm 18mm 52mm; }
  .caps { font-size: 6.6pt; font-weight: 600; letter-spacing: 0.28em; text-transform: uppercase; color: ${T.faint}; }

  .mast { display: flex; justify-content: space-between; align-items: flex-end; }
  .mast-left .doc-title {
    font-family: ${SERIF}; font-size: 21pt; letter-spacing: 0.14em; text-transform: uppercase;
    color: ${T.night}; line-height: 1.1;
  }
  .mast-left .doc-no { margin-top: 2mm; font-size: 9pt; color: ${T.muted}; }
  .mast-left .doc-no b { color: ${T.night}; font-weight: 600; letter-spacing: 0.06em; }
  .logo { height: 15mm; width: auto; }

  .rule-heavy { margin-top: 5mm; border-top: 1.8pt solid ${T.night}; }
  .rule-thin { margin-top: 0.9mm; border-top: 0.4pt solid ${T.night}; }

  .meta { display: flex; margin-top: 7mm; gap: 8mm; }
  .meta-cell { flex: 1; border-top: 0.75pt solid ${T.night}; padding-top: 2.2mm; }
  .meta-cell .caps { display: block; color: ${T.muted}; }
  .meta-cell .v { font-size: 9.2pt; color: ${T.night}; margin-top: 1mm; font-weight: 600; }
  .meta-cell.status .v { letter-spacing: 0.18em; text-transform: uppercase; font-weight: 700; }

  .parties { display: flex; gap: 12mm; margin-top: 10mm; }
  .party { flex: 1; min-width: 0; }
  .party .caps { display: block; margin-bottom: 2mm; }
  .party .n { font-family: ${SERIF}; font-size: 12pt; color: ${T.night}; }
  .party .l { font-size: 8.6pt; color: ${T.muted}; margin-top: 1mm; }

  .doctor {
    margin-top: 9mm; border: 0.75pt solid ${T.night}; padding: 3.4mm 5mm;
    display: flex; justify-content: space-between; align-items: baseline; gap: 6mm;
  }
  .doctor .dn { font-family: ${SERIF}; font-size: 11pt; color: ${T.night}; }
  .doctor .dr { font-size: 8.4pt; color: ${T.muted}; text-align: right; }

  .items { width: 100%; border-collapse: collapse; margin-top: 10mm; }
  .items th { text-align: left; padding: 0 0 2.4mm;
    font-size: 6.6pt; font-weight: 700; letter-spacing: 0.28em; text-transform: uppercase; color: ${T.night}; }
  .items th.num { text-align: right; }
  .items thead tr { border-bottom: 1.4pt solid ${T.night}; }
  .td { padding: 4.4mm 0; border-bottom: 0.4pt solid ${T.hairlineDark}; }
  .td.idx { width: 10mm; font-size: 8pt; color: ${T.faint}; font-variant-numeric: tabular-nums; }
  .td.desc { font-family: ${SERIF}; font-size: 10.5pt; color: ${T.night}; padding-right: 8mm; }
  .td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; font-size: 9.5pt; color: ${T.ink}; }
  .td.strong { font-weight: 600; color: ${T.night}; }
  .items th:nth-child(3), .td:nth-child(3) { width: 14mm; }
  .items th:nth-child(4), .td:nth-child(4) { width: 30mm; }
  .items th:nth-child(5), .td:nth-child(5) { width: 30mm; }

  .totals-wrap { display: flex; justify-content: flex-end; }
  .totals { width: 82mm; margin-top: 6mm; }
  .trow { display: flex; justify-content: space-between; padding: 1.6mm 0; font-size: 9.2pt; color: ${T.muted}; }
  .trow .tv { font-variant-numeric: tabular-nums; color: ${T.ink}; }
  .tnote { font-size: 6.8pt; color: ${T.faint}; text-align: right; padding: 0.5mm 0 2.8mm; }
  .grand { border-top: 1.4pt solid ${T.night}; padding: 2.8mm 0 2mm;
    display: flex; justify-content: space-between; align-items: baseline; }
  .grand .gl { font-size: 7pt; font-weight: 700; letter-spacing: 0.28em; text-transform: uppercase; color: ${T.night}; }
  .grand .gv { font-family: ${SERIF}; font-size: 20pt; color: ${T.night}; font-variant-numeric: tabular-nums; }
  .grand-under { border-top: 0.4pt solid ${T.night}; margin-top: 0; }
  .grand-under2 { border-top: 0.4pt solid ${T.night}; margin-top: 0.8mm; }
  .settled { text-align: right; font-family: ${SERIF}; font-style: italic; font-size: 8.4pt; color: ${T.muted}; margin-top: 2.4mm; }

  .ref { font-size: 7.6pt; color: ${T.faint}; margin-top: 11mm; }
  .ref b { color: ${T.muted}; font-weight: 600; }

  .foot { position: absolute; left: 18mm; right: 18mm; bottom: 11mm; }
  .foot-rule { border-top: 0.75pt solid ${T.night}; margin-bottom: 3mm; }
  .legal { font-size: 6.6pt; color: ${T.muted}; line-height: 1.65; }
  .fb { display: flex; justify-content: space-between; margin-top: 3mm; font-size: 6.8pt; }
  .fb .b { font-weight: 700; letter-spacing: 0.3em; text-transform: uppercase; color: ${T.night}; }
  .fb .t { color: ${T.muted}; font-family: ${SERIF}; font-style: italic; font-size: 8pt; }
</style></head><body><div class="page">

  <div class="mast">
    <div class="mast-left">
      <div class="doc-title">${TITLES[data.documentType]}</div>
      <div class="doc-no">Nº <b>${esc(data.invoiceNumber)}</b></div>
    </div>
    <img class="logo" src="${logoDataUrl}" alt="Global Health" />
  </div>
  <div class="rule-heavy"></div>
  <div class="rule-thin"></div>

  <div class="meta">
    <div class="meta-cell"><span class="caps">Issued</span><div class="v">${date(data.invoiceDate)}</div></div>
    ${order.consultationDate ? `<div class="meta-cell"><span class="caps">Consultation</span><div class="v">${date(order.consultationDate)}</div></div>` : ""}
    ${!isUnpaid && order.paidAt ? `<div class="meta-cell"><span class="caps">${isCN ? "Refunded" : "Paid"}</span><div class="v">${date(order.paidAt)}</div></div>` : ""}
    <div class="meta-cell status"><span class="caps">Status</span><div class="v">${label}</div></div>
  </div>

  <div class="parties">
    <div class="party">
      <span class="caps">From</span>
      <div class="n">Global Health</div>
      <div class="l">Registered in Ireland · CRO No. 910267</div>
      <div class="l">6-9 Trinity Street, Dublin 2, D02 EY47</div>
      <div class="l">info@myglobalhealth.online</div>
    </div>
    <div class="party">
      <span class="caps">Billed to</span>
      <div class="n">${esc(order.fullName)}</div>
      <div class="l">${esc(order.email)}</div>
      ${order.phone ? `<div class="l">${esc(order.phone)}</div>` : ""}
      ${order.taxIdNumber ? `<div class="l">Tax ID — ${esc(order.taxIdNumber)}</div>` : ""}
    </div>
  </div>

  ${
    data.doctor
      ? `<div class="doctor">
          <div><span class="caps">Attending doctor</span> &nbsp; <span class="dn">${esc(data.doctor.fullName)}</span></div>
          <div class="dr">${data.doctor.chamberEntity ? `${esc(data.doctor.chamberEntity)} · ` : ""}Reg. ${esc(data.doctor.registrationNumber ?? "")}</div>
        </div>`
      : ""
  }

  <table class="items">
    <thead><tr><th>Nº</th><th>Description</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals-wrap"><div class="totals">
    <div class="trow"><span>Subtotal</span><span class="tv">${money(order.subtotalCents, cur)}</span></div>
    ${order.shippingCents > 0 ? `<div class="trow"><span>Shipping</span><span class="tv">${money(order.shippingCents, cur)}</span></div>` : ""}
    <div class="trow"><span>VAT (0%)</span><span class="tv">${money(0, cur)}</span></div>
    <div class="tnote">${VAT_NOTE}</div>
    <div class="grand"><span class="gl">${isCN ? "Total refunded" : "Total"}</span><span class="gv">${money(order.totalCents, cur)}</span></div>
    <div class="grand-under"></div>
    <div class="grand-under2"></div>
    ${!isUnpaid && order.paidAt ? `<div class="settled">${isCN ? "Refund issued" : "Settled in full"}, ${date(order.paidAt)}</div>` : ""}
  </div></div>

  <div class="ref">Please quote reference <b>${esc(data.invoiceNumber)}</b> in any correspondence.</div>

  <div class="foot">
    <div class="foot-rule"></div>
    <div class="legal">${esc(LEGAL)}</div>
    <div class="fb"><span class="b">Global Health</span><span class="t">Medicine Anytime Anywhere — myglobalhealth.online</span></div>
  </div>

</div></body></html>`;
}

// ═════════════════════════════════════════════════════════════════════════════
// VARIANT I — Rail ledger. 56mm left rail carrying identity + meta, separated
// by one strong vertical rule; content right. Structure-only design — survives
// B/W untouched.
// ═════════════════════════════════════════════════════════════════════════════
export function buildVariantI(data: InvoicePdfData, logoDataUrl: string): string {
  const { order } = data;
  const cur = order.currencyCode;
  const { isCN, isUnpaid, label } = statusOf(data);

  const rows = order.items
    .map(
      (i, idx) => `
      <tr>
        <td class="td idx">${String(idx + 1).padStart(2, "0")}</td>
        <td class="td desc">${esc(i.name)}</td>
        <td class="td num">${i.quantity}</td>
        <td class="td num">${money(i.unitPriceCents, cur)}</td>
        <td class="td num strong">${money(i.lineTotalCents, cur)}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>${TITLES[data.documentType]} ${esc(data.invoiceNumber)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: ${SANS}; font-size: 9.5pt; line-height: 1.5; color: ${T.ink};
    background: ${T.paper}; -webkit-print-color-adjust: exact; print-color-adjust: exact; width: 210mm; }
  .page { position: relative; min-height: 297mm; display: flex; }
  .caps { font-size: 6.6pt; font-weight: 600; letter-spacing: 0.28em; text-transform: uppercase; color: ${T.faint}; }

  .rail {
    width: 62mm; padding: 15mm 7mm 14mm 15mm;
    border-right: 1.2pt solid ${T.night};
    display: flex; flex-direction: column;
  }
  .logo { height: 14mm; width: auto; align-self: flex-start; }
  .rail-title { margin-top: 12mm; font-family: ${SERIF}; font-size: 17pt; line-height: 1.15; color: ${T.night}; }
  .rail-no { margin-top: 2mm; font-size: 8.6pt; color: ${T.muted}; letter-spacing: 0.04em; }
  .rail-status {
    margin-top: 5mm; align-self: flex-start;
    border: 1pt solid ${T.night}; padding: 1.8mm 4mm;
    font-size: 7pt; font-weight: 700; letter-spacing: 0.26em; text-transform: uppercase; color: ${T.night};
  }
  .rail-sec { margin-top: 9mm; border-top: 0.5pt solid ${T.hairlineDark}; padding-top: 3mm; }
  .rail-sec .caps { display: block; margin-bottom: 1.6mm; }
  .rail-sec .v { font-size: 8.6pt; color: ${T.ink}; }
  .rail-sec .v b { color: ${T.night}; font-weight: 600; }
  .rail-sec .l { font-size: 8.2pt; color: ${T.muted}; margin-top: 0.8mm; }
  .rail-fill { flex: 1; }
  .rail-brand { font-size: 6.6pt; font-weight: 700; letter-spacing: 0.3em; text-transform: uppercase; color: ${T.night}; }
  .rail-tag { font-family: ${SERIF}; font-style: italic; font-size: 7.8pt; color: ${T.faint}; margin-top: 1.2mm; }

  .main { flex: 1; padding: 15mm 15mm 14mm 9mm; display: flex; flex-direction: column; }

  .billto { }
  .billto .caps { display: block; margin-bottom: 2mm; }
  .billto .n { font-family: ${SERIF}; font-size: 13pt; color: ${T.night}; }
  .billto .l { font-size: 8.6pt; color: ${T.muted}; margin-top: 1mm; }

  .items { width: 100%; border-collapse: collapse; margin-top: 9mm; }
  .items th { text-align: left; padding: 0 0 2.4mm;
    font-size: 6.6pt; font-weight: 700; letter-spacing: 0.28em; text-transform: uppercase; color: ${T.night};
    border-bottom: 1.2pt solid ${T.night}; }
  .items th.num { text-align: right; }
  .td { padding: 4.2mm 0; border-bottom: 0.4pt solid ${T.hairlineDark}; }
  .td.idx { width: 9mm; font-size: 8pt; color: ${T.faint}; font-variant-numeric: tabular-nums; }
  .td.desc { font-family: ${SERIF}; font-size: 10.5pt; color: ${T.night}; padding-right: 6mm; }
  .td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; font-size: 9.2pt; color: ${T.ink}; }
  .td.strong { font-weight: 600; color: ${T.night}; }
  .items th:nth-child(3), .td:nth-child(3) { width: 12mm; }
  .items th:nth-child(4), .td:nth-child(4) { width: 26mm; }
  .items th:nth-child(5), .td:nth-child(5) { width: 26mm; }

  .totals { margin-top: 7mm; margin-left: auto; width: 74mm; }
  .trow { display: flex; justify-content: space-between; padding: 1.6mm 0; font-size: 9pt; color: ${T.muted}; }
  .trow .tv { font-variant-numeric: tabular-nums; color: ${T.ink}; }
  .tnote { font-size: 6.8pt; color: ${T.faint}; text-align: right; padding: 0.5mm 0 2.6mm; }
  .grand { border-top: 1.2pt solid ${T.night}; padding-top: 2.8mm;
    display: flex; justify-content: space-between; align-items: baseline; }
  .grand .gl { font-size: 7pt; font-weight: 700; letter-spacing: 0.28em; text-transform: uppercase; color: ${T.night}; }
  .grand .gv { font-family: ${SERIF}; font-size: 19pt; color: ${T.night}; font-variant-numeric: tabular-nums; }
  .settled { text-align: right; font-family: ${SERIF}; font-style: italic; font-size: 8.2pt; color: ${T.muted}; margin-top: 2.2mm; }

  .main-fill { flex: 1; }
  .legal { font-size: 6.6pt; color: ${T.muted}; line-height: 1.65; border-top: 0.5pt solid ${T.hairlineDark}; padding-top: 3mm; }
  .ref { font-size: 7.4pt; color: ${T.faint}; margin-top: 2.4mm; }
  .ref b { color: ${T.muted}; font-weight: 600; }
</style></head><body><div class="page">

  <div class="rail">
    <img class="logo" src="${logoDataUrl}" alt="Global Health" />
    <div class="rail-title">${TITLES[data.documentType]}</div>
    <div class="rail-no">Nº ${esc(data.invoiceNumber)}</div>
    <div class="rail-status">${label}</div>

    <div class="rail-sec">
      <span class="caps">Dates</span>
      <div class="v"><b>Issued</b> ${date(data.invoiceDate)}</div>
      ${order.consultationDate ? `<div class="v"><b>Consultation</b> ${date(order.consultationDate)}</div>` : ""}
      ${!isUnpaid && order.paidAt ? `<div class="v"><b>${isCN ? "Refunded" : "Paid"}</b> ${date(order.paidAt)}</div>` : ""}
    </div>

    <div class="rail-sec">
      <span class="caps">From</span>
      <div class="v"><b>Global Health</b></div>
      <div class="l">Registered in Ireland</div>
      <div class="l">CRO No. 910267</div>
      <div class="l">6-9 Trinity Street, Dublin 2</div>
      <div class="l">D02 EY47, Ireland</div>
      <div class="l">info@myglobalhealth.online</div>
    </div>

    ${
      data.doctor
        ? `<div class="rail-sec">
            <span class="caps">Attending doctor</span>
            <div class="v"><b>${esc(data.doctor.fullName)}</b></div>
            ${data.doctor.chamberEntity ? `<div class="l">${esc(data.doctor.chamberEntity)}</div>` : ""}
            ${data.doctor.registrationNumber ? `<div class="l">Reg. ${esc(data.doctor.registrationNumber)}</div>` : ""}
          </div>`
        : ""
    }

    <div class="rail-fill"></div>
    <div class="rail-brand">Global Health</div>
    <div class="rail-tag">Medicine Anytime Anywhere</div>
  </div>

  <div class="main">
    <div class="billto">
      <span class="caps">Billed to</span>
      <div class="n">${esc(order.fullName)}</div>
      <div class="l">${esc(order.email)}</div>
      ${order.phone ? `<div class="l">${esc(order.phone)}</div>` : ""}
      ${order.taxIdNumber ? `<div class="l">Tax ID — ${esc(order.taxIdNumber)}</div>` : ""}
    </div>

    <table class="items">
      <thead><tr><th>Nº</th><th>Description</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals">
      <div class="trow"><span>Subtotal</span><span class="tv">${money(order.subtotalCents, cur)}</span></div>
      ${order.shippingCents > 0 ? `<div class="trow"><span>Shipping</span><span class="tv">${money(order.shippingCents, cur)}</span></div>` : ""}
      <div class="trow"><span>VAT (0%)</span><span class="tv">${money(0, cur)}</span></div>
      <div class="tnote">${VAT_NOTE}</div>
      <div class="grand"><span class="gl">${isCN ? "Total refunded" : "Total"}</span><span class="gv">${money(order.totalCents, cur)}</span></div>
      ${!isUnpaid && order.paidAt ? `<div class="settled">${isCN ? "Refund issued" : "Settled in full"}, ${date(order.paidAt)}</div>` : ""}
    </div>

    <div class="main-fill"></div>
    <div class="legal">${esc(LEGAL)}</div>
    <div class="ref">Please quote reference <b>${esc(data.invoiceNumber)}</b> in any correspondence.</div>
  </div>

</div></body></html>`;
}

// ═════════════════════════════════════════════════════════════════════════════
// VARIANT J — Mono poster. Statement typography with solid near-black blocks
// (solid dark prints crisply in B/W — only mid-tones fail). Giant title,
// black total bar, zero color dependence.
// ═════════════════════════════════════════════════════════════════════════════
export function buildVariantJ(data: InvoicePdfData, logoDataUrl: string): string {
  const { order } = data;
  const cur = order.currencyCode;
  const { isCN, isUnpaid, label } = statusOf(data);

  const rows = order.items
    .map(
      (i, idx) => `
      <tr>
        <td class="td idx">${String(idx + 1).padStart(2, "0")}</td>
        <td class="td desc">${esc(i.name)}</td>
        <td class="td num">${i.quantity}</td>
        <td class="td num">${money(i.unitPriceCents, cur)}</td>
        <td class="td num strong">${money(i.lineTotalCents, cur)}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>${TITLES[data.documentType]} ${esc(data.invoiceNumber)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: ${SANS}; font-size: 9.5pt; line-height: 1.5; color: ${T.ink};
    background: ${T.paper}; -webkit-print-color-adjust: exact; print-color-adjust: exact; width: 210mm; }
  .page { position: relative; min-height: 297mm; padding: 14mm 17mm 50mm; }
  .caps { font-size: 6.6pt; font-weight: 600; letter-spacing: 0.28em; text-transform: uppercase; color: ${T.faint}; }

  .top { display: flex; justify-content: space-between; align-items: center; }
  .logo { height: 12mm; width: auto; }
  .top-right { font-size: 7.5pt; color: ${T.muted}; text-align: right; line-height: 1.6; }

  .mast { margin-top: 10mm; }
  .mast h1 {
    font-family: ${SERIF}; font-size: 40pt; line-height: 1.0; color: ${T.night};
    letter-spacing: -0.01em;
  }
  .mast-row { display: flex; justify-content: space-between; align-items: baseline; margin-top: 4mm; }
  .mast-no { font-size: 10pt; font-weight: 700; color: ${T.night}; letter-spacing: 0.08em; }
  .mast-dates { font-size: 8.4pt; color: ${T.muted}; }
  .status-flag {
    display: inline-block; background: ${T.night}; color: ${T.paper};
    font-size: 7.5pt; font-weight: 700; letter-spacing: 0.28em; text-transform: uppercase;
    padding: 1.8mm 5mm;
  }

  .rule { margin-top: 5mm; border-top: 2.4pt solid ${T.night}; }

  .parties { display: flex; gap: 12mm; margin-top: 8mm; }
  .party { flex: 1; min-width: 0; }
  .party .caps { display: block; margin-bottom: 2mm; }
  .party .n { font-size: 11pt; font-weight: 700; color: ${T.night}; }
  .party .l { font-size: 8.6pt; color: ${T.muted}; margin-top: 0.9mm; }

  .items { width: 100%; border-collapse: collapse; margin-top: 9mm; }
  .items th { text-align: left; padding: 0 0 2.4mm;
    font-size: 6.6pt; font-weight: 700; letter-spacing: 0.28em; text-transform: uppercase; color: ${T.night};
    border-bottom: 1.6pt solid ${T.night}; }
  .items th.num { text-align: right; }
  .td { padding: 4.2mm 0; border-bottom: 0.4pt solid ${T.hairlineDark}; font-size: 9.8pt; }
  .td.idx { width: 10mm; font-size: 8pt; color: ${T.faint}; font-variant-numeric: tabular-nums; }
  .td.desc { font-weight: 600; color: ${T.night}; padding-right: 8mm; }
  .td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; color: ${T.ink}; }
  .td.strong { font-weight: 700; color: ${T.night}; }
  .items th:nth-child(3), .td:nth-child(3) { width: 14mm; }
  .items th:nth-child(4), .td:nth-child(4) { width: 30mm; }
  .items th:nth-child(5), .td:nth-child(5) { width: 30mm; }

  .settle { display: flex; justify-content: flex-end; margin-top: 7mm; }
  .totals { width: 90mm; }
  .trow { display: flex; justify-content: space-between; padding: 1.6mm 0; font-size: 9.2pt; color: ${T.muted}; }
  .trow .tv { font-variant-numeric: tabular-nums; color: ${T.ink}; }
  .tnote { font-size: 6.8pt; color: ${T.faint}; text-align: right; padding: 0.5mm 0 3mm; }
  .grand {
    background: ${T.night}; color: ${T.paper};
    display: flex; justify-content: space-between; align-items: center;
    padding: 4mm 5mm;
  }
  .grand .gl { font-size: 7.5pt; font-weight: 700; letter-spacing: 0.3em; text-transform: uppercase; }
  .grand .gv { font-family: ${SERIF}; font-size: 20pt; font-variant-numeric: tabular-nums; }
  .settled { text-align: right; font-size: 8.2pt; color: ${T.muted}; margin-top: 2.4mm; }

  .ref { font-size: 7.6pt; color: ${T.faint}; margin-top: 10mm; }
  .ref b { color: ${T.muted}; font-weight: 600; }

  .foot { position: absolute; left: 17mm; right: 17mm; bottom: 11mm; }
  .foot-rule { border-top: 0.4pt solid ${T.hairlineDark}; margin-bottom: 3mm; }
  .legal { font-size: 6.6pt; color: ${T.muted}; line-height: 1.65; }
  .fb { display: flex; justify-content: space-between; margin-top: 3mm; font-size: 6.8pt; }
  .fb .b { font-weight: 700; letter-spacing: 0.3em; text-transform: uppercase; color: ${T.night}; }
  .fb .t { color: ${T.muted}; }
</style></head><body><div class="page">

  <div class="top">
    <img class="logo" src="${logoDataUrl}" alt="Global Health" />
    <div class="top-right">
      Registered in Ireland · CRO No. 910267<br>
      6-9 Trinity Street, Dublin 2, D02 EY47 · info@myglobalhealth.online
    </div>
  </div>

  <div class="mast">
    <h1>${TITLES[data.documentType]}</h1>
    <div class="mast-row">
      <span class="mast-no">Nº ${esc(data.invoiceNumber)} &nbsp;&nbsp; <span class="status-flag">${label}</span></span>
      <span class="mast-dates">Issued ${date(data.invoiceDate)}${!isUnpaid && order.paidAt ? ` · ${isCN ? "Refunded" : "Paid"} ${date(order.paidAt)}` : ""}</span>
    </div>
  </div>
  <div class="rule"></div>

  <div class="parties">
    <div class="party">
      <span class="caps">Billed to</span>
      <div class="n">${esc(order.fullName)}</div>
      <div class="l">${esc(order.email)}</div>
      ${order.phone ? `<div class="l">${esc(order.phone)}</div>` : ""}
      ${order.taxIdNumber ? `<div class="l">Tax ID ${esc(order.taxIdNumber)}</div>` : ""}
    </div>
    ${
      data.doctor
        ? `<div class="party">
            <span class="caps">Attending doctor</span>
            <div class="n">${esc(data.doctor.fullName)}</div>
            ${data.doctor.chamberEntity ? `<div class="l">${esc(data.doctor.chamberEntity)}</div>` : ""}
            ${data.doctor.registrationNumber ? `<div class="l">Reg. ${esc(data.doctor.registrationNumber)}</div>` : ""}
          </div>`
        : ""
    }
    <div class="party">
      <span class="caps">Consultation</span>
      ${order.consultationDate ? `<div class="l" style="margin-top:0"><b style="color:${T.night};font-weight:700;font-size:11pt">${date(order.consultationDate)}</b></div>` : ""}
      <div class="l">Currency ${esc(cur)}</div>
    </div>
  </div>

  <table class="items">
    <thead><tr><th>Nº</th><th>Description</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="settle"><div class="totals">
    <div class="trow"><span>Subtotal</span><span class="tv">${money(order.subtotalCents, cur)}</span></div>
    ${order.shippingCents > 0 ? `<div class="trow"><span>Shipping</span><span class="tv">${money(order.shippingCents, cur)}</span></div>` : ""}
    <div class="trow"><span>VAT (0%)</span><span class="tv">${money(0, cur)}</span></div>
    <div class="tnote">${VAT_NOTE}</div>
    <div class="grand"><span class="gl">${isCN ? "Total refunded" : "Total"}</span><span class="gv">${money(order.totalCents, cur)}</span></div>
    ${!isUnpaid && order.paidAt ? `<div class="settled">${isCN ? "Refund issued" : "Settled in full"} · ${date(order.paidAt)}</div>` : ""}
  </div></div>

  <div class="ref">Please quote reference <b>${esc(data.invoiceNumber)}</b> in any correspondence.</div>

  <div class="foot">
    <div class="foot-rule"></div>
    <div class="legal">${esc(LEGAL)}</div>
    <div class="fb"><span class="b">Global Health</span><span class="t">Medicine Anytime Anywhere · myglobalhealth.online</span></div>
  </div>

</div></body></html>`;
}
