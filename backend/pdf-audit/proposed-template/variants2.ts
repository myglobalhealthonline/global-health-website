// Bold/statement invoice directions for review (E, F, G). Mock data only.
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
  lime: "#B0F122",
  onDark: "#F2F5EC",
  onDarkMuted: "#93A79A",
  onDarkFaint: "#5C7466",
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

// ECG pulse line — brand motif (heartbeat from the logo), stroke inherits color.
function ecg(color: string, limePeak = true): string {
  return `<svg viewBox="0 0 600 24" preserveAspectRatio="none" style="display:block;width:100%;height:6mm;">
    <path d="M0 12 H250 L262 12 L268 12 L274 4 L282 20 L288 12 L300 12 H600" fill="none" stroke="${color}" stroke-width="1.2"/>
    ${limePeak ? `<path d="M262 12 L268 12 L274 4 L282 20 L288 12 L294 12" fill="none" stroke="${T.lime}" stroke-width="1.6"/>` : ""}
  </svg>`;
}

// ═════════════════════════════════════════════════════════════════════════════
// VARIANT E — Editorial poster. Magazine-cover masthead, giant italic serif,
// ECG pulse rule, ghost numeral, content compressed below.
// ═════════════════════════════════════════════════════════════════════════════
export function buildVariantE(data: InvoicePdfData, logoDataUrl: string): string {
  const { order } = data;
  const cur = order.currencyCode;
  const isCN = data.documentType === "CREDIT_NOTE";
  const isUnpaid = data.documentType === "INVOICE";
  const statusLabel = isCN ? "Refunded" : isUnpaid ? "Payment due" : "Paid";
  const ghostNo = data.invoiceNumber.replace(/^\D+/, "").replace(/^0+/, "") || data.invoiceNumber;

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
  .page { position: relative; min-height: 297mm; padding: 14mm 17mm 50mm; overflow: hidden; }
  .caps { font-size: 6.6pt; font-weight: 600; letter-spacing: 0.28em; text-transform: uppercase; color: ${T.faint}; }

  .topline { display: flex; justify-content: space-between; align-items: center;
    border-bottom: 0.5pt solid ${T.hairlineDark}; padding-bottom: 3mm; }
  .topline .caps { color: ${T.forest}; }
  .logo { height: 11mm; width: auto; }

  .masthead { margin-top: 12mm; position: relative; }
  .mast-title {
    font-family: ${SERIF}; font-style: italic; font-size: 46pt; line-height: 1.02;
    color: ${T.night}; letter-spacing: -0.015em;
  }
  .mast-sub { margin-top: 4mm; display: flex; align-items: baseline; gap: 6mm; }
  .mast-no { font-size: 9pt; font-weight: 700; letter-spacing: 0.2em; color: ${T.forest}; }
  .mast-issued { font-size: 8.6pt; color: ${T.muted}; }
  .mast-status {
    font-size: 7pt; font-weight: 700; letter-spacing: 0.26em; text-transform: uppercase;
    color: ${T.night}; border-bottom: 1.6pt solid ${T.lime}; padding-bottom: 0.8mm;
  }
  .ecg { margin-top: 7mm; }

  .ghost {
    position: absolute; right: -6mm; top: 88mm; z-index: 0;
    font-family: ${SERIF}; font-size: 130pt; line-height: 1; color: ${T.ivory};
    -webkit-text-stroke: 0.5pt ${T.hairlineDark};
    letter-spacing: -0.03em; pointer-events: none;
  }
  .content { position: relative; z-index: 1; }

  .parties { display: flex; gap: 12mm; margin-top: 10mm; }
  .party { flex: 1; min-width: 0; }
  .party .caps { display: block; margin-bottom: 2mm; }
  .party .n { font-family: ${SERIF}; font-size: 12pt; color: ${T.night}; }
  .party .l { font-size: 8.6pt; color: ${T.muted}; margin-top: 0.9mm; }
  .party.dr .n { font-size: 11pt; }

  .items { width: 100%; border-collapse: collapse; margin-top: 11mm; }
  .items th { text-align: left; padding: 0 0 2.4mm;
    font-size: 6.6pt; font-weight: 600; letter-spacing: 0.28em; text-transform: uppercase; color: ${T.forest};
    border-bottom: 1pt solid ${T.night}; }
  .items th.num { text-align: right; }
  .td { padding: 4.2mm 0; border-bottom: 0.4pt solid ${T.hairline}; background: transparent; }
  .td.idx { width: 10mm; font-size: 8pt; color: ${T.faint}; font-variant-numeric: tabular-nums; }
  .td.desc { font-family: ${SERIF}; font-size: 10.5pt; color: ${T.night}; padding-right: 8mm; }
  .td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; font-size: 9.5pt; color: ${T.muted}; }
  .td.strong { color: ${T.night}; }
  .items th:nth-child(3), .td:nth-child(3) { width: 14mm; }
  .items th:nth-child(4), .td:nth-child(4) { width: 30mm; }
  .items th:nth-child(5), .td:nth-child(5) { width: 30mm; }

  .settle { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 8mm; }
  .settle-left { font-size: 8.2pt; color: ${T.faint}; max-width: 70mm; }
  .settle-left b { color: ${T.muted}; }
  .totals { width: 82mm; }
  .trow { display: flex; justify-content: space-between; padding: 1.5mm 0; font-size: 9pt; color: ${T.muted}; }
  .trow .tv { font-variant-numeric: tabular-nums; color: ${T.ink}; }
  .tnote { font-size: 6.8pt; color: ${T.faint}; text-align: right; padding: 0.4mm 0 2.6mm; }
  .grand { border-top: 1pt solid ${T.night}; padding-top: 2.6mm; display: flex; justify-content: space-between; align-items: baseline; }
  .grand .gl { font-size: 6.8pt; font-weight: 600; letter-spacing: 0.28em; text-transform: uppercase; color: ${T.forest}; }
  .grand .gv { font-family: ${SERIF}; font-style: italic; font-size: 26pt; color: ${T.night}; letter-spacing: -0.01em; }
  .settled { text-align: right; font-size: 8.2pt; color: ${T.muted}; margin-top: 1.6mm; }

  .foot { position: absolute; left: 17mm; right: 17mm; bottom: 11mm; z-index: 1; }
  .foot-rule { border-top: 0.4pt solid ${T.hairline}; margin-bottom: 3mm; }
  .legal { font-size: 6.6pt; color: ${T.faint}; line-height: 1.65; }
  .fb { display: flex; justify-content: space-between; margin-top: 3mm; font-size: 6.8pt; }
  .fb .b { font-weight: 700; letter-spacing: 0.28em; text-transform: uppercase; color: ${T.forest}; }
  .fb .t { color: ${T.faint}; font-family: ${SERIF}; font-style: italic; font-size: 8pt; }
