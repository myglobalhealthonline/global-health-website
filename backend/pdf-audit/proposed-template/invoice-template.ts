// PROPOSED invoice template v3 — review-only, not wired into production.
// Direction: private-clinic stationery. Paper-first, serif display, fine
// hairlines, letterspaced small caps, ledger double-rule total, discreet
// stamp. Color used as a whisper, not a block.
// Same data contract as production (InvoicePdfData) so adoption is drop-in.
import type { InvoicePdfData } from "../../src/modules/invoices/invoice-pdf.js";

// ── Design tokens (Manual da Marca / DESIGN.md) ──────────────────────────────
const T = {
  forest: "#1D4B36",
  night: "#0F2E25",
  ink: "#26332D",
  muted: "#66716A",
  faint: "#9AA49D",
  hairline: "#E4E7E0",
  hairlineDark: "#C9CFC7",
  paper: "#FDFDFA",
  panel: "#F6F8F1",
  danger: "#8C3A34",
  amber: "#8A6410",
};

const SANS = `"Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif`;
const SERIF = `Georgia, "Times New Roman", serif`;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-IE", { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

function fmtDate(iso: string, locale = "en-GB"): string {
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
}

const L = {
  titles: {
    INVOICE: "Invoice",
    RECEIPT: "Receipt",
    INVOICE_RECEIPT: "Invoice / Receipt",
    CREDIT_NOTE: "Credit Note",
  } as Record<InvoicePdfData["documentType"], string>,
  company: "Global Health",
  companyLine: "Registered in Ireland · CRO No. 910267",
  address: "6-9 Trinity Street, Dublin 2, D02 EY47, Ireland",
  email: "info@myglobalhealth.online",
  website: "myglobalhealth.online",
  vatNote: "VAT exempt — healthcare services, VATCA 2010 s.61, Sch.1 ¶23",
  legalFooter:
    "Healthcare services exempt from VAT under the Value-Added Tax Consolidation Act 2010, Section 61 and Schedule 1, Paragraph 23. Global Health is a trading name registered under Global Guest. All transactions conducted under the Global Health brand are legally processed under the business registration and tax details of Global Guest.",
  tagline: "Medicine Anytime Anywhere",
};

