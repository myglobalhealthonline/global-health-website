import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { buildPublicMetadata } from "@/lib/seo/page-seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPublicMetadata({
  path: "/print/order-invoices",
  title: "Printable invoice or receipt",
  description: "Secure printable billing document from Global Health.",
  kind: "page",
  noindex: true,
});

type Params = { invoiceId: string };

// ── Inline i18n ──────────────────────────────────────────────────────────────

const LABELS: Record<string, Record<string, string>> = {
  ie: {
    invoice: "Invoice",
    receipt: "Receipt",
    invoiceReceipt: "Invoice / Receipt",
    creditNote: "Credit Note",
    refunded: "REFUNDED",
    cancelled: "CANCELLED",
    unpaid: "UNPAID",
    invoiceRef: "Invoice reference",
    from: "From",
    billTo: "Billed to",
    description: "Description",
    qty: "Qty",
    unit: "Unit price",
    total: "Total",
    paid: "PAID",
    doctor: "Attending Doctor",
    reg: "Registration No.",
    footer: "Global Health · Medicine Anytime Anywhere",
    company: "Global Health · Registered in Ireland · CRO No. 910267",
    address: "6-9 Trinity Street, Dublin 2, D02 EY47, Ireland",
    taxId: "Tax ID",
    consultationDate: "Consultation date",
  },
  cz: {
    invoice: "Faktura",
    receipt: "Účtenka",
    invoiceReceipt: "Faktura / Účtenka",
    creditNote: "Dobropis",
    refunded: "VRÁCENO",
    cancelled: "STORNOVÁNO",
    unpaid: "NEZAPLACENO",
    invoiceRef: "Číslo faktury",
    from: "Od",
    billTo: "Fakturováno",
    description: "Popis",
    qty: "Množství",
    unit: "Jedn. cena",
    total: "Celkem",
    paid: "ZAPLACENO",
    doctor: "Ošetřující lékař",
    reg: "Registrační číslo",
    footer: "Global Health · Medicine Anytime Anywhere",
    company: "Global Health · Registrováno v Irsku · CRO č. 910267",
    address: "Irsko",
    taxId: "DIČ",
    consultationDate: "Datum konzultace",
  },
  // Keys MUST match `Country.code` as stored in the DB (ie, cz, es, ro, pt, br).
  // These were once keyed "sp"/"rm" — legacy Wix-era aliases that match no real
  // order, so Spanish, Romanian and Brazilian invoices all silently fell through
  // to the English set on this page. Same bug the backend hit in
  // lib/invoice-number.ts; see the comment there.
  es: {
    invoice: "Factura",
    receipt: "Recibo",
    invoiceReceipt: "Factura / Recibo",
    creditNote: "Nota de crédito",
    refunded: "REEMBOLSADO",
    cancelled: "ANULADA",
    unpaid: "NO PAGADO",
    invoiceRef: "Referencia de factura",
    from: "De",
    billTo: "Facturado a",
    description: "Descripción",
    qty: "Cant.",
    unit: "Precio unitario",
    total: "Total",
    paid: "PAGADO",
    doctor: "Médico",
    reg: "Número de colegiado",
    footer: "Global Health · Medicine Anytime Anywhere",
    company: "Global Health · Registrado en Irlanda · N.º CRO 910267",
    address: "Irlanda",
    taxId: "NIF",
    consultationDate: "Fecha de consulta",
  },
  ro: {
    invoice: "Factură",
    receipt: "Chitanță",
    invoiceReceipt: "Factură / Chitanță",
    creditNote: "Notă de credit",
    refunded: "RAMBURSAT",
    cancelled: "ANULATĂ",
    unpaid: "NEACHITAT",
    invoiceRef: "Referință factură",
    from: "De la",
    billTo: "Facturat către",
    description: "Descriere",
    qty: "Cant.",
    unit: "Preț unitar",
    total: "Total",
    paid: "ACHITAT",
    doctor: "Medic curant",
    reg: "Număr înregistrare",
    footer: "Global Health · Medicine Anytime Anywhere",
    company: "Global Health · Înregistrată în Irlanda · CRO Nr. 910267",
    address: "Irlanda",
    taxId: "CUI",
    consultationDate: "Data consultației",
  },
  pt: {
    invoice: "Fatura",
    receipt: "Recibo",
    invoiceReceipt: "Fatura / Recibo",
    creditNote: "Nota de crédito",
    refunded: "REEMBOLSADO",
    cancelled: "ANULADA",
    unpaid: "NÃO PAGO",
    invoiceRef: "Referência da fatura",
    from: "De",
    billTo: "Faturado a",
    description: "Descrição",
    qty: "Qtd.",
    unit: "Preço unit.",
    total: "Total",
    paid: "PAGO",
    doctor: "Médico",
    reg: "Número de registo médico",
    footer: "Global Health · Medicine Anytime Anywhere",
    company: "Global Health · Registada na Irlanda · N.º CRO 910267",
    address: "Irlanda",
    taxId: "NIF",
    consultationDate: "Data da consulta",
  },
  // Brazil — pt-BR. Deliberately not a copy of `pt`: different taxpayer id (CPF
  // vs NIF) and different vocabulary ("registro" not "registo").
  br: {
    invoice: "Fatura",
    receipt: "Recibo",
    invoiceReceipt: "Fatura / Recibo",
    creditNote: "Nota de crédito",
    refunded: "REEMBOLSADO",
    cancelled: "CANCELADA",
    unpaid: "NÃO PAGO",
    invoiceRef: "Referência da fatura",
    from: "De",
    billTo: "Faturado para",
    description: "Descrição",
    qty: "Qtd.",
    unit: "Preço unit.",
    total: "Total",
    paid: "PAGO",
    doctor: "Médico responsável",
    reg: "Número de registro médico",
    footer: "Global Health · Medicine Anytime Anywhere",
    company: "Global Health · Registrada na Irlanda · N.º CRO 910267",
    address: "Irlanda",
    taxId: "CPF",
    consultationDate: "Data da consulta",
    // Commission markets only — mirrors backend invoice-pdf.ts INVOICE_LABELS.br.
    commissionLine: "Comissão Global Health",
    commissionNote:
      "A Global Health atua como intermediária. Este documento refere-se exclusivamente à comissão de intermediação. Os honorários médicos são documentados pelo profissional responsável.",
  },
};