</style></head><body><div class="page">

  <div class="topline">
    <img class="logo" src="${logoDataUrl}" alt="Global Health" />
    <span class="caps">Fiscal document — ${esc(data.invoiceNumber)}</span>
  </div>

  <div class="masthead">
    <div class="mast-title">${TITLES[data.documentType]}</div>
    <div class="mast-sub">
      <span class="mast-no">Nº ${esc(data.invoiceNumber)}</span>
      <span class="mast-issued">Issued ${date(data.invoiceDate)}</span>
      <span class="mast-status">${statusLabel}${!isUnpaid && order.paidAt ? ` · ${date(order.paidAt)}` : ""}</span>
    </div>
    <div class="ecg">${ecg(T.night)}</div>
  </div>

  <div class="ghost">${esc(ghostNo)}</div>

  <div class="content">
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
  </div>

  <div class="foot">
    <div class="foot-rule"></div>
    <div class="legal">${esc(LEGAL)}</div>
    <div class="fb"><span class="b">Global Health</span><span class="t">Medicine Anytime Anywhere — myglobalhealth.online</span></div>
  </div>

</div></body></html>`;
}

// ═════════════════════════════════════════════════════════════════════════════
// VARIANT F — Obsidian dark luxe. Full forest-night sheet, ivory type,
// lime ECG pulse, serif display total.
// ═════════════════════════════════════════════════════════════════════════════
export function buildVariantF(data: InvoicePdfData, logoLightDataUrl: string): string {
  const { order } = data;
  const cur = order.currencyCode;
  const isCN = data.documentType === "CREDIT_NOTE";
  const isUnpaid = data.documentType === "INVOICE";
  const statusLabel = isCN ? "Refunded" : isUnpaid ? "Payment due" : "Paid";
  const hairline = "rgba(242, 245, 236, 0.14)";
  const hairlineStrong = "rgba(242, 245, 236, 0.3)";

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
  html { background: ${T.night}; }
  body { font-family: ${SANS}; font-size: 9.5pt; line-height: 1.5; color: ${T.onDark};
    background: ${T.night}; -webkit-print-color-adjust: exact; print-color-adjust: exact; width: 210mm; }
  .page { position: relative; min-height: 297mm; padding: 16mm 18mm 50mm; }
  .caps { font-size: 6.6pt; font-weight: 600; letter-spacing: 0.3em; text-transform: uppercase; color: ${T.onDarkMuted}; }
  .lime { color: ${T.lime}; }

  .head { display: flex; justify-content: space-between; align-items: flex-start; }
  .logo { height: 15mm; width: auto; }
  .head-right { text-align: right; }
  .doc-kicker { font-size: 7pt; font-weight: 600; letter-spacing: 0.34em; text-transform: uppercase; color: ${T.onDarkMuted}; }
  .doc-title { font-family: ${SERIF}; font-size: 24pt; color: ${T.onDark}; margin-top: 1.6mm; letter-spacing: 0.01em; }
  .doc-sub { font-size: 8.4pt; color: ${T.onDarkMuted}; margin-top: 1.4mm; }
  .doc-sub .st { color: ${T.lime}; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; font-size: 7pt; }

  .ecg { margin-top: 8mm; }

  .parties { display: flex; margin-top: 9mm; }
  .party { flex: 1; min-width: 0; padding-right: 8mm; }
  .party + .party { border-left: 0.5pt solid ${hairline}; padding-left: 8mm; }
  .party:last-child { padding-right: 0; }
  .party .caps { display: block; margin-bottom: 2.2mm; }
  .party .n { font-family: ${SERIF}; font-size: 11.5pt; color: ${T.onDark}; }
  .party .l { font-size: 8.4pt; color: ${T.onDarkMuted}; margin-top: 1mm; }

  .items { width: 100%; border-collapse: collapse; margin-top: 11mm; }
  .items th { text-align: left; padding: 0 0 2.6mm;
    font-size: 6.6pt; font-weight: 600; letter-spacing: 0.3em; text-transform: uppercase; color: ${T.onDarkMuted};
    border-bottom: 0.75pt solid ${hairlineStrong}; }
  .items th.num { text-align: right; }
  .td { padding: 4.4mm 0; border-bottom: 0.4pt solid ${hairline}; }
  .td.idx { width: 10mm; font-size: 8pt; color: ${T.onDarkFaint}; font-variant-numeric: tabular-nums; }
  .td.desc { font-family: ${SERIF}; font-size: 10.5pt; color: ${T.onDark}; padding-right: 8mm; }
  .td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; font-size: 9.5pt; color: ${T.onDarkMuted}; }
  .td.strong { color: ${T.onDark}; }
  .items th:nth-child(3), .td:nth-child(3) { width: 14mm; }
  .items th:nth-child(4), .td:nth-child(4) { width: 30mm; }
  .items th:nth-child(5), .td:nth-child(5) { width: 30mm; }

  .totals-wrap { display: flex; justify-content: flex-end; }
  .totals { width: 84mm; margin-top: 7mm; }
  .trow { display: flex; justify-content: space-between; padding: 1.6mm 0; font-size: 9pt; color: ${T.onDarkMuted}; }
  .trow .tv { font-variant-numeric: tabular-nums; color: ${T.onDark}; }
  .tnote { font-size: 6.8pt; color: ${T.onDarkFaint}; text-align: right; padding: 0.6mm 0 3mm; }
  .grand { border-top: 1pt solid ${T.lime}; padding-top: 3mm;
    display: flex; justify-content: space-between; align-items: baseline; }
  .grand .gl { font-size: 6.8pt; font-weight: 700; letter-spacing: 0.3em; text-transform: uppercase; color: ${T.lime}; }
  .grand .gv { font-family: ${SERIF}; font-size: 24pt; color: ${T.onDark}; letter-spacing: 0.01em; }
  .settled { text-align: right; font-family: ${SERIF}; font-style: italic; font-size: 8.4pt; color: ${T.onDarkMuted}; margin-top: 2mm; }

  .ref { font-size: 7.6pt; color: ${T.onDarkFaint}; margin-top: 11mm; }
  .ref b { color: ${T.onDarkMuted}; }

  .foot { position: absolute; left: 18mm; right: 18mm; bottom: 11mm; }
  .foot-rule { border-top: 0.4pt solid ${hairline}; margin-bottom: 3mm; }
  .legal { font-size: 6.6pt; color: ${T.onDarkFaint}; line-height: 1.65; }
  .fb { display: flex; justify-content: space-between; margin-top: 3.2mm; font-size: 6.8pt; }
  .fb .b { font-weight: 700; letter-spacing: 0.3em; text-transform: uppercase; color: ${T.lime}; }
  .fb .t { color: ${T.onDarkMuted}; font-family: ${SERIF}; font-style: italic; font-size: 8pt; }
</style></head><body><div class="page">

  <div class="head">
    <img class="logo" src="${logoLightDataUrl}" alt="Global Health" />
    <div class="head-right">
      <div class="doc-kicker">Global Health</div>
      <div class="doc-title">${TITLES[data.documentType]}</div>
      <div class="doc-sub">Nº ${esc(data.invoiceNumber)} · Issued ${date(data.invoiceDate)} · <span class="st">${statusLabel}</span></div>
    </div>
  </div>

  <div class="ecg">${ecg("rgba(242,245,236,0.35)")}</div>

  <div class="parties">
    <div class="party">
      <span class="caps">From</span>
      <div class="n">Global Health</div>
      <div class="l">Registered in Ireland</div>
      <div class="l">CRO No. 910267</div>
      <div class="l">6-9 Trinity Street, Dublin 2</div>
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
        ? `<div class="party">
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

  <div class="totals-wrap"><div class="totals">
    <div class="trow"><span>Subtotal</span><span class="tv">${money(order.subtotalCents, cur)}</span></div>
    ${order.shippingCents > 0 ? `<div class="trow"><span>Shipping</span><span class="tv">${money(order.shippingCents, cur)}</span></div>` : ""}
    <div class="trow"><span>VAT (0%)</span><span class="tv">${money(0, cur)}</span></div>
    <div class="tnote">${VAT_NOTE}</div>
    <div class="grand"><span class="gl">${isCN ? "Total refunded" : "Total"}</span><span class="gv">${money(order.totalCents, cur)}</span></div>
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
// VARIANT G — Brutalist grid. Heavy rules, poster-scale stacked title,
// exposed table grid, lime total block. gh2-brutalist energy.
// ═════════════════════════════════════════════════════════════════════════════
export function buildVariantG(data: InvoicePdfData, logoDataUrl: string): string {
  const { order } = data;
  const cur = order.currencyCode;
  const isCN = data.documentType === "CREDIT_NOTE";
  const isUnpaid = data.documentType === "INVOICE";
  const statusLabel = isCN ? "REFUNDED" : isUnpaid ? "PAYMENT DUE" : "PAID";

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
  body { font-family: ${SANS}; font-size: 9.5pt; line-height: 1.5; color: ${T.night};
    background: ${T.paper}; -webkit-print-color-adjust: exact; print-color-adjust: exact; width: 210mm; }
  .page { position: relative; min-height: 297mm; padding: 13mm 15mm 50mm; }
  .caps { font-size: 6.6pt; font-weight: 700; letter-spacing: 0.26em; text-transform: uppercase; color: ${T.muted}; }

  .head {
    display: flex; justify-content: space-between; align-items: center;
    border: 1.4pt solid ${T.night}; padding: 5mm 6mm;
  }
  .logo { height: 13mm; width: auto; }
  .head-meta { text-align: right; font-size: 7.5pt; color: ${T.muted}; line-height: 1.7; }
  .head-meta b { color: ${T.night}; }

  .title-block {
    border: 1.4pt solid ${T.night}; border-top: none;
    display: flex; align-items: stretch;
  }
  .title-main { flex: 1; padding: 6mm; }
  .title-main h1 {
    font-size: 34pt; font-weight: 800; line-height: 0.98; letter-spacing: -0.02em;
    text-transform: uppercase; color: ${T.night};
  }
  .title-side {
    width: 52mm; border-left: 1.4pt solid ${T.night};
    display: flex; flex-direction: column;
  }
  .status-cell {
    flex: 1; display: flex; align-items: center; justify-content: center;
    background: ${isCN ? "#F3DCDC" : isUnpaid ? "#F6ECD2" : T.lime};
    font-size: 9pt; font-weight: 800; letter-spacing: 0.3em; text-transform: uppercase; color: ${T.night};
  }
  .no-cell {
    border-top: 1.4pt solid ${T.night}; padding: 3mm 4mm; text-align: center;
    font-size: 8.4pt; font-weight: 700; color: ${T.night}; letter-spacing: 0.06em;
  }

  .grid { border: 1.4pt solid ${T.night}; border-top: none; display: flex; }
  .cell { flex: 1; min-width: 0; padding: 4.5mm 5mm; }
  .cell + .cell { border-left: 0.6pt solid ${T.night}; }
  .cell .caps { display: block; margin-bottom: 1.8mm; }
  .cell .n { font-size: 10.5pt; font-weight: 700; color: ${T.night}; }
  .cell .l { font-size: 8.2pt; color: ${T.muted}; margin-top: 0.8mm; }

  .items { width: 100%; border-collapse: collapse; margin-top: 8mm; }
  .items th { text-align: left; padding: 2.6mm 3mm;
    font-size: 6.6pt; font-weight: 700; letter-spacing: 0.26em; text-transform: uppercase; color: ${T.paper};
    background: ${T.night}; }
  .items th.num { text-align: right; }
  .td { padding: 3.8mm 3mm; border: 0.6pt solid ${T.night}; font-size: 9.8pt; }
  .td.idx { width: 10mm; font-size: 8pt; color: ${T.muted}; font-variant-numeric: tabular-nums; }
  .td.desc { font-weight: 700; color: ${T.night}; }
  .td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; color: ${T.ink}; }
  .td.strong { font-weight: 700; }
  .items th:nth-child(3), .td:nth-child(3) { width: 14mm; }
  .items th:nth-child(4), .td:nth-child(4) { width: 30mm; }
  .items th:nth-child(5), .td:nth-child(5) { width: 30mm; }

  .settle { display: flex; justify-content: flex-end; margin-top: 8mm; }
  .totals { width: 92mm; border: 1.4pt solid ${T.night}; }
  .trow { display: flex; justify-content: space-between; padding: 2.4mm 4mm; font-size: 9pt;
    border-bottom: 0.6pt solid ${T.night}; color: ${T.muted}; }
  .trow .tv { font-variant-numeric: tabular-nums; color: ${T.night}; font-weight: 600; }
  .tnote { font-size: 6.6pt; color: ${T.muted}; padding: 1.6mm 4mm; border-bottom: 0.6pt solid ${T.night}; text-align: right; }
  .grand { display: flex; justify-content: space-between; align-items: center; padding: 3.4mm 4mm; background: ${T.lime}; }
  .grand .gl { font-size: 7.5pt; font-weight: 800; letter-spacing: 0.3em; text-transform: uppercase; color: ${T.night}; }
  .grand .gv { font-size: 20pt; font-weight: 800; letter-spacing: -0.01em; color: ${T.night}; font-variant-numeric: tabular-nums; }
  .settled { text-align: right; font-size: 8.2pt; color: ${T.muted}; margin-top: 2.4mm; }

  .foot { position: absolute; left: 15mm; right: 15mm; bottom: 11mm; }
  .foot-rule { border-top: 1.4pt solid ${T.night}; margin-bottom: 3mm; }
  .legal { font-size: 6.6pt; color: ${T.muted}; line-height: 1.65; }
  .fb { display: flex; justify-content: space-between; margin-top: 3mm; font-size: 6.8pt; }
  .fb .b { font-weight: 800; letter-spacing: 0.3em; text-transform: uppercase; color: ${T.night}; }
  .fb .t { color: ${T.muted}; }