export function buildProposedInvoiceHtml(data: InvoicePdfData, logoDataUrl: string): string {
  const { order } = data;
  const cur = order.currencyCode;
  const docTitle = L.titles[data.documentType];
  const isCreditNote = data.documentType === "CREDIT_NOTE";
  const isUnpaid = data.documentType === "INVOICE";

  const stamp = isCreditNote
    ? { label: "Refunded", color: T.danger }
    : isUnpaid
      ? { label: "Payment due", color: T.amber }
      : { label: "Paid", color: T.forest };

  const itemRows = order.items
    .map(
      (i) => `
      <tr>
        <td class="td desc">${esc(i.name)}</td>
        <td class="td num">${i.quantity}</td>
        <td class="td num">${fmtMoney(i.unitPriceCents, cur)}</td>
        <td class="td num">${fmtMoney(i.lineTotalCents, cur)}</td>
      </tr>`,
    )
    .join("");

  const stampDate = isCreditNote || !order.paidAt ? data.invoiceDate : order.paidAt;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${esc(docTitle)} ${esc(data.invoiceNumber)}</title>
<style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 210mm; }
  body {
    font-family: ${SANS};
    font-size: 9.5pt;
    line-height: 1.5;
    color: ${T.ink};
    background: ${T.paper};
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .serif { font-family: ${SERIF}; }
  .page { position: relative; min-height: 297mm; padding: 18mm 19mm 54mm; }

  .caps {
    font-size: 6.8pt; font-weight: 600; letter-spacing: 0.28em;
    text-transform: uppercase; color: ${T.faint};
  }
  .caps-forest { color: ${T.forest}; }

  /* ── masthead ── */
  .mast { display: flex; justify-content: space-between; align-items: flex-end; }
  .logo { height: 15mm; width: auto; display: block; }
  .mast-right { text-align: right; padding-bottom: 1mm; }
  .doc-title {
    font-family: ${SERIF};
    font-size: 20pt; font-weight: 400; color: ${T.night};
    letter-spacing: 0.01em; line-height: 1.15;
  }
  .doc-sub { margin-top: 1.6mm; font-size: 8.5pt; color: ${T.muted}; }
  .doc-sub .no { font-family: ${SERIF}; font-style: italic; color: ${T.forest}; }

  .mast-rule { margin-top: 6mm; border-top: 0.75pt solid ${T.night}; }
  .mast-rule-2 { margin-top: 0.8mm; border-top: 0.25pt solid ${T.hairlineDark}; }

  /* ── parties ── */
  .parties { display: flex; margin-top: 10mm; }
  .col { flex: 1.15; min-width: 0; padding-right: 8mm; }
  .col + .col { border-left: 0.5pt solid ${T.hairline}; padding-left: 8mm; }
  .col:last-child { flex: 0.9; }
  .col:last-child { padding-right: 0; }
  .col .caps { display: block; margin-bottom: 2.6mm; }
  .name { font-family: ${SERIF}; font-size: 12.5pt; color: ${T.night}; line-height: 1.3; }
  .line { font-size: 8.6pt; color: ${T.muted}; margin-top: 1.1mm; }
  .line b { color: ${T.ink}; font-weight: 600; }
  .detail-row { display: flex; justify-content: space-between; margin-top: 1.1mm; font-size: 8.8pt; }
  .detail-row .dl { color: ${T.faint}; }
  .detail-row .dv { color: ${T.ink}; text-align: right; }

  /* ── doctor line ── */
  .doctor {
    margin-top: 11mm;
    border-top: 0.5pt solid ${T.hairline};
    border-bottom: 0.5pt solid ${T.hairline};
    padding: 3.4mm 0;
    display: flex; align-items: baseline; gap: 5mm;
  }
  .doctor .caps { white-space: nowrap; }
  .doctor-name { font-family: ${SERIF}; font-size: 11pt; color: ${T.night}; white-space: nowrap; }
  .doctor-reg { font-size: 8.5pt; color: ${T.muted}; margin-left: auto; text-align: right; }

  /* ── items ── */
  .items { width: 100%; border-collapse: collapse; margin-top: 12mm; }
  .items thead th {
    padding: 0 0 2.8mm; text-align: left;
    font-size: 6.8pt; font-weight: 600; letter-spacing: 0.28em;
    text-transform: uppercase; color: ${T.forest};
    border-bottom: 0.75pt solid ${T.night};
  }
  .items thead th.num { text-align: right; }
  .td { padding: 4.6mm 0; border-bottom: 0.5pt solid ${T.hairline}; font-size: 10pt; vertical-align: baseline; }
  .td.desc { font-family: ${SERIF}; color: ${T.night}; font-size: 10.5pt; padding-right: 6mm; }
  .td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; color: ${T.ink}; font-size: 9.5pt; }
  .items th:nth-child(2), .td:nth-child(2) { width: 16mm; }
  .items th:nth-child(3), .td:nth-child(3) { width: 32mm; }
  .items th:nth-child(4), .td:nth-child(4) { width: 32mm; }

  /* ── totals + stamp ── */
  .settle { display: flex; margin-top: 9mm; align-items: flex-start; }
  .stamp-zone { flex: 1; display: flex; align-items: center; padding-top: 3mm; }
  .stamp {
    display: inline-block; transform: rotate(-5deg);
    border: 1.2pt solid ${stamp.color}; border-radius: 1.6mm;
    padding: 2.2mm 5mm 2mm; opacity: 0.85;
  }
  .stamp-inner {
    font-size: 10.5pt; font-weight: 700; letter-spacing: 0.34em;
    text-transform: uppercase; color: ${stamp.color}; line-height: 1.2;
  }
  .stamp-date {
    font-size: 6.5pt; letter-spacing: 0.18em; text-transform: uppercase;
    color: ${stamp.color}; margin-top: 0.6mm; text-align: center;
  }

  .totals { width: 80mm; }
  .trow { display: flex; justify-content: space-between; padding: 1.7mm 0; font-size: 9.5pt; }
  .trow .tl { color: ${T.muted}; }
  .trow .tv { font-variant-numeric: tabular-nums; }
  .tnote { font-size: 7pt; color: ${T.faint}; text-align: right; padding-bottom: 2.4mm; }
  .grand {
    border-top: 0.75pt solid ${T.night};
    display: flex; justify-content: space-between; align-items: baseline;
    padding-top: 3mm; margin-top: 0.5mm; position: relative;
  }
  .grand::before {
    content: ""; position: absolute; top: 1.1mm; left: 0; right: 0;
    border-top: 0.25pt solid ${T.hairlineDark};
  }
  .grand .gl { font-size: 6.8pt; font-weight: 600; letter-spacing: 0.28em; text-transform: uppercase; color: ${T.forest}; }
  .grand .gv {
    font-family: ${SERIF}; font-size: 19pt; color: ${T.night};
    font-variant-numeric: tabular-nums; letter-spacing: 0.01em;
  }
  .paid-line { text-align: right; font-size: 8.2pt; color: ${T.muted}; margin-top: 2.6mm; font-style: italic; font-family: ${SERIF}; }

  .ref { font-size: 7.6pt; color: ${T.faint}; margin-top: 12mm; }
  .ref b { color: ${T.muted}; font-weight: 600; }

  /* ── footer ── */
  .foot { position: absolute; left: 19mm; right: 19mm; bottom: 12mm; }
  .foot-rule { border-top: 0.5pt solid ${T.hairline}; margin-bottom: 3.4mm; }
  .legal { font-size: 6.8pt; color: ${T.faint}; line-height: 1.65; }
  .foot-brand {
    margin-top: 4mm; display: flex; justify-content: space-between; align-items: baseline;
  }
  .foot-brand .brand {
    font-size: 7pt; font-weight: 600; letter-spacing: 0.3em;
    text-transform: uppercase; color: ${T.forest};
  }
  .foot-brand .tag { font-family: ${SERIF}; font-style: italic; font-size: 8pt; color: ${T.faint}; }
