import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { getServerAuthUser } from "@/lib/api/server-auth";
import { getBackendOrigin } from "@/lib/server/backend-origin";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

type Params = { invoiceId: string };

// ── Inline i18n ──────────────────────────────────────────────────────────────

const LABELS: Record<string, Record<string, string>> = {
  ie: {
    invoice: "Invoice",
    receipt: "Receipt",
    invoiceReceipt: "Invoice / Receipt",
    creditNote: "Credit Note",
    refunded: "REFUNDED",
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
  sp: {
    invoice: "Factura",
    receipt: "Recibo",
    invoiceReceipt: "Factura / Recibo",
    creditNote: "Nota de crédito",
    refunded: "REEMBOLSADO",
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
  rm: {
    invoice: "Factură",
    receipt: "Chitanță",
    invoiceReceipt: "Factură / Chitanță",
    creditNote: "Notă de credit",
    refunded: "RAMBURSAT",
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
};

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

// ── Data fetching ─────────────────────────────────────────────────────────────

type InvoiceDetail = {
  invoice: {
    id: string;
    invoiceNumber: string;
    countryCode: string;
    documentType: "INVOICE" | "RECEIPT" | "INVOICE_RECEIPT" | "CREDIT_NOTE";
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
    }[];
  };
  doctor: {
    fullName: string;
    registrationNumber: string | null;
    chamberEntity: string | null;
  } | null;
};

async function fetchInvoiceDetail(invoiceId: string): Promise<InvoiceDetail | null> {
  const backend = getBackendOrigin();
  if (!backend) return null;
  const store = await cookies();
  const cookieHeader = store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  try {
    const res = await fetch(`${backend}/api/admin/invoices/${invoiceId}`, {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
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
  const user = await getServerAuthUser();
  if (!user) redirect(`/login?next=/print/order-invoices/${invoiceId}`);
  if (user.role !== "ADMIN" && user.role !== "DOCTOR") redirect("/account");

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

  return (
    <main
      style={{
        maxWidth: 740,
        margin: "0 auto",
        padding: "40px 32px",
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        color: "#111",
        lineHeight: 1.55,
        background: "#fff",
      }}
    >
      {/* ── Header ── */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 32,
          paddingBottom: 24,
          borderBottom: "2px solid #1B4D3E",
        }}
      >
        {/* Logo */}
        <div>
          <Image
            src="/logos/global-health-dark.png"
            alt="Global Health"
            width={180}
            height={60}
            style={{ objectFit: "contain", objectPosition: "left" }}
            priority
          />
          <p
            style={{
              margin: "10px 0 0",
              fontSize: 11,
              color: "#555",
              lineHeight: 1.4,
            }}
          >
            {L.company}
            <br />
            {L.address}
          </p>
        </div>

        {/* Invoice meta */}
        <div style={{ textAlign: "right" }}>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#1B4D3E",
              fontWeight: 700,
            }}
          >
            {docTitle}
          </p>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 28,
              fontWeight: 800,
              color: "#1B4D3E",
              letterSpacing: "0.04em",
            }}
          >
            {invoice.invoiceNumber}
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "#555" }}>{invoiceDate}</p>
          <span
            style={{
              display: "inline-block",
              marginTop: 10,
              padding: "3px 10px",
              borderRadius: 999,
              background: isCreditNote ? "#fee2e2" : isUnpaid ? "#fef3c7" : "#d1fae5",
              color: isCreditNote ? "#991b1b" : isUnpaid ? "#92400e" : "#065f46",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
            }}
          >
            {isCreditNote ? L.refunded : isUnpaid ? L.unpaid : L.paid}
          </span>
        </div>
      </header>

      {/* ── Billing parties ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          marginBottom: 32,
        }}
      >
        {/* From */}
        <div>
          <p
            style={{
              margin: "0 0 6px",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: "#888",
            }}
          >
            {L.from}
          </p>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>Global Health</p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#555" }}>{L.address}</p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#555" }}>
            info@myglobalhealth.online
          </p>
        </div>

        {/* Bill to */}
        <div>
          <p
            style={{
              margin: "0 0 6px",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: "#888",
            }}
          >
            {L.billTo}
          </p>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{order.fullName}</p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#555" }}>{order.email}</p>
          {order.phone ? (
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#555" }}>{order.phone}</p>
          ) : null}
          {order.taxIdNumber ? (
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#555" }}>
              {L.taxId}: {order.taxIdNumber}
            </p>
          ) : null}
          {order.consultationDate ? (
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#555" }}>
              {L.consultationDate}:{" "}
              {new Date(order.consultationDate).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          ) : null}
        </div>
      </div>

      {/* ── Doctor block (if present) ── */}
      {doctor ? (
        <div
          style={{
            marginBottom: 28,
            padding: "12px 16px",
            background: "#f4f7f5",
            borderLeft: "3px solid #1B4D3E",
            borderRadius: 4,
          }}
        >
          <p
            style={{
              margin: "0 0 4px",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: "#555",
            }}
          >
            {L.doctor}
          </p>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{doctor.fullName}</p>
          {doctor.chamberEntity && doctor.registrationNumber ? (
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#555" }}>
              {doctor.chamberEntity} · {L.reg}: {doctor.registrationNumber}
            </p>
          ) : doctor.registrationNumber ? (
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#555" }}>
              {L.reg}: {doctor.registrationNumber}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* ── Line items ── */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
          marginBottom: 8,
        }}
      >
        <thead>
          <tr
            style={{
              borderBottom: "2px solid #1B4D3E",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#555",
            }}
          >
            <th style={{ textAlign: "left", padding: "6px 0 8px" }}>{L.description}</th>
            <th style={{ textAlign: "center", padding: "6px 0 8px", width: 50 }}>{L.qty}</th>
            <th style={{ textAlign: "right", padding: "6px 0 8px", width: 110 }}>{L.unit}</th>
            <th style={{ textAlign: "right", padding: "6px 0 8px", width: 110 }}>{L.total}</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "10px 0" }}>{item.name}</td>
              <td style={{ textAlign: "center", padding: "10px 0" }}>{item.quantity}</td>
              <td style={{ textAlign: "right", padding: "10px 0" }}>
                {fmtMoney(item.unitPriceCents, currency)}
              </td>
              <td style={{ textAlign: "right", padding: "10px 0" }}>
                {fmtMoney(item.lineTotalCents, currency)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {order.shippingCents > 0 ? (
            <tr style={{ borderTop: "1px solid #ddd" }}>
              <td
                colSpan={3}
                style={{ textAlign: "right", padding: "8px 0", color: "#555", fontSize: 12 }}
              >
                Shipping
              </td>
              <td style={{ textAlign: "right", padding: "8px 0", color: "#555", fontSize: 12 }}>
                {fmtMoney(order.shippingCents, currency)}
              </td>
            </tr>
          ) : null}
          <tr style={{ borderTop: "2px solid #1B4D3E" }}>
            <td
              colSpan={3}
              style={{ textAlign: "right", padding: "12px 0", fontWeight: 700, fontSize: 14 }}
            >
              {L.total}
            </td>
            <td
              style={{
                textAlign: "right",
                padding: "12px 0",
                fontWeight: 800,
                fontSize: 16,
                color: "#1B4D3E",
              }}
            >
              {fmtMoney(order.totalCents, currency)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* ── Invoice reference ── */}
      <p style={{ marginTop: 24, fontSize: 11, color: "#888" }}>
        {L.invoiceRef}: <strong>{invoice.invoiceNumber}</strong>
        {order.paidAt ? ` · Paid ${new Date(order.paidAt).toLocaleDateString("en-GB")}` : ""}
      </p>

      {/* ── Footer ── */}
      <footer
        style={{
          marginTop: 48,
          paddingTop: 16,
          borderTop: "1px solid #e5e5e3",
          fontSize: 11,
          color: "#888",
          textAlign: "center",
        }}
      >
        {L.footer}
      </footer>

      <style>{`
        @media print {
          body { background: #fff; margin: 0; }
          a { color: inherit; text-decoration: none; }
          @page { margin: 18mm; }
        }
      `}</style>
    </main>
  );
}
