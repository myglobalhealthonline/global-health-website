import { prisma } from "../../db/prisma.js";
import { htmlToPdfBuffer } from "../generated-documents/html-document-renderer.js";
import { PDF_TOKENS as T, PDF_SANS, PDF_SERIF, pdfLogoDataUrl, pdfEcgRule } from "../../lib/pdf/brand.js";

// ── i18n labels ───────────────────────────────────────────────────────────────

/**
 * Keyed by the ORDER's country — i.e. where the consultation took place. That key
 * picks BOTH the language and the issuing entity shown in the invoice header:
 *
 *   cz            → the Czech company (IČO 19071680 / DIČ CZ19071680).
 *   ie / es / ro  → the Ireland branch (CRO 910267), invoicing on behalf of those
 *                   markets until their local branch registrations complete. Their
 *                   `company`/`address` are the Ireland issuer translated, NOT a
 *                   local entity — do not "localise" them to the market's country.
 *
 * Keys MUST match `Country.code` as stored in the DB (ie, cz, es, ro, pt). The
 * Spanish/Romanian sets were once keyed "sp"/"rm" (legacy Wix-era aliases), which
 * match no real order — those invoices silently fell back to `ie`, i.e. English.
 */
const INVOICE_LABELS: Record<string, Record<string, string>> = {
  ie: {
    invoice: "Invoice",
    receipt: "Receipt",
    invoiceReceipt: "Invoice / Receipt",
    creditNote: "Credit Note",
    refunded: "REFUNDED",
    cancelled: "CANCELLED",
    unpaid: "UNPAID",
    amountDue: "Amount due",
    from: "From",
    billTo: "Billed to",
    description: "Description",
    qty: "Qty",
    unit: "Unit price",
    total: "Total",
    paid: "PAID",
    doctor: "Attending Doctor",
    reg: "Registration No.",
    company: "Global Health · Registered in Ireland · CRO No. 910267",
    address: "6-9 Trinity Street, Dublin 2, D02 EY47, Ireland",
    taxId: "Tax ID",
    consultationDate: "Consultation date",
    invoiceRef: "Invoice reference",
    legalFooter: "Healthcare services exempt from VAT under the Value-Added Tax Consolidation Act 2010, Section 61 and Schedule 1, Paragraph 23.\n\nTerms\nGlobal Health is a trading name registered under Global Guest. All transactions conducted under the Global Health brand are legally processed under the business registration and tax details of Global Guest.",
    locale: "en-IE",
    fiscalDocument: "Fiscal document",
    issued: "Issued",
    subtotal: "Subtotal",
    vat: "VAT (0%)",
    vatNote: "VAT exempt — healthcare services, VATCA 2010 s.61, Sch.1 ¶23",
    shipping: "Shipping",
    totalRefunded: "Total refunded",
    totalCredited: "Total credited",
    settledInFull: "Settled in full",
    refundIssued: "Refund issued",
    invoiceCancelled: "Invoice cancelled — no payment was taken",
    quoteRef: "Please quote this reference in any correspondence.",
    tagline: "Medicine Anytime Anywhere",
  },
  cz: {
    invoice: "Faktura",
    receipt: "Účtenka",
    invoiceReceipt: "Faktura / Účtenka",
    creditNote: "Dobropis",
    refunded: "VRÁCENO",
    cancelled: "STORNOVÁNO",
    unpaid: "NEZAPLACENO",
    amountDue: "K úhradě",
    from: "Od",
    billTo: "Fakturováno",
    description: "Popis",
    qty: "Množství",
    unit: "Jedn. cena",
    total: "Celkem",
    paid: "ZAPLACENO",
    doctor: "Ošetřující lékař",
    reg: "Registrační číslo",
    company: "Global Health · Registrováno v Česku · IČO 19071680 · DIČ CZ19071680",
    address: "Česko",
    taxId: "DIČ",
    consultationDate: "Datum konzultace",
    invoiceRef: "Číslo faktury",
    locale: "cs-CZ",
    fiscalDocument: "Daňový doklad",
    issued: "Vystaveno",
    subtotal: "Mezisoučet",
    vat: "DPH (0 %)",
    vatNote: "Osvobozeno od DPH — zdravotní služby",
    shipping: "Doprava",
    totalRefunded: "Vráceno celkem",
    totalCredited: "Dobropisováno celkem",
    settledInFull: "Uhrazeno v plné výši",
    refundIssued: "Vráceno dne",
    invoiceCancelled: "Faktura stornována — platba nebyla přijata",
    quoteRef: "Toto číslo prosím uvádějte při veškeré komunikaci.",
    tagline: "Medicine Anytime Anywhere",
    legalFooter: "Osvobození od DPH\nZdravotní služby jsou osvobozeny od DPH v souladu se zákonem č. 235/2004 Sb., o dani z přidané hodnoty, § 58 (osvobození zdravotních služeb).\n\nPodmínky\nGlobal Health je obchodní značka společnosti Global Guest. Veškeré transakce prováděné pod značkou Global Health jsou právně zpracovávány v rámci obchodní registrace a daňových údajů společnosti Global Guest.\n\nGlobal Health je obchodní značkou společnosti Global Guest s.r.o., poskytovatele zdravotních služeb zapsaného v Národním registru poskytovatelů zdravotních služeb (NRPZS) pod registračním číslem 19071680.",
  },
  es: {
    invoice: "Factura",
    receipt: "Recibo",
    invoiceReceipt: "Factura / Recibo",
    creditNote: "Nota de crédito",
    refunded: "REEMBOLSADO",
    cancelled: "ANULADA",
    unpaid: "NO PAGADO",
    amountDue: "Importe pendiente",
    from: "De",
    billTo: "Facturado a",
    description: "Descripción",
    qty: "Cant.",
    unit: "Precio unitario",
    total: "Total",
    paid: "PAGADO",
    doctor: "Médico",
    reg: "Número de colegiado",
    company: "Global Health · Registrado en Irlanda · N.º CRO 910267",
    address: "Irlanda",
    taxId: "NIF",
    consultationDate: "Fecha de consulta",
    invoiceRef: "Referencia de factura",
    locale: "es-ES",
    fiscalDocument: "Documento fiscal",
    issued: "Emitida",
    subtotal: "Subtotal",
    vat: "IVA (0 %)",
    vatNote: "Exento de IVA — servicios sanitarios",
    shipping: "Envío",
    totalRefunded: "Total reembolsado",
    totalCredited: "Total abonado",
    settledInFull: "Pagado en su totalidad",
    refundIssued: "Reembolso emitido",
    invoiceCancelled: "Factura anulada — no se realizó ningún pago",
    quoteRef: "Indique esta referencia en cualquier comunicación.",
    tagline: "Medicine Anytime Anywhere",
    legalFooter: "Los servicios sanitarios están exentos de IVA de conformidad con la Ley de Consolidación del Impuesto sobre el Valor Añadido de 2010, Sección 61 y Anexo 1, Párrafo 23. El IVA no es aplicable, ya que el proveedor aún no está registrado a efectos de IVA en Irlanda, de acuerdo con la Ley de Consolidación del IVA de 2010.\n\nTérminos\nGlobal Health es un nombre comercial registrado bajo Global Guest. Todas las transacciones realizadas bajo la marca Global Health se procesan legalmente conforme al registro comercial y a los datos fiscales de Global Guest.",
  },
  ro: {
    invoice: "Factură",
    receipt: "Chitanță",
    invoiceReceipt: "Factură / Chitanță",
    creditNote: "Notă de credit",
    refunded: "RAMBURSAT",
    cancelled: "ANULATĂ",
    unpaid: "NEACHITAT",
    amountDue: "De plată",
    from: "De la",
    billTo: "Facturat către",
    description: "Descriere",
    qty: "Cant.",
    unit: "Preț unitar",
    total: "Total",
    paid: "ACHITAT",
    doctor: "Medic curant",
    reg: "Număr înregistrare",
    company: "Global Health · Înregistrată în Irlanda · CRO Nr. 910267",
    address: "Irlanda",
    taxId: "CUI",
    consultationDate: "Data consultației",
    invoiceRef: "Referință factură",
    locale: "ro-RO",
    fiscalDocument: "Document fiscal",
    issued: "Emisă",
    subtotal: "Subtotal",
    vat: "TVA (0 %)",
    vatNote: "Scutit de TVA — servicii medicale",
    shipping: "Livrare",
    totalRefunded: "Total rambursat",
    totalCredited: "Total creditat",
    settledInFull: "Achitat integral",
    refundIssued: "Rambursare emisă",
    invoiceCancelled: "Factură anulată — nu a fost efectuată nicio plată",
    quoteRef: "Vă rugăm să menționați această referință în orice corespondență.",
    tagline: "Medicine Anytime Anywhere",
    legalFooter: "Serviciile de sănătate sunt scutite de TVA conform Legii consolidării TVA din 2010, Secțiunea 61 și Anexa 1, Paragraful 23. TVA-ul nu se aplică, deoarece furnizorul nu este încă înregistrat pentru TVA în Irlanda, conform Legii consolidării TVA din 2010.\n\nTermeni\nGlobal Health este un nume comercial înregistrat sub Global Guest. Toate tranzacțiile efectuate sub marca Global Health sunt procesate legal în baza înregistrării comerciale și a detaliilor fiscale ale Global Guest.",
  },
  pt: {
    invoice: "Fatura",
    receipt: "Recibo",
    invoiceReceipt: "Fatura / Recibo",
    creditNote: "Nota de crédito",
    refunded: "REEMBOLSADO",
    cancelled: "ANULADA",
    unpaid: "NÃO PAGO",
    amountDue: "Valor em dívida",
    from: "De",
    billTo: "Faturado a",
    description: "Descrição",
    qty: "Qtd.",
    unit: "Preço unit.",
    total: "Total",
    paid: "PAGO",
    doctor: "Médico",
    reg: "Número de registo médico",
    company: "Global Health · Registada na Irlanda · N.º CRO 910267",
    address: "Irlanda",
    taxId: "NIF",
    consultationDate: "Data da consulta",
    invoiceRef: "Referência da fatura",
    locale: "pt-PT",
    fiscalDocument: "Documento fiscal",
    issued: "Emitida",
    subtotal: "Subtotal",
    vat: "IVA (0 %)",
    vatNote: "Isento de IVA — serviços de saúde",
    shipping: "Envio",
    totalRefunded: "Total reembolsado",
    totalCredited: "Total creditado",
    settledInFull: "Pago na totalidade",
    refundIssued: "Reembolso emitido",
    invoiceCancelled: "Fatura anulada — não foi efetuado qualquer pagamento",
    quoteRef: "Indique esta referência em qualquer comunicação.",
    tagline: "Medicine Anytime Anywhere",
    legalFooter: "Os serviços de saúde estão isentos de IVA nos termos da Lei de Consolidação do Imposto sobre o Valor Acrescentado de 2010, Secção 61 e Anexo 1, Parágrafo 23.\n\nCondições\nA Global Health é uma marca comercial registada sob a Global Guest. Todas as transações realizadas sob a marca Global Health são legalmente processadas ao abrigo do registo comercial e dos dados fiscais da Global Guest.\n\nA Global Health é uma marca comercial da Global Guest s.r.o., entidade prestadora de cuidados de saúde registada na Entidade Reguladora da Saúde (ERS) sob o número 179287.",
  },
  /**
   * Brazil — Portuguese (pt-BR), invoiced by the Ireland branch exactly like
   * es/ro. Deliberately NOT a copy of `pt`: that set's footer cites Portugal's
   * ERS registration, which says nothing about a Brazilian consultation.
   */
  br: {
    invoice: "Fatura",
    receipt: "Recibo",
    invoiceReceipt: "Fatura / Recibo",
    creditNote: "Nota de crédito",
    refunded: "REEMBOLSADO",
    cancelled: "CANCELADA",
    unpaid: "NÃO PAGO",
    amountDue: "Valor devido",
    from: "De",
    billTo: "Faturado para",
    description: "Descrição",
    qty: "Qtd.",
    unit: "Preço unit.",
    total: "Total",
    paid: "PAGO",
    doctor: "Médico responsável",
    reg: "Número de registro médico",
    company: "Global Health · Registrada na Irlanda · N.º CRO 910267",
    address: "Irlanda",
    taxId: "CPF",
    consultationDate: "Data da consulta",
    invoiceRef: "Referência da fatura",
    locale: "pt-BR",
    fiscalDocument: "Documento fiscal",
    issued: "Emitida",
    subtotal: "Subtotal",
    vat: "IVA (0 %)",
    vatNote: "Isento de IVA — serviços de saúde",
    shipping: "Frete",
    totalRefunded: "Total reembolsado",
    totalCredited: "Total creditado",
    settledInFull: "Pago integralmente",
    refundIssued: "Reembolso emitido",
    invoiceCancelled: "Fatura cancelada — nenhum pagamento foi efetuado",
    quoteRef: "Por favor, mencione esta referência em qualquer comunicação.",
    tagline: "Medicine Anytime Anywhere",
    legalFooter: "Os serviços de saúde são isentos de IVA nos termos da Lei de Consolidação do Imposto sobre o Valor Agregado de 2010, Seção 61 e Anexo 1, Parágrafo 23. O IVA não se aplica, uma vez que o prestador ainda não está registrado para fins de IVA na Irlanda, nos termos da Lei de Consolidação do IVA de 2010.\n\nTermos\nA Global Health é um nome comercial registrado sob a Global Guest. Todas as transações realizadas sob a marca Global Health são processadas legalmente de acordo com o registro comercial e os dados fiscais da Global Guest.",
  },
};