</style>
</head>
<body>
<div class="page">

  <div class="mast">
    <img class="logo" src="${logoDataUrl}" alt="Global Health" />
    <div class="mast-right">
      <div class="doc-title">${esc(docTitle)}</div>
      <div class="doc-sub"><span class="no">Nº ${esc(data.invoiceNumber)}</span> &nbsp;·&nbsp; Issued ${fmtDate(data.invoiceDate)}</div>
    </div>
  </div>
  <div class="mast-rule"></div>
  <div class="mast-rule-2"></div>

  <div class="parties">
    <div class="col">
      <span class="caps caps-forest">From</span>
      <div class="name">${L.company}</div>
      <div class="line">Registered in Ireland</div>
      <div class="line">CRO No. 910267</div>
      <div class="line">6-9 Trinity Street, Dublin 2</div>
      <div class="line">D02 EY47, Ireland</div>
      <div class="line">${L.email}</div>
    </div>
    <div class="col">
      <span class="caps caps-forest">Billed to</span>
      <div class="name">${esc(order.fullName)}</div>
      <div class="line">${esc(order.email)}</div>
      ${order.phone ? `<div class="line">${esc(order.phone)}</div>` : ""}
      ${order.taxIdNumber ? `<div class="line">Tax ID — <b>${esc(order.taxIdNumber)}</b></div>` : ""}
    </div>
    <div class="col">
      <span class="caps caps-forest">Details</span>
      ${order.consultationDate ? `<div class="detail-row"><span class="dl">Consultation</span><span class="dv">${fmtDate(order.consultationDate)}</span></div>` : ""}
      ${!isUnpaid && order.paidAt ? `<div class="detail-row"><span class="dl">${isCreditNote ? "Refund date" : "Payment date"}</span><span class="dv">${fmtDate(order.paidAt)}</span></div>` : ""}
      <div class="detail-row"><span class="dl">Currency</span><span class="dv">${esc(cur)}</span></div>
      <div class="detail-row"><span class="dl">Reference</span><span class="dv">${esc(data.invoiceNumber)}</span></div>
    </div>
  </div>

  ${
    data.doctor
      ? `<div class="doctor">
          <span class="caps caps-forest">Attending doctor</span>
          <span class="doctor-name">${esc(data.doctor.fullName)}</span>
          <span class="doctor-reg">${data.doctor.chamberEntity ? `${esc(data.doctor.chamberEntity)} · ` : ""}${data.doctor.registrationNumber ? `Reg. ${esc(data.doctor.registrationNumber)}` : ""}</span>
        </div>`
      : ""
  }

  <table class="items">
    <thead>
      <tr>
        <th>Description</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="settle">
    <div class="stamp-zone">
      <div class="stamp">
        <div class="stamp-inner">${stamp.label}</div>
        <div class="stamp-date">${fmtDate(stampDate)}</div>
      </div>
    </div>
    <div class="totals">
      <div class="trow"><span class="tl">Subtotal</span><span class="tv">${fmtMoney(order.subtotalCents, cur)}</span></div>
      ${order.shippingCents > 0 ? `<div class="trow"><span class="tl">Shipping</span><span class="tv">${fmtMoney(order.shippingCents, cur)}</span></div>` : ""}
      <div class="trow"><span class="tl">VAT (0%)</span><span class="tv">${fmtMoney(0, cur)}</span></div>
      <div class="tnote">${L.vatNote}</div>
      <div class="grand">
        <span class="gl">${isCreditNote ? "Total refunded" : "Total"}</span>
        <span class="gv">${fmtMoney(order.totalCents, cur)}</span>
      </div>
      ${
        !isUnpaid && order.paidAt
          ? `<div class="paid-line">${isCreditNote ? "Refund issued" : "Settled in full"}, ${fmtDate(order.paidAt)}</div>`
          : ""
      }
    </div>
  </div>

  <div class="ref">Please quote reference <b>${esc(data.invoiceNumber)}</b> in any correspondence.</div>

  <div class="foot">
    <div class="foot-rule"></div>
    <div class="legal">${esc(L.legalFooter)}</div>
    <div class="foot-brand">
      <span class="brand">Global Health</span>
      <span class="tag">${L.tagline} — ${L.website}</span>
    </div>
  </div>

</div>
</body>
</html>`;
}
