// Alternative premium invoice directions for review (B, C, D).
// Option A = invoice-template.ts (private-clinic stationery).
// All mock-data-only, production untouched.
import type { InvoicePdfData } from "../../src/modules/invoices/invoice-pdf.js";

const T = {
  forest: "#1D4B36",
  night: "#0F2E25",
  ink: "#26332D",
  muted: "#66716A",
  faint: "#9AA49D",
  hairline: "#E4E7E0",
  hairlineDark: "#C9CFC7",
  paper: "#FFFFFF",
  ivory: "#F6F8F1",
  panel: "#EDF2E2",
  lime: "#B0F122",
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

// ═════════════════════════════════════════════════════════════════════════════
// VARIANT B — Swiss minimal. Pure sans, strict grid, oversized light title,
// maximal whitespace, forest used only as ink accent.
// ═════════════════════════════════════════════════════════════════════════════
export function buildVariantB(data: InvoicePdfData, logoDataUrl: string): string {
  const { order } = data;
  const cur = order.currencyCode;
  const isCN = data.documentType === "CREDIT_NOTE";
  const isUnpaid = data.documentType === "INVOICE";
  const statusLabel = isCN ? "Refunded" : isUnpaid ? "Payment due" : "Paid";

  const rows = order.items
    .map(
      (i) => `
      <tr>
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
  body {
    font-family: ${SANS}; font-size: 9.5pt; line-height: 1.5; color: ${T.ink};
    background: ${T.paper}; -webkit-print-color-adjust: exact; print-color-adjust: exact;
    width: 210mm;
  }
  .page { position: relative; min-height: 297mm; padding: 20mm 20mm 52mm; }
  .caps { font-size: 6.5pt; font-weight: 600; letter-spacing: 0.26em; text-transform: uppercase; color: ${T.faint}; }

  .top { display: flex; justify-content: space-between; align-items: flex-start; }
  .logo { height: 13mm; width: auto; }
  .status {
    border: 0.75pt solid ${T.forest}; color: ${T.forest};
    font-size: 7pt; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase;
    padding: 1.6mm 4mm; margin-top: 2mm;
  }

  .title {
    margin-top: 16mm;
    font-size: 30pt; font-weight: 250; letter-spacing: -0.015em;
    color: ${T.night}; line-height: 1.05;
  }
  .title-no { color: ${T.faint}; font-weight: 250; }

  .meta { display: flex; gap: 14mm; margin-top: 10mm; border-top: 0.75pt solid ${T.night}; padding-top: 4mm; }
  .meta-cell .caps { display: block; margin-bottom: 1.4mm; }
  .meta-cell .v { font-size: 9pt; color: ${T.ink}; }

  .parties { display: flex; gap: 14mm; margin-top: 12mm; }
  .party { flex: 1; }
  .party .caps { display: block; margin-bottom: 2mm; }
  .party .n { font-size: 10.5pt; font-weight: 700; color: ${T.night}; }
  .party .l { font-size: 8.8pt; color: ${T.muted}; margin-top: 0.9mm; }

  .items { width: 100%; border-collapse: collapse; margin-top: 14mm; }
  .items th {
    text-align: left; padding: 0 0 2.4mm;
    font-size: 6.5pt; font-weight: 600; letter-spacing: 0.26em; text-transform: uppercase; color: ${T.faint};
    border-bottom: 0.75pt solid ${T.night};
  }
  .items th.num { text-align: right; }
  .td { padding: 4.2mm 0; border-bottom: 0.4pt solid ${T.hairline}; font-size: 9.5pt; }
  .td.desc { font-weight: 600; color: ${T.night}; padding-right: 8mm; }
  .td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; color: ${T.muted}; }
  .td.strong { color: ${T.night}; font-weight: 600; }
  .items th:nth-child(2), .td:nth-child(2) { width: 16mm; }
  .items th:nth-child(3), .td:nth-child(3) { width: 32mm; }
  .items th:nth-child(4), .td:nth-child(4) { width: 32mm; }

  .totals-wrap { display: flex; justify-content: flex-end; }
  .totals { width: 84mm; margin-top: 6mm; }
  .trow { display: flex; justify-content: space-between; padding: 1.6mm 0; font-size: 9pt; color: ${T.muted}; }
  .trow .tv { font-variant-numeric: tabular-nums; color: ${T.ink}; }
  .tnote { font-size: 6.8pt; color: ${T.faint}; text-align: right; padding: 0.6mm 0 3mm; }
  .grand {
    border-top: 0.75pt solid ${T.night}; padding-top: 3.4mm; margin-top: 1mm;
    display: flex; justify-content: space-between; align-items: baseline;
  }
  .grand .gl { font-size: 6.5pt; font-weight: 600; letter-spacing: 0.26em; text-transform: uppercase; color: ${T.forest}; }
  .grand .gv { font-size: 22pt; font-weight: 300; letter-spacing: -0.01em; color: ${T.forest}; font-variant-numeric: tabular-nums; }
  .settled { text-align: right; font-size: 8.2pt; color: ${T.muted}; margin-top: 2mm; }

  .foot { position: absolute; left: 20mm; right: 20mm; bottom: 13mm; }
  .foot-rule { border-top: 0.4pt solid ${T.hairline}; margin-bottom: 3mm; }
  .legal { font-size: 6.6pt; color: ${T.faint}; line-height: 1.65; }
  .fb { display: flex; justify-content: space-between; margin-top: 3.4mm; font-size: 6.8pt; }
  .fb .b { font-weight: 700; letter-spacing: 0.28em; text-transform: uppercase; color: ${T.forest}; }
  .fb .t { color: ${T.faint}; }
</style></head><body><div class="page">

  <div class="top">
    <img class="logo" src="${logoDataUrl}" alt="Global Health" />
    <div class="status">${statusLabel}</div>
  </div>

  <div class="title">${TITLES[data.documentType]}<br><span class="title-no">${esc(data.invoiceNumber)}</span></div>

  <div class="meta">
    <div class="meta-cell"><span class="caps">Issued</span><span class="v">${date(data.invoiceDate)}</span></div>
    ${order.consultationDate ? `<div class="meta-cell"><span class="caps">Consultation</span><span class="v">${date(order.consultationDate)}</span></div>` : ""}
    ${!isUnpaid && order.paidAt ? `<div class="meta-cell"><span class="caps">${isCN ? "Refunded" : "Paid"}</span><span class="v">${date(order.paidAt)}</span></div>` : ""}
    ${data.doctor ? `<div class="meta-cell"><span class="caps">Attending doctor</span><span class="v">${esc(data.doctor.fullName)}${data.doctor.registrationNumber ? ` · ${esc(data.doctor.registrationNumber)}` : ""}</span></div>` : ""}
  </div>

  <div class="parties">
    <div class="party">
      <span class="caps">From</span>
      <div class="n">Global Health</div>
      <div class="l">Registered in Ireland · CRO No. 910267</div>
      <div class="l">6-9 Trinity Street, Dublin 2, D02 EY47, Ireland</div>
      <div class="l">info@myglobalhealth.online</div>
    </div>
    <div class="party">
      <span class="caps">Billed to</span>
      <div class="n">${esc(order.fullName)}</div>
      <div class="l">${esc(order.email)}</div>
      ${order.phone ? `<div class="l">${esc(order.phone)}</div>` : ""}
      ${order.taxIdNumber ? `<div class="l">Tax ID ${esc(order.taxIdNumber)}</div>` : ""}
    </div>
  </div>

  <table class="items">
    <thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals-wrap"><div class="totals">
    <div class="trow"><span>Subtotal</span><span class="tv">${money(order.subtotalCents, cur)}</span></div>
    ${order.shippingCents > 0 ? `<div class="trow"><span>Shipping</span><span class="tv">${money(order.shippingCents, cur)}</span></div>` : ""}
    <div class="trow"><span>VAT (0%)</span><span class="tv">${money(0, cur)}</span></div>
    <div class="tnote">${VAT_NOTE}</div>
    <div class="grand"><span class="gl">${isCN ? "Total refunded" : "Total"}</span><span class="gv">${money(order.totalCents, cur)}</span></div>
    ${!isUnpaid && order.paidAt ? `<div class="settled">${isCN ? "Refund issued" : "Settled in full"} · ${date(order.paidAt)}</div>` : ""}
  </div></div>

  <div class="foot">
    <div class="foot-rule"></div>
    <div class="legal">${esc(LEGAL)}</div>
    <div class="fb"><span class="b">Global Health</span><span class="t">Medicine Anytime Anywhere · myglobalhealth.online · Ref ${esc(data.invoiceNumber)}</span></div>
  </div>

</div></body></html>`;
}

// ═════════════════════════════════════════════════════════════════════════════
// VARIANT C — Framed folio. Double border frame, centered masthead, symmetric,
// serif-led. Hotel-folio / certificate feel.
// ═════════════════════════════════════════════════════════════════════════════
export function buildVariantC(data: InvoicePdfData, logoDataUrl: string): string {
  const { order } = data;
  const cur = order.currencyCode;
  const isCN = data.documentType === "CREDIT_NOTE";
  const isUnpaid = data.documentType === "INVOICE";
  const statusLabel = isCN ? "Refunded" : isUnpaid ? "Payment due" : "Paid";

  const rows = order.items
    .map(
      (i) => `
      <tr>
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
  body {
    font-family: ${SANS}; font-size: 9.5pt; line-height: 1.5; color: ${T.ink};
    background: ${T.ivory}; -webkit-print-color-adjust: exact; print-color-adjust: exact;
    width: 210mm;
  }
  .sheet {
    position: relative; min-height: 297mm; padding: 9mm;
  }
  .frame {
    position: relative; min-height: 279mm;
    border: 0.75pt solid ${T.forest};
    outline: 0.25pt solid ${T.hairlineDark}; outline-offset: 1.6mm;
    background: #FDFDFB;
    padding: 12mm 14mm 46mm;
  }
  .caps { font-size: 6.6pt; font-weight: 600; letter-spacing: 0.3em; text-transform: uppercase; color: ${T.faint}; }
  .serif { font-family: ${SERIF}; }

  .mast { text-align: center; }
  .logo { height: 16mm; width: auto; margin: 0 auto; display: block; }
  .mast-title {
    margin-top: 5mm; font-family: ${SERIF}; font-size: 17pt; color: ${T.night}; letter-spacing: 0.02em;
  }
  .mast-orn { display: flex; align-items: center; gap: 4mm; margin-top: 4mm; }
  .mast-orn::before, .mast-orn::after { content: ""; flex: 1; border-top: 0.5pt solid ${T.hairlineDark}; }
  .mast-no { font-family: ${SERIF}; font-style: italic; font-size: 9.5pt; color: ${T.forest}; white-space: nowrap; }
  .mast-sub { text-align: center; font-size: 8pt; color: ${T.muted}; margin-top: 2.4mm; }
  .mast-sub .st { color: ${T.forest}; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; font-size: 7pt; }

  .parties { display: flex; margin-top: 10mm; }
  .party { flex: 1; min-width: 0; padding-right: 8mm; }
  .party + .party { border-left: 0.5pt solid ${T.hairline}; padding-left: 8mm; padding-right: 0; }
  .party .caps { display: block; margin-bottom: 2.2mm; }
  .party .n { font-family: ${SERIF}; font-size: 11.5pt; color: ${T.night}; }
  .party .l { font-size: 8.6pt; color: ${T.muted}; margin-top: 1mm; }

  .doctor {
    margin-top: 9mm; padding: 3.2mm 0; text-align: center;
    border-top: 0.5pt solid ${T.hairline}; border-bottom: 0.5pt solid ${T.hairline};
    font-size: 8.8pt; color: ${T.muted};
  }
  .doctor .dn { font-family: ${SERIF}; font-size: 10.5pt; color: ${T.night}; }

  .items { width: 100%; border-collapse: collapse; margin-top: 10mm; }
  .items th {
    text-align: left; padding: 0 0 2.6mm;
    font-size: 6.6pt; font-weight: 600; letter-spacing: 0.3em; text-transform: uppercase; color: ${T.forest};
    border-bottom: 0.75pt solid ${T.forest};
  }
  .items th.num { text-align: right; }
  .td { padding: 4.4mm 0; border-bottom: 0.4pt solid ${T.hairline}; }
  .td.desc { font-family: ${SERIF}; font-size: 10.5pt; color: ${T.night}; padding-right: 8mm; }
  .td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; font-size: 9.5pt; color: ${T.muted}; }
  .td.strong { color: ${T.night}; }
  .items th:nth-child(2), .td:nth-child(2) { width: 15mm; }
  .items th:nth-child(3), .td:nth-child(3) { width: 30mm; }
  .items th:nth-child(4), .td:nth-child(4) { width: 30mm; }

  .totals-wrap { display: flex; justify-content: flex-end; }
  .totals { width: 78mm; margin-top: 6mm; }
  .trow { display: flex; justify-content: space-between; padding: 1.6mm 0; font-size: 9pt; color: ${T.muted}; }
  .trow .tv { font-variant-numeric: tabular-nums; color: ${T.ink}; }
  .tnote { font-size: 6.8pt; color: ${T.faint}; text-align: right; padding: 0.6mm 0 2.8mm; }
  .grand {
    border-top: 0.75pt solid ${T.night}; position: relative;
    padding-top: 3mm; margin-top: 0.5mm;
    display: flex; justify-content: space-between; align-items: baseline;
  }
  .grand::before { content: ""; position: absolute; top: 1mm; left: 0; right: 0; border-top: 0.25pt solid ${T.hairlineDark}; }
  .grand .gl { font-size: 6.6pt; font-weight: 600; letter-spacing: 0.3em; text-transform: uppercase; color: ${T.forest}; }
  .grand .gv { font-family: ${SERIF}; font-size: 18pt; color: ${T.night}; font-variant-numeric: tabular-nums; }
  .settled { text-align: right; font-family: ${SERIF}; font-style: italic; font-size: 8.4pt; color: ${T.muted}; margin-top: 2.4mm; }

  .foot { position: absolute; left: 14mm; right: 14mm; bottom: 10mm; }
  .legal { font-size: 6.6pt; color: ${T.faint}; line-height: 1.6; text-align: center; }
  .fb { margin-top: 3.2mm; text-align: center; }
  .fb .b { font-size: 6.8pt; font-weight: 700; letter-spacing: 0.34em; text-transform: uppercase; color: ${T.forest}; }
  .fb .t { display: block; font-family: ${SERIF}; font-style: italic; font-size: 8pt; color: ${T.faint}; margin-top: 1mm; }
</style></head><body><div class="sheet"><div class="frame">

  <div class="mast">
    <img class="logo" src="${logoDataUrl}" alt="Global Health" />
    <div class="mast-title">${TITLES[data.documentType]}</div>
    <div class="mast-orn"><span class="mast-no">Nº ${esc(data.invoiceNumber)}</span></div>
    <div class="mast-sub">Issued ${date(data.invoiceDate)} &nbsp;·&nbsp; <span class="st">${statusLabel}</span>${!isUnpaid && order.paidAt ? ` &nbsp;·&nbsp; ${date(order.paidAt)}` : ""}</div>
  </div>

  <div class="parties">
    <div class="party">
      <span class="caps">From</span>
      <div class="n">Global Health</div>
      <div class="l">Registered in Ireland</div>
      <div class="l">CRO No. 910267</div>
      <div class="l">6-9 Trinity Street, Dublin 2</div>
      <div class="l">D02 EY47, Ireland</div>
    </div>
    <div class="party">
      <span class="caps">Billed to</span>
      <div class="n">${esc(order.fullName)}</div>
      <div class="l">${esc(order.email)}</div>
      ${order.phone ? `<div class="l">${esc(order.phone)}</div>` : ""}
      ${order.taxIdNumber ? `<div class="l">Tax ID — ${esc(order.taxIdNumber)}</div>` : ""}
      ${order.consultationDate ? `<div class="l">Consultation ${date(order.consultationDate)}</div>` : ""}
    </div>
  </div>

  ${
    data.doctor
      ? `<div class="doctor"><span class="caps">Attending doctor</span> &nbsp; <span class="dn">${esc(data.doctor.fullName)}</span> &nbsp;·&nbsp; ${data.doctor.chamberEntity ? `${esc(data.doctor.chamberEntity)} · ` : ""}Reg. ${esc(data.doctor.registrationNumber ?? "")}</div>`
      : ""
  }

  <table class="items">
    <thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals-wrap"><div class="totals">
    <div class="trow"><span>Subtotal</span><span class="tv">${money(order.subtotalCents, cur)}</span></div>
    ${order.shippingCents > 0 ? `<div class="trow"><span>Shipping</span><span class="tv">${money(order.shippingCents, cur)}</span></div>` : ""}
    <div class="trow"><span>VAT (0%)</span><span class="tv">${money(0, cur)}</span></div>
    <div class="tnote">${VAT_NOTE}</div>
    <div class="grand"><span class="gl">${isCN ? "Total refunded" : "Total"}</span><span class="gv">${money(order.totalCents, cur)}</span></div>
    ${!isUnpaid && order.paidAt ? `<div class="settled">${isCN ? "Refund issued" : "Settled in full"}, ${date(order.paidAt)}</div>` : ""}
  </div></div>

  <div class="foot">
    <div class="legal">${esc(LEGAL)}</div>
    <div class="fb"><span class="b">Global Health</span><span class="t">Medicine Anytime Anywhere — myglobalhealth.online</span></div>
  </div>

</div></div></body></html>`;
}

// ═════════════════════════════════════════════════════════════════════════════
// VARIANT D — Forest spine. Slim solid forest band down the left edge,
// modern sans layout, ivory doctor panel, strong forest total rule.
// ═════════════════════════════════════════════════════════════════════════════
export function buildVariantD(data: InvoicePdfData, logoDataUrl: string): string {
  const { order } = data;
  const cur = order.currencyCode;
  const isCN = data.documentType === "CREDIT_NOTE";
  const isUnpaid = data.documentType === "INVOICE";
  const statusLabel = isCN ? "Refunded" : isUnpaid ? "Payment due" : "Paid";

  const rows = order.items
    .map(
      (i) => `
      <tr>
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
  body {
    font-family: ${SANS}; font-size: 9.5pt; line-height: 1.5; color: ${T.ink};
    background: ${T.paper}; -webkit-print-color-adjust: exact; print-color-adjust: exact;
    width: 210mm;
  }
  .spine {
    position: fixed; left: 0; top: 0; bottom: 0; width: 7mm; background: ${T.night};
  }
  .spine-caption {
    position: fixed; left: 0; top: 0; width: 7mm; height: 297mm;
    display: flex; align-items: flex-end; justify-content: center; padding-bottom: 12mm;
  }
  .spine-caption span {
    writing-mode: vertical-rl; transform: rotate(180deg);
    font-size: 6pt; font-weight: 600; letter-spacing: 0.42em; text-transform: uppercase;
    color: rgba(242, 245, 236, 0.75);
  }
  .page { position: relative; min-height: 297mm; padding: 16mm 17mm 52mm 24mm; }
  .caps { font-size: 6.6pt; font-weight: 600; letter-spacing: 0.26em; text-transform: uppercase; color: ${T.faint}; }

  .head { display: flex; justify-content: space-between; align-items: flex-start; }
  .logo { height: 14mm; width: auto; }
  .head-right { text-align: right; }
  .doc-kicker { font-size: 7pt; font-weight: 600; letter-spacing: 0.3em; text-transform: uppercase; color: ${T.forest}; }
  .doc-number { font-size: 16pt; font-weight: 700; color: ${T.night}; letter-spacing: -0.01em; margin-top: 1.4mm; }
  .doc-date { font-size: 8.4pt; color: ${T.muted}; margin-top: 1mm; }
  .status {
    display: inline-block; margin-top: 2.6mm;
    border: 0.75pt solid ${T.forest}; color: ${T.forest};
    font-size: 6.8pt; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase;
    padding: 1.3mm 3.6mm; border-radius: 99px;
  }

  .rule { margin-top: 7mm; border-top: 1pt solid ${T.night}; }

  .parties { display: flex; gap: 12mm; margin-top: 9mm; }
  .party { flex: 1; min-width: 0; }
  .party .caps { display: block; margin-bottom: 2mm; }
  .party .n { font-size: 11pt; font-weight: 700; color: ${T.night}; }
  .party .l { font-size: 8.8pt; color: ${T.muted}; margin-top: 1mm; }

  .doctor {
    margin-top: 9mm; padding: 4mm 5.5mm; background: ${T.ivory};
    display: flex; justify-content: space-between; align-items: baseline; gap: 6mm;
  }
  .doctor .dn { font-size: 10.5pt; font-weight: 700; color: ${T.night}; }
  .doctor .dr { font-size: 8.4pt; color: ${T.muted}; text-align: right; }

  .items { width: 100%; border-collapse: collapse; margin-top: 10mm; }
  .items th {
    text-align: left; padding: 0 0 2.4mm;
    font-size: 6.6pt; font-weight: 600; letter-spacing: 0.26em; text-transform: uppercase; color: ${T.forest};
    border-bottom: 1pt solid ${T.night};
  }
  .items th.num { text-align: right; }
  .td { padding: 4.2mm 0; border-bottom: 0.4pt solid ${T.hairline}; font-size: 9.8pt; }
  .td.desc { font-weight: 600; color: ${T.night}; padding-right: 8mm; }
  .td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; color: ${T.muted}; }
  .td.strong { color: ${T.night}; font-weight: 700; }
  .items th:nth-child(2), .td:nth-child(2) { width: 15mm; }
  .items th:nth-child(3), .td:nth-child(3) { width: 30mm; }
  .items th:nth-child(4), .td:nth-child(4) { width: 30mm; }

  .totals-wrap { display: flex; justify-content: flex-end; }
  .totals { width: 82mm; margin-top: 6mm; }
  .trow { display: flex; justify-content: space-between; padding: 1.6mm 0; font-size: 9pt; color: ${T.muted}; }
  .trow .tv { font-variant-numeric: tabular-nums; color: ${T.ink}; }
  .tnote { font-size: 6.8pt; color: ${T.faint}; text-align: right; padding: 0.6mm 0 3mm; }
  .grand {
    border-top: 1.6pt solid ${T.forest};
    padding-top: 3mm; margin-top: 1mm;
    display: flex; justify-content: space-between; align-items: baseline;
  }
  .grand .gl { font-size: 7pt; font-weight: 700; letter-spacing: 0.26em; text-transform: uppercase; color: ${T.forest}; }
  .grand .gv { font-size: 19pt; font-weight: 700; color: ${T.forest}; font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
  .settled { text-align: right; font-size: 8.2pt; color: ${T.muted}; margin-top: 2mm; }

  .foot { position: absolute; left: 24mm; right: 17mm; bottom: 12mm; }
  .foot-rule { border-top: 0.4pt solid ${T.hairline}; margin-bottom: 3mm; }
  .legal { font-size: 6.6pt; color: ${T.faint}; line-height: 1.65; }
  .fb { display: flex; justify-content: space-between; margin-top: 3.2mm; font-size: 6.8pt; }
  .fb .b { font-weight: 700; letter-spacing: 0.28em; text-transform: uppercase; color: ${T.forest}; }
  .fb .t { color: ${T.faint}; }
</style></head><body>
<div class="spine"></div>
<div class="spine-caption"><span>Global Health</span></div>
<div class="page">

  <div class="head">
    <img class="logo" src="${logoDataUrl}" alt="Global Health" />
    <div class="head-right">
      <div class="doc-kicker">${TITLES[data.documentType]}</div>
      <div class="doc-number">${esc(data.invoiceNumber)}</div>
      <div class="doc-date">Issued ${date(data.invoiceDate)}</div>
      <div class="status">${statusLabel}</div>
    </div>
  </div>

  <div class="rule"></div>

  <div class="parties">
    <div class="party">
      <span class="caps">From</span>
      <div class="n">Global Health</div>
      <div class="l">Registered in Ireland · CRO No. 910267</div>
      <div class="l">6-9 Trinity Street, Dublin 2, D02 EY47, Ireland</div>
      <div class="l">info@myglobalhealth.online</div>
    </div>
    <div class="party">
      <span class="caps">Billed to</span>
      <div class="n">${esc(order.fullName)}</div>
      <div class="l">${esc(order.email)}</div>
      ${order.phone ? `<div class="l">${esc(order.phone)}</div>` : ""}
      ${order.taxIdNumber ? `<div class="l">Tax ID ${esc(order.taxIdNumber)}</div>` : ""}
      ${order.consultationDate ? `<div class="l">Consultation ${date(order.consultationDate)}</div>` : ""}
    </div>
  </div>

  ${
    data.doctor
      ? `<div class="doctor">
          <div><span class="caps">Attending doctor</span><div class="dn">${esc(data.doctor.fullName)}</div></div>
          <div class="dr">${data.doctor.chamberEntity ? `${esc(data.doctor.chamberEntity)}<br>` : ""}Reg. ${esc(data.doctor.registrationNumber ?? "")}</div>
        </div>`
      : ""
  }

  <table class="items">
    <thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals-wrap"><div class="totals">
    <div class="trow"><span>Subtotal</span><span class="tv">${money(order.subtotalCents, cur)}</span></div>
    ${order.shippingCents > 0 ? `<div class="trow"><span>Shipping</span><span class="tv">${money(order.shippingCents, cur)}</span></div>` : ""}
    <div class="trow"><span>VAT (0%)</span><span class="tv">${money(0, cur)}</span></div>
    <div class="tnote">${VAT_NOTE}</div>
    <div class="grand"><span class="gl">${isCN ? "Total refunded" : "Total"}</span><span class="gv">${money(order.totalCents, cur)}</span></div>
    ${!isUnpaid && order.paidAt ? `<div class="settled">${isCN ? "Refund issued" : "Settled in full"} · ${date(order.paidAt)}</div>` : ""}
  </div></div>

  <div class="foot">
    <div class="foot-rule"></div>
    <div class="legal">${esc(LEGAL)}</div>
    <div class="fb"><span class="b">Global Health</span><span class="t">Medicine Anytime Anywhere · myglobalhealth.online · Ref ${esc(data.invoiceNumber)}</span></div>
  </div>

</div></body></html>`;
}