/** English fallbacks for a market switched into commission billing before its
 *  localised copy exists. Mirrors COMMISSION_FALLBACK in backend invoice-pdf.ts. */
const COMMISSION_FALLBACK = {
  commissionLine: "Global Health commission",
  commissionNote:
    "Global Health acts as an intermediary. This document covers the intermediation commission only. Medical fees are documented by the treating practitioner.",
} as const;

function getLabels(countryCode: string) {
  return LABELS[countryCode.toLowerCase()] ?? LABELS.ie;
}

// ── Money formatter ───────────────────────────────────────────────────────────

function fmtMoney(cents: number, currencyCode: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currencyCode}`;
  }
}

// ── Variant K design tokens (mirrors backend/src/lib/pdf/brand.ts) ──────────

const VK = {
  night: "#0F2E25",
  forest: "#1D4B36",
  ink: "#26332D",
  muted: "#66716A",
  faint: "#9AA49D",
  hairline: "#E4E7E0",
  hairlineDark: "#C9CFC7",
  paper: "#FFFFFF",
  ivory: "#F6F8F1",
  lime: "#B0F122",
};
const VK_SANS = `"Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif`;
const VK_SERIF = `Georgia, "Times New Roman", serif`;

/** ECG pulse rule — brand motif, mirrors backend/src/lib/pdf/brand.ts pdfEcgRule(). */
function EcgRule({ strokeColor = VK.night, limePeak = true }: { strokeColor?: string; limePeak?: boolean }) {
  return (
    <svg viewBox="0 0 600 24" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 10 }}>
      <path
        d="M0 12 H250 L262 12 L268 12 L274 4 L282 20 L288 12 L300 12 H600"
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.2}
      />
      {limePeak ? (
        <path
          d="M262 12 L268 12 L274 4 L282 20 L288 12 L294 12"
          fill="none"
          stroke={VK.lime}
          strokeWidth={1.6}
        />
      ) : null}
    </svg>
  );
}