function getL(countryCode: string) {
  return INVOICE_LABELS[countryCode.toLowerCase()] ?? INVOICE_LABELS.ie;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type InvoiceDocumentType = "INVOICE" | "RECEIPT" | "INVOICE_RECEIPT" | "CREDIT_NOTE";

/**
 * Why a CREDIT_NOTE exists — drives its badge + totals wording. A CANCELLATION
 * credit note voids an unpaid invoice, so it must never say "refunded": no money
 * was ever taken. Ignored for non-credit-note documents.
 */
export type CreditNoteReason = "REFUND" | "CANCELLATION";

export interface InvoicePdfData {
  invoiceNumber: string;
  invoiceDate: string; // ISO
  countryCode: string;
  /** Drives the title + paid/unpaid badge. Defaults to INVOICE_RECEIPT. */
  documentType: InvoiceDocumentType;
  /** CREDIT_NOTE only. Defaults to REFUND — the original credit-note cause. */
  creditNoteReason?: CreditNoteReason | null;
  order: {
    fullName: string;
    email: string;
    phone?: string | null;
    currencyCode: string;
    totalCents: number;
    subtotalCents: number;
    shippingCents: number;
    paidAt?: string | null;
    taxIdNumber?: string | null;
    consultationDate?: string | null;
    items: { name: string; quantity: number; unitPriceCents: number; lineTotalCents: number }[];
  };
  doctor?: {
    fullName: string;
    registrationNumber?: string | null;
    chamberEntity?: string | null;
  } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtMoney(cents: number, currency: string, locale = "en-IE"): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

function fmtDate(iso: string, locale = "en-IE"): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ── HTML builder — Variant K design (approved 2026-07-09) ───────────────────

export function buildInvoiceHtml(data: InvoicePdfData): string {
  const L = getL(data.countryCode);
  const loc = L.locale ?? "en-IE";
  const { order } = data;
  const cur = order.currencyCode;
  const logo = pdfLogoDataUrl();

  const isCreditNote = data.documentType === "CREDIT_NOTE";
  const isCancellationNote = isCreditNote && data.creditNoteReason === "CANCELLATION";
  const isUnpaid = data.documentType === "INVOICE";
  const docTitle = isCreditNote
    ? L.creditNote
    : data.documentType === "RECEIPT"
      ? L.receipt
      : data.documentType === "INVOICE_RECEIPT"
        ? L.invoiceReceipt
        : L.invoice;
  const statusLabel = isCancellationNote
    ? L.cancelled
    : isCreditNote
      ? L.refunded
      : isUnpaid
        ? L.unpaid
        : L.paid;

  const itemRows = order.items
    .map(
      (i, idx) => `
      <tr>
        <td class="td idx">${String(idx + 1).padStart(2, "0")}</td>
        <td class="td desc">${esc(i.name)}</td>
        <td class="td num">${i.quantity}</td>
        <td class="td num">${fmtMoney(i.unitPriceCents, cur, loc)}</td>
        <td class="td num strong">${fmtMoney(i.lineTotalCents, cur, loc)}</td>
      </tr>`,
    )
    .join("");

  const legalFooterHtml = L.legalFooter
    .split("\n\n")
    .map((para) => `<p style="margin:0 0 1.4mm;">${esc(para).replace(/\n/g, "<br>")}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="${loc.split("-")[0]}">
<head>
<meta charset="UTF-8">
<title>${esc(docTitle)} ${esc(data.invoiceNumber)}</title>
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
  .mast-no { font-size: 9pt; font-weight: 700; letter-spacing: 0.2em; color: ${T.forest}; }
  .mast-issued { font-size: 8.6pt; color: ${T.muted}; }
  .mast-status { font-size: 7pt; font-weight: 700; letter-spacing: 0.26em; text-transform: uppercase;
    color: ${T.night}; border-bottom: 1.6pt solid ${T.lime}; padding-bottom: 0.8mm; }
  .ecg { margin-top: 7mm; }

  .parties { display: flex; gap: 11mm; margin-top: 9mm; }
  .party { flex: 1; min-width: 0; }
  .party .caps { display: block; margin-bottom: 2mm; }
  .party .n { font-family: ${PDF_SERIF}; font-size: 12pt; color: ${T.night}; }
  .party .l { font-size: 8.6pt; color: ${T.muted}; margin-top: 0.9mm; }
  .party.dr .n { font-size: 11pt; }

  .items { width: 100%; border-collapse: collapse; margin-top: 10mm; }
  .items th { text-align: left; padding: 0 0 2.4mm;
    font-size: 6.6pt; font-weight: 600; letter-spacing: 0.28em; text-transform: uppercase; color: ${T.forest};
    border-bottom: 1pt solid ${T.night}; }
  .items th.num { text-align: right; }
  .td { padding: 4.2mm 0; border-bottom: 0.4pt solid ${T.hairline}; }
  .td.idx { width: 10mm; font-size: 8pt; color: ${T.faint}; font-variant-numeric: tabular-nums; }
  .td.desc { font-family: ${PDF_SERIF}; font-size: 10.5pt; color: ${T.night}; padding-right: 8mm; }
  .td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; font-size: 9.5pt; color: ${T.muted}; }
  .td.strong { color: ${T.night}; }
  .items th:nth-child(3), .td:nth-child(3) { width: 14mm; }
  .items th:nth-child(4), .td:nth-child(4) { width: 30mm; }
  .items th:nth-child(5), .td:nth-child(5) { width: 30mm; }

  .settle { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 8mm; }
  .settle-left { font-size: 8.2pt; color: ${T.faint}; max-width: 66mm; }
  .settle-left b { color: ${T.muted}; }
  .totals { width: 84mm; }
  .trow { display: flex; justify-content: space-between; padding: 1.5mm 0; font-size: 9pt; color: ${T.muted}; }
  .trow .tv { font-variant-numeric: tabular-nums; color: ${T.ink}; }
  .tnote { font-size: 6.8pt; color: ${T.faint}; text-align: right; padding: 0.4mm 0 2.6mm; }
  .grand { border-top: 1pt solid ${T.night}; padding-top: 2.6mm;
    display: flex; justify-content: space-between; align-items: baseline; }
  .grand .gl { font-size: 6.8pt; font-weight: 600; letter-spacing: 0.28em; text-transform: uppercase; color: ${T.forest}; }
  .grand .gv { font-family: ${PDF_SERIF}; font-style: italic; font-size: 24pt; color: ${T.night}; letter-spacing: -0.01em; }
  .settled { text-align: right; font-size: 8.2pt; color: ${T.muted}; margin-top: 1.6mm; }

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
    <span class="caps">${L.fiscalDocument} — ${esc(data.invoiceNumber)}</span>
  </div>

  <div class="masthead">
    <div class="mast-title">${esc(docTitle)}</div>
    <div class="mast-sub">
      <span class="mast-no">Nº ${esc(data.invoiceNumber)}</span>
      <span class="mast-issued">${L.issued} ${fmtDate(data.invoiceDate, loc)}</span>
      <span class="mast-status">${statusLabel}${!isUnpaid && order.paidAt ? ` · ${fmtDate(order.paidAt, loc)}` : ""}</span>
    </div>
    <div class="ecg">${pdfEcgRule()}</div>
  </div>

  <div class="parties">
    <div class="party">
      <span class="caps">${L.from}</span>
      <div class="n">Global Health</div>
      ${L.company
        .split("·")
        .slice(1)
        .map((part) => `<div class="l">${esc(part.trim())}</div>`)
        .join("")}
      <div class="l">${esc(L.address)}</div>
      <div class="l">globalhealth@myglobalhealth.online</div>
    </div>
    <div class="party">
      <span class="caps">${L.billTo}</span>
      <div class="n">${esc(order.fullName)}</div>
      <div class="l">${esc(order.email)}</div>
      ${order.phone ? `<div class="l">${esc(order.phone)}</div>` : ""}
      ${order.taxIdNumber ? `<div class="l">${L.taxId} ${esc(order.taxIdNumber)}</div>` : ""}
    </div>
    ${
      data.doctor
        ? `<div class="party dr">
            <span class="caps">${L.doctor}</span>
            <div class="n">${esc(data.doctor.fullName)}</div>
            ${data.doctor.chamberEntity ? `<div class="l">${esc(data.doctor.chamberEntity)}</div>` : ""}
            ${data.doctor.registrationNumber ? `<div class="l">${L.reg} ${esc(data.doctor.registrationNumber)}</div>` : ""}
            ${order.consultationDate ? `<div class="l">${L.consultationDate}: ${fmtDate(order.consultationDate, loc)}</div>` : ""}
          </div>`
        : order.consultationDate
          ? `<div class="party dr">
              <span class="caps">${L.consultationDate}</span>
              <div class="l" style="margin-top:2mm">${fmtDate(order.consultationDate, loc)}</div>
            </div>`
          : ""
    }
  </div>

  <table class="items">
    <thead><tr><th>Nº</th><th>${L.description}</th><th class="num">${L.qty}</th><th class="num">${L.unit}</th><th class="num">${L.total}</th></tr></thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="settle">
    <div class="settle-left">${L.invoiceRef} <b>${esc(data.invoiceNumber)}</b> · ${L.quoteRef}</div>
    <div class="totals">
      <div class="trow"><span>${L.subtotal}</span><span class="tv">${fmtMoney(order.subtotalCents, cur, loc)}</span></div>
      ${order.shippingCents > 0 ? `<div class="trow"><span>${L.shipping}</span><span class="tv">${fmtMoney(order.shippingCents, cur, loc)}</span></div>` : ""}
      <div class="trow"><span>${L.vat}</span><span class="tv">${fmtMoney(0, cur, loc)}</span></div>
      <div class="tnote">${esc(L.vatNote)}</div>
      <div class="grand"><span class="gl">${isCancellationNote ? L.totalCredited : isCreditNote ? L.totalRefunded : L.total}</span><span class="gv">${fmtMoney(order.totalCents, cur, loc)}</span></div>
      ${
        isCancellationNote
          ? // Nothing was ever paid, so there is no paidAt to date this by — the
            // credit note's own issue date is the cancellation date.
            `<div class="settled">${L.invoiceCancelled} · ${fmtDate(data.invoiceDate, loc)}</div>`
          : !isUnpaid && order.paidAt
            ? `<div class="settled">${isCreditNote ? L.refundIssued : L.settledInFull} · ${fmtDate(order.paidAt, loc)}</div>`
            : isUnpaid
              ? `<div class="settled">${L.amountDue}: ${fmtMoney(order.totalCents, cur, loc)}</div>`
              : ""
      }
    </div>
  </div>

  <div class="foot">
    <div class="foot-rule"></div>
    <div class="legal">${legalFooterHtml}</div>
    <div class="fb"><span class="b">Global Health</span><span class="t">${L.tagline} — myglobalhealth.online</span></div>
  </div>

</div>
</body>
</html>`;
}

export async function renderInvoicePdfBuffer(data: InvoicePdfData): Promise<Buffer | null> {
  try {
    const html = buildInvoiceHtml(data);
    return await htmlToPdfBuffer(html);
  } catch {
    return null;
  }
}

// ── Data fetcher ──────────────────────────────────────────────────────────────

export async function buildInvoicePdfData(
  orderId: string,
  invoiceNumber: string,
  invoiceDate: string,
  documentType: InvoiceDocumentType = "INVOICE_RECEIPT",
  creditNoteReason: CreditNoteReason | null = null,
): Promise<InvoicePdfData | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      fullName: true,
      email: true,
      phone: true,
      countryCode: true,
      currencyCode: true,
      totalCents: true,
      subtotalCents: true,
      shippingCents: true,
      paidAt: true,
      items: {
        select: {
          name: true,
          quantity: true,
          unitPriceCents: true,
          lineTotalCents: true,
          doctorId: true,
          appointmentId: true,
          kind: true,
        },
      },
    },
  });
  if (!order) return null;

  const profile = await prisma.patientProfile.findUnique({
    where: { email: order.email.toLowerCase() },
    select: { taxIdNumber: true },
  });

  const consultItem = order.items.find(
    (i) =>
      (i.kind === "GENERAL_CONSULTATION" || i.kind === "SPECIALIST_CONSULTATION") && i.doctorId,
  );

  let consultationDate: string | null = null;
  if (consultItem?.appointmentId) {
    const appt = await prisma.appointment.findUnique({
      where: { id: consultItem.appointmentId },
      select: { scheduledAt: true },
    });
    consultationDate = appt?.scheduledAt?.toISOString() ?? null;
  }

  let doctor: InvoicePdfData["doctor"] = null;
  if (consultItem?.doctorId) {
    const doctorRow = await prisma.doctor.findUnique({
      where: { id: consultItem.doctorId },
      select: {
        fullName: true,
        country: { select: { code: true } },
        additionalCountries: {
          select: {
            registrationNumber: true,
            chamberEntity: true,
            country: { select: { code: true } },
          },
        },
      },
    });
    if (doctorRow) {
      const cc = order.countryCode.toLowerCase();
      const allRegs = [
        {
          code: doctorRow.country.code.toLowerCase(),
          registrationNumber: null as string | null,
          chamberEntity: null as string | null,
        },
        ...doctorRow.additionalCountries.map((dc) => ({
          code: dc.country.code.toLowerCase(),
          registrationNumber: dc.registrationNumber,
          chamberEntity: dc.chamberEntity,
        })),
      ];
      const matched = allRegs.find((r) => r.code === cc);
      let regNumber = matched?.registrationNumber ?? null;
      let chamberEntity = matched?.chamberEntity ?? null;
      if (!regNumber) {
        const dc = await prisma.doctorCountry.findFirst({
          where: {
            doctorId: consultItem.doctorId,
            country: { code: { equals: cc, mode: "insensitive" } },
          },
          select: { registrationNumber: true, chamberEntity: true },
        });
        regNumber = dc?.registrationNumber ?? null;
        chamberEntity = dc?.chamberEntity ?? null;
      }
      doctor = { fullName: doctorRow.fullName, registrationNumber: regNumber, chamberEntity };
    }
  }

  return {
    invoiceNumber,
    invoiceDate,
    countryCode: order.countryCode,
    documentType,
    creditNoteReason,
    order: {
      fullName: order.fullName,
      email: order.email,
      phone: order.phone,
      currencyCode: order.currencyCode,
      totalCents: order.totalCents,
      subtotalCents: order.subtotalCents,
      shippingCents: order.shippingCents,
      paidAt: order.paidAt?.toISOString() ?? null,
      taxIdNumber: profile?.taxIdNumber ?? null,
      consultationDate,
      items: order.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unitPriceCents: i.unitPriceCents,
        lineTotalCents: i.lineTotalCents,
      })),
    },
    doctor,
  };
}
