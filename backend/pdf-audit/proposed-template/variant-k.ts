// VARIANT K — D's forest spine + E's editorial poster invoice.
// No ghost watermark, larger logo (17mm). Mock data only.
import type { InvoicePdfData } from "../../src/modules/invoices/invoice-pdf.js";

const T = {
  night: "#0F2E25",
  forest: "#1D4B36",
  ink: "#26332D",
  muted: "#66716A",
  faint: "#9AA49D",
  hairline: "#E4E7E0",
  hairlineDark: "#C9CFC7",
  paper: "#FFFFFF",
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

export function buildVariantK(data: InvoicePdfData, logoDataUrl: string): string {
  const { order } = data;
  const cur = order.currencyCode;
  const isCN = data.documentType === "CREDIT_NOTE";
  const isUnpaid = data.documentType === "INVOICE";
  const label = isCN ? "Refunded" : isUnpaid ? "Payment due" : "Paid";

  const ecg = `<svg viewBox="0 0 600 24" preserveAspectRatio="none" style="display:block;width:100%;height:6mm;">
    <path d="M0 12 H250 L262 12 L268 12 L274 4 L282 20 L288 12 L300 12 H600" fill="none" stroke="${T.night}" stroke-width="1.2"/>
    <path d="M262 12 L268 12 L274 4 L282 20 L288 12 L294 12" fill="none" stroke="${T.lime}" stroke-width="1.6"/>
  </svg>`;

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

  .masthead { margin-top: 10mm; }
  .mast-title { font-family: ${SERIF}; font-style: italic; font-size: 44pt; line-height: 1.02;
    color: ${T.night}; letter-spacing: -0.015em; }
  .mast-sub { margin-top: 4mm; display: flex; align-items: baseline; gap: 6mm; }
  .mast-no { font-size: 9pt; font-weight: 700; letter-spacing: 0.2em; color: ${T.forest}; }
  .mast-issued { font-size: 8.6pt; color: ${T.muted}; }
  .mast-status { font-size: 7pt; font-weight: 700; letter-spacing: 0.26em; text-transform: uppercase;
    color: ${T.night}; border-bottom: 1.6pt solid ${T.lime}; padding-bottom: 0.8mm; }
  .ecg { margin-top: 7mm; }

  .parties { display: flex; gap: 11mm; margin-top: 9mm; }
  .party { flex: 1; min-width: 0; }
  .party .caps { display: block; margin-bottom: 2mm; }
  .party .n { font-family: ${SERIF}; font-size: 12pt; color: ${T.night}; }
  .party .l { font-size: 8.6pt; color: ${T.muted}; margin-top: 0.9mm; }
  .party.dr .n { font-size: 11pt; }

  .items { width: 100%; border-collapse: collapse; margin-top: 10mm; }
  .items th { text-align: left; padding: 0 0 2.4mm;
    font-size: 6.6pt; font-weight: 600; letter-spacing: 0.28em; text-transform: uppercase; color: ${T.forest};
    border-bottom: 1pt solid ${T.night}; }
  .items th.num { text-align: right; }
  .td { padding: 4.2mm 0; border-bottom: 0.4pt solid ${T.hairline}; }
  .td.idx { width: 10mm; font-size: 8pt; color: ${T.faint}; font-variant-numeric: tabular-nums; }
  .td.desc { font-family: ${SERIF}; font-size: 10.5pt; color: ${T.night}; padding-right: 8mm; }
  .td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; font-size: 9.5pt; color: ${T.muted}; }
  .td.strong { color: ${T.night}; }
  .items th:nth-child(3), .td:nth-child(3) { width: 14mm; }
  .items th:nth-child(4), .td:nth-child(4) { width: 30mm; }
  .items th:nth-child(5), .td:nth-child(5) { width: 30mm; }

  .settle { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 8mm; }
  .settle-left { font-size: 8.2pt; color: ${T.faint}; max-width: 66mm; }
  .settle-left b { color: ${T.muted}; }
  .totals { width: 82mm; }
  .trow { display: flex; justify-content: space-between; padding: 1.5mm 0; font-size: 9pt; color: ${T.muted}; }
  .trow .tv { font-variant-numeric: tabular-nums; color: ${T.ink}; }
  .tnote { font-size: 6.8pt; color: ${T.faint}; text-align: right; padding: 0.4mm 0 2.6mm; }
  .grand { border-top: 1pt solid ${T.night}; padding-top: 2.6mm;
    display: flex; justify-content: space-between; align-items: baseline; }
  .grand .gl { font-size: 6.8pt; font-weight: 600; letter-spacing: 0.28em; text-transform: uppercase; color: ${T.forest}; }
  .grand .gv { font-family: ${SERIF}; font-style: italic; font-size: 26pt; color: ${T.night}; letter-spacing: -0.01em; }
  .settled { text-align: right; font-size: 8.2pt; color: ${T.muted}; margin-top: 1.6mm; }

  .foot { position: absolute; left: 24mm; right: 16mm; bottom: 11mm; }
  .foot-rule { border-top: 0.4pt solid ${T.hairline}; margin-bottom: 3mm; }
  .legal { font-size: 6.6pt; color: ${T.faint}; line-height: 1.65; }
  .fb { display: flex; justify-content: space-between; margin-top: 3mm; font-size: 6.8pt; }
  .fb .b { font-weight: 700; letter-spacing: 0.28em; text-transform: uppercase; color: ${T.forest}; }
  .fb .t { color: ${T.faint}; font-family: ${SERIF}; font-style: italic; font-size: 8pt; }
</style></head><body>
<div class="spine"></div>
<div class="spine-caption"><span>Global Health</span></div>
<div class="page">

  <div class="topline">
    <img class="logo" src="${logoDataUrl}" alt="Global Health" />
    <span class="caps">Fiscal document — ${esc(data.invoiceNumber)}</span>
  </div>

  <div class="masthead">
    <div class="mast-title">${TITLES[data.documentType]}</div>
    <div class="mast-sub">
      <span class="mast-no">Nº ${esc(data.invoiceNumber)}</span>
      <span class="mast-issued">Issued ${date(data.invoiceDate)}</span>
      <span class="mast-status">${label}${!isUnpaid && order.paidAt ? ` · ${date(order.paidAt)}` : ""}</span>
    </div>
    <div class="ecg">${ecg}</div>
  </div>

  <div class="parties">
    <div class="party">
      <span class="caps">From</span>
      <div class="n">Global Health</div>
      <div class="l">Registered in Ireland</div>
      <div class="l">CRO No. 910267</div>
      <div class="l">6-9 Trinity Street, Dublin 2, D02 EY47</div>
      <div class="l">info@myglobalhealth.online</div>
    </div>
    <div class="party">
      <span class="caps">Billed to</span>
      <div class="n">${esc(order.fullName)}</div>
      <div class="l">${esc(order.email)}</div>
      ${order.phone ? `<div class="l">${esc(order.phone)}</div>` : ""}
      ${order.taxIdNumber ? `<div class="l">Tax ID ${esc(order.taxIdNumber)}</div>` : ""}
    </div>
    ${
      data.doctor
        ? `<div class="party dr">
            <span class="caps">Attending doctor</span>
            <div class="n">${esc(data.doctor.fullName)}</div>
            ${data.doctor.chamberEntity ? `<div class="l">${esc(data.doctor.chamberEntity)}</div>` : ""}
            ${data.doctor.registrationNumber ? `<div class="l">Reg. ${esc(data.doctor.registrationNumber)}</div>` : ""}
            ${order.consultationDate ? `<div class="l">Consultation ${date(order.consultationDate)}</div>` : ""}
          </div>`
        : ""
    }
  </div>

  <table class="items">
    <thead><tr><th>Nº</th><th>Description</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="settle">
    <div class="settle-left">Please quote reference <b>${esc(data.invoiceNumber)}</b> in any correspondence.</div>
    <div class="totals">
      <div class="trow"><span>Subtotal</span><span class="tv">${money(order.subtotalCents, cur)}</span></div>
      ${order.shippingCents > 0 ? `<div class="trow"><span>Shipping</span><span class="tv">${money(order.shippingCents, cur)}</span></div>` : ""}
      <div class="trow"><span>VAT (0%)</span><span class="tv">${money(0, cur)}</span></div>
      <div class="tnote">${VAT_NOTE}</div>
      <div class="grand"><span class="gl">${isCN ? "Total refunded" : "Total"}</span><span class="gv">${money(order.totalCents, cur)}</span></div>
      ${!isUnpaid && order.paidAt ? `<div class="settled">${isCN ? "Refund issued" : "Settled in full"} · ${date(order.paidAt)}</div>` : ""}
    </div>
  </div>

  <div class="foot">
    <div class="foot-rule"></div>
    <div class="legal">${esc(LEGAL)}</div>
    <div class="fb"><span class="b">Global Health</span><span class="t">Medicine Anytime Anywhere — myglobalhealth.online</span></div>
  </div>

</div></body></html>`;
}