// ── Data fetching ─────────────────────────────────────────────────────────────

type InvoiceDetail = {
  invoice: {
    id: string;
    invoiceNumber: string;
    countryCode: string;
    documentType: "INVOICE" | "RECEIPT" | "INVOICE_RECEIPT" | "CREDIT_NOTE";
    /** CREDIT_NOTE only — a cancellation note voids an unpaid invoice, nothing was refunded. */
    creditNoteReason: "REFUND" | "CANCELLATION" | null;
    generatedAt: string;
    emailSentAt: string | null;
  };
  order: {
    id: string;
    orderNumber: string | null;
    fullName: string;
    email: string;
    phone: string | null;
    countryCode: string;
    currencyCode: string;
    totalCents: number;
    subtotalCents: number;
    shippingCents: number;
    /** Commission market: bill the intermediation commission, not the amount
     *  charged. Decided server-side so this page and the PDF always agree. */
    commissionMode?: boolean;
    commissionTotalCents?: number | null;
    doctorPayoutTotalCents?: number | null;
    paymentStatus: string;
    paidAt: string | null;
    taxIdNumber: string | null;
    consultationDate: string | null;
    items: {
      id: string;
      kind: string;
      name: string;
      quantity: number;
      unitPriceCents: number;
      lineTotalCents: number;
      /** Commission markets: this line's share of the commission. */
      commissionCents?: number | null;
    }[];
  };
  doctor: {
    fullName: string;
    registrationNumber: string | null;
    chamberEntity: string | null;
  } | null;
};

/**
 * Reads the public billing endpoint, NOT /api/admin/invoices/:id. This page is
 * reached from the invoice link emailed to the patient, so it has to render for
 * whoever holds that link — the admin route 403s a doctor (which this page then
 * turned into a 404) and bounces the patient to /account, which is exactly the
 * bug this fixes.
 */