</style></head><body><div class="page">

  <div class="head">
    <img class="logo" src="${logoDataUrl}" alt="Global Health" />
    <div class="head-meta">
      Registered in Ireland · CRO No. 910267<br>
      6-9 Trinity Street, Dublin 2, D02 EY47<br>
      info@myglobalhealth.online
    </div>
  </div>

  <div class="title-block">
    <div class="title-main">
      <h1>${TITLES[data.documentType]}</h1>
    </div>
    <div class="title-side">
      <div class="status-cell">${statusLabel}</div>
      <div class="no-cell">${esc(data.invoiceNumber)}</div>
    </div>
  </div>

  <div class="grid">
    <div class="cell">
      <span class="caps">Billed to</span>
      <div class="n">${esc(order.fullName)}</div>
      <div class="l">${esc(order.email)}</div>
      ${order.phone ? `<div class="l">${esc(order.phone)}</div>` : ""}
      ${order.taxIdNumber ? `<div class="l">Tax ID ${esc(order.taxIdNumber)}</div>` : ""}
    </div>
    ${
      data.doctor
        ? `<div class="cell">
            <span class="caps">Attending doctor</span>
            <div class="n">${esc(data.doctor.fullName)}</div>
            ${data.doctor.chamberEntity ? `<div class="l">${esc(data.doctor.chamberEntity)}</div>` : ""}
            ${data.doctor.registrationNumber ? `<div class="l">Reg. ${esc(data.doctor.registrationNumber)}</div>` : ""}
          </div>`
        : ""
    }
    <div class="cell">
      <span class="caps">Dates</span>
      <div class="l"><b style="color:${T.night}">Issued</b> ${date(data.invoiceDate)}</div>
      ${order.consultationDate ? `<div class="l"><b style="color:${T.night}">Consultation</b> ${date(order.consultationDate)}</div>` : ""}
      ${!isUnpaid && order.paidAt ? `<div class="l"><b style="color:${T.night}">${isCN ? "Refunded" : "Paid"}</b> ${date(order.paidAt)}</div>` : ""}
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
  </div></div>
  ${!isUnpaid && order.paidAt ? `<div class="settled">${isCN ? "Refund issued" : "Settled in full"} · ${date(order.paidAt)} · Ref ${esc(data.invoiceNumber)}</div>` : ""}

  <div class="foot">
    <div class="foot-rule"></div>
    <div class="legal">${esc(LEGAL)}</div>
    <div class="fb"><span class="b">Global Health</span><span class="t">Medicine Anytime Anywhere · myglobalhealth.online</span></div>
  </div>

</div></body></html>`;
}