async function fetchInvoiceDetail(invoiceId: string): Promise<InvoiceDetail | null> {
  const backend = getBackendOrigin();
  if (!backend) return null;
  try {
    const res = await fetch(`${backend}/api/public/invoices/${encodeURIComponent(invoiceId)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { ok?: boolean; data?: InvoiceDetail };
    if (!json.ok || !json.data) return null;
    return json.data;
  } catch {
    return null;
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PrintOrderInvoicePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { invoiceId } = await params;
  const data = await fetchInvoiceDetail(invoiceId);
  if (!data) notFound();

  const { invoice, order, doctor } = data;
  const L = getLabels(invoice.countryCode);
  const currency = order.currencyCode;
  const invoiceDate = new Date(invoice.generatedAt).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // Document-type aware title + status badge (mirrors the PDF).
  const isCreditNote = invoice.documentType === "CREDIT_NOTE";
  const docTitle = isCreditNote
    ? L.creditNote
    : invoice.documentType === "RECEIPT"
      ? L.receipt
      : invoice.documentType === "INVOICE_RECEIPT"
        ? L.invoiceReceipt
        : L.invoice;
  const isUnpaid = invoice.documentType === "INVOICE";
  const isCancellationNote = isCreditNote && invoice.creditNoteReason === "CANCELLATION";
  const statusLabel = isCancellationNote
    ? L.cancelled
    : isCreditNote
      ? L.refunded
      : isUnpaid
        ? L.unpaid
        : L.paid;

  // Commission markets: collapse the basket to a single commission line and
  // restate the totals, mirroring buildInvoicePdfData on the backend. Shipping is
  // already inside the commission total (it is 100% ours), so it is not shown
  // again as its own row.
  const commissionMode = order.commissionMode === true && order.commissionTotalCents != null;
  const documentTotalCents = commissionMode
    ? (order.commissionTotalCents as number)
    : order.totalCents;

  // One line PER SERVICE — "Renovação de Receita — Comissão Global Health" —
  // so the patient can see which consultation each amount relates to. Mirrors
  // buildCommissionLines() in backend invoice-pdf.ts; keep the two in step.
  const commissionLabel = L.commissionLine ?? COMMISSION_FALLBACK.commissionLine;
  const perService = commissionMode
    ? order.items.filter((i) => (i.commissionCents ?? 0) > 0)
    : [];
  const commissionRemainder = documentTotalCents - order.shippingCents;
  const lineItems = !commissionMode
    ? order.items
    : perService.length > 0
      ? perService.map((i) => ({
          id: i.id,
          name: `${i.name} — ${commissionLabel}`,
          quantity: 1,
          unitPriceCents: i.commissionCents as number,
          lineTotalCents: i.commissionCents as number,
        }))
      : commissionRemainder > 0
        ? [
            {
              id: "commission",
              name: commissionLabel,
              quantity: 1,
              unitPriceCents: commissionRemainder,
              lineTotalCents: commissionRemainder,
            },
          ]
        : [];

  return (
    <div className="vk-backdrop">
      <div className="vk-sheet">
        <div className="vk-spine" />
        <div className="vk-spine-caption">
          <span>Global Health</span>
        </div>

        <div className="vk-page">
          <div className="vk-topline">
            <span className="vk-logo-text">Global Health</span>
            <span className="vk-caps vk-topline-caps">
              {L.invoiceRef} — {invoice.invoiceNumber}
            </span>
          </div>

          <div className="vk-masthead">
            <div className="vk-mast-title">{docTitle}</div>
            <div className="vk-mast-sub">
              <span className="vk-mast-no">Nº {invoice.invoiceNumber}</span>
              <span className="vk-mast-issued">{invoiceDate}</span>
              <span className="vk-mast-status">
                {statusLabel}
                {!isUnpaid && order.paidAt
                  ? ` · ${new Date(order.paidAt).toLocaleDateString("en-GB")}`
                  : ""}
              </span>
            </div>
            <div className="vk-ecg">
              <EcgRule />
            </div>
          </div>

          <div className="vk-parties">
            <div className="vk-party">
              <span className="vk-caps">{L.from}</span>
              <div className="vk-n">Global Health</div>
              <div className="vk-l">{L.company.split("·").slice(1).join("·").trim()}</div>
              <div className="vk-l">{L.address}</div>
              <div className="vk-l">info@myglobalhealth.online</div>
            </div>
            <div className="vk-party">
              <span className="vk-caps">{L.billTo}</span>
              <div className="vk-n">{order.fullName}</div>
              <div className="vk-l">{order.email}</div>
              {order.phone ? <div className="vk-l">{order.phone}</div> : null}
              {order.taxIdNumber ? (
                <div className="vk-l">
                  {L.taxId} {order.taxIdNumber}
                </div>
              ) : null}
            </div>
            {doctor ? (
              <div className="vk-party vk-party-dr">
                <span className="vk-caps">{L.doctor}</span>
                <div className="vk-n vk-n-dr">{doctor.fullName}</div>
                {doctor.chamberEntity ? <div className="vk-l">{doctor.chamberEntity}</div> : null}
                {doctor.registrationNumber ? (
                  <div className="vk-l">
                    {L.reg} {doctor.registrationNumber}
                  </div>
                ) : null}
                {order.consultationDate ? (
                  <div className="vk-l">
                    {L.consultationDate}:{" "}
                    {new Date(order.consultationDate).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                ) : null}
              </div>
            ) : order.consultationDate ? (
              <div className="vk-party vk-party-dr">
                <span className="vk-caps">{L.consultationDate}</span>
                <div className="vk-l" style={{ marginTop: 6 }}>
                  {new Date(order.consultationDate).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <table className="vk-items">
            <thead>
              <tr>
                <th className="vk-idx-h">Nº</th>
                <th>{L.description}</th>
                <th className="vk-num">{L.qty}</th>
                <th className="vk-num">{L.unit}</th>
                <th className="vk-num">{L.total}</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, idx) => (
                <tr key={item.id}>
                  <td className="vk-td vk-idx">{String(idx + 1).padStart(2, "0")}</td>
                  <td className="vk-td vk-desc">{item.name}</td>
                  <td className="vk-td vk-num">{item.quantity}</td>
                  <td className="vk-td vk-num">{fmtMoney(item.unitPriceCents, currency)}</td>
                  <td className="vk-td vk-num vk-strong">
                    {fmtMoney(item.lineTotalCents, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="vk-settle">
            <div className="vk-settle-left">
              {L.invoiceRef} <b>{invoice.invoiceNumber}</b>
            </div>
            <div className="vk-totals">
              {/* Shipping is 100% commission, so it shows in commission mode too —
                  the item lines above carry only the per-service commission. */}
              {order.shippingCents > 0 ? (
                <div className="vk-trow">
                  <span>Shipping</span>
                  <span className="vk-tv">{fmtMoney(order.shippingCents, currency)}</span>
                </div>
              ) : null}
              <div className="vk-grand">
                <span className="vk-gl">{L.total}</span>
                <span className="vk-gv">{fmtMoney(documentTotalCents, currency)}</span>
              </div>
              {commissionMode ? (
                <div className="vk-commission-note">
                  {L.commissionNote ?? COMMISSION_FALLBACK.commissionNote}
                </div>
              ) : null}
              {order.paidAt ? (
                <div className="vk-settled">
                  {isCreditNote ? "Refund issued" : "Settled in full"} ·{" "}
                  {new Date(order.paidAt).toLocaleDateString("en-GB")}
                </div>
              ) : isUnpaid ? (
                <div className="vk-settled">
                  Amount due: {fmtMoney(documentTotalCents, currency)}
                </div>
              ) : null}
            </div>
          </div>

          <div className="vk-foot">
            <div className="vk-foot-rule" />
            <div className="vk-fb">
              <span className="vk-fb-brand">Global Health</span>
              <span className="vk-fb-tag">Medicine Anytime Anywhere — myglobalhealth.online</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .vk-backdrop {
          background: ${VK.ivory};
          min-height: 100vh;
          padding: 40px 16px;
          font-family: ${VK_SANS};
          color: ${VK.ink};
        }
        .vk-sheet {
          position: relative;
          max-width: 820px;
          margin: 0 auto;
          background: ${VK.paper};
          box-shadow: 0 1px 3px rgba(15, 46, 37, 0.08), 0 20px 48px rgba(15, 46, 37, 0.1);
          overflow: hidden;
        }
        .vk-spine {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 18px;
          background: ${VK.night};
        }
        .vk-spine-caption {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 18px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding-bottom: 32px;
        }
        .vk-spine-caption span {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          font-size: 8px;
          font-weight: 600;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: rgba(242, 245, 236, 0.75);
        }
        .vk-page { position: relative; padding: 32px 32px 40px 56px; }
        .vk-caps {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: ${VK.faint};
        }
        .vk-topline {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid ${VK.hairlineDark};
          padding-bottom: 14px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .vk-topline-caps { color: ${VK.forest}; }
        .vk-logo-text { font-size: 18px; font-weight: 700; color: ${VK.forest}; letter-spacing: 0.04em; }
        .vk-masthead { margin-top: 28px; }
        .vk-mast-title {
          font-family: ${VK_SERIF};
          font-style: italic;
          font-size: 40px;
          line-height: 1.05;
          color: ${VK.night};
          letter-spacing: -0.01em;
        }
        .vk-mast-sub { margin-top: 14px; display: flex; align-items: baseline; gap: 20px; flex-wrap: wrap; }
        .vk-mast-no { font-size: 13px; font-weight: 700; letter-spacing: 0.16em; color: ${VK.forest}; }
        .vk-mast-issued { font-size: 13px; color: ${VK.muted}; }
        .vk-mast-status {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: ${VK.night};
          border-bottom: 2px solid ${VK.lime};
          padding-bottom: 2px;
        }
        .vk-ecg { margin-top: 20px; }
        .vk-parties { display: flex; gap: 32px; margin-top: 28px; flex-wrap: wrap; }
        .vk-party { flex: 1 1 160px; min-width: 160px; }
        .vk-party .vk-caps { display: block; margin-bottom: 6px; }
        .vk-n { font-family: ${VK_SERIF}; font-size: 16px; color: ${VK.night}; }
        .vk-n-dr { font-size: 15px; }
        .vk-l { font-size: 12.5px; color: ${VK.muted}; margin-top: 3px; }
        .vk-items { width: 100%; border-collapse: collapse; margin-top: 28px; }
        .vk-items th {
          text-align: left;
          padding: 0 0 8px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: ${VK.forest};
          border-bottom: 2px solid ${VK.night};
        }
        .vk-items th.vk-num, .vk-items .vk-idx-h { text-align: right; }
        .vk-items th:first-child { text-align: left; width: 32px; }
        .vk-items th:nth-child(3) { width: 48px; }
        .vk-items th:nth-child(4), .vk-items th:nth-child(5) { width: 96px; }
        .vk-td { padding: 14px 0; border-bottom: 1px solid ${VK.hairline}; }
        .vk-td.vk-idx { width: 32px; font-size: 12px; color: ${VK.faint}; font-variant-numeric: tabular-nums; }
        .vk-td.vk-desc { font-family: ${VK_SERIF}; font-size: 15px; color: ${VK.night}; padding-right: 24px; }
        .vk-td.vk-num {
          text-align: right;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
          font-size: 13.5px;
          color: ${VK.muted};
        }
        .vk-td.vk-strong { color: ${VK.night}; }
        .vk-settle { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 24px; flex-wrap: wrap; gap: 16px; }
        .vk-settle-left { font-size: 12px; color: ${VK.faint}; max-width: 280px; }
        .vk-settle-left b { color: ${VK.muted}; }
        .vk-totals { width: 280px; max-width: 100%; }
        .vk-trow { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; color: ${VK.muted}; }
        .vk-trow .vk-tv { font-variant-numeric: tabular-nums; color: ${VK.ink}; }
        .vk-grand {
          border-top: 2px solid ${VK.night};
          margin-top: 6px;
          padding-top: 8px;
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }
        .vk-gl { font-size: 10px; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: ${VK.forest}; }
        .vk-gv { font-family: ${VK_SERIF}; font-style: italic; font-size: 28px; color: ${VK.night}; letter-spacing: -0.01em; }
        .vk-settled { text-align: right; font-size: 12px; color: ${VK.muted}; margin-top: 6px; }
        /* Commission markets: explains why the document total is lower than the
           amount the patient was charged. Left-aligned + wrapping, unlike the
           right-aligned single-line rows above it. */
        .vk-commission-note {
          margin-top: 8px;
          font-size: 10.5px;
          line-height: 1.5;
          color: ${VK.faint};
        }
        .vk-foot { margin-top: 40px; }
        .vk-foot-rule { border-top: 1px solid ${VK.hairline}; margin-bottom: 14px; }
        .vk-fb { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 6px; font-size: 11px; }
        .vk-fb-brand { font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: ${VK.forest}; }
        .vk-fb-tag { color: ${VK.faint}; font-family: ${VK_SERIF}; font-style: italic; font-size: 13px; }

        @media print {
          @page { size: A4; margin: 0; }
          html, body { background: ${VK.paper}; }
          .vk-backdrop { background: ${VK.paper}; padding: 0; min-height: 0; }
          .vk-sheet { max-width: none; box-shadow: none; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .vk-spine, .vk-spine-caption {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .vk-page { padding: 18mm 16mm 20mm 24mm; }
        }
      `}</style>
    </div>
  );
}
