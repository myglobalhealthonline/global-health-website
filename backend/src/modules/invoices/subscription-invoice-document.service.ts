import { prisma } from "../../db/prisma.js";
import { safeDecrypt, type InvoiceDetailPayload } from "./invoice-detail.service.js";
import type { InvoicePdfData } from "./invoice-pdf.js";

/**
 * Renders a membership (subscription) charge as a Global Health document
 * instead of Stripe's own invoice page.
 *
 * WHAT THIS DOES NOT DO — read before extending
 * ---------------------------------------------
 * It does NOT mint an `Invoice` row and does NOT consume a country invoice
 * number. Stripe stays the system of record for subscription revenue —
 * numbering, VAT lines and the legally-issued PDF — exactly as
 * subscription-invoice.service.ts (§38.1) established. What changes is only
 * the PRESENTATION: the same charge, same Stripe document number, drawn in our
 * template and our market's language rather than Stripe's.
 *
 * Issuing our own fiscal document for membership revenue is a different and
 * much larger decision: it needs a synthetic Order (Invoice.orderId is a hard
 * FK), consumes the IE-/PT-/BR- sequences, has to settle what happens to the
 * Stripe documents already issued, and in Portugal has to decide whether
 * InvoiceExpress issues it too. Deliberately out of scope here.
 *
 * The payload is shaped exactly like `buildInvoiceDetailPayload`'s so the
 * printable page renders both sources through one component.
 */

type SubscriptionInvoiceRow = {
  id: string;
  number: string | null;
  stripeInvoiceId: string;
  amountPaidCents: number;
  currency: string;
  taxCents: number;
  periodStart: Date | null;
  status: string | null;
  createdAt: Date;
  subscription: {
    countryCode: string;
    plan: { name: string };
    user: { fullName: string; email: string; phone: string | null };
  };
};

/**
 * Stripe's status vocabulary → our document type. A paid membership charge is
 * a receipt; an open one is still a demand for payment. `void` /
 * `uncollectible` are not credit notes — nothing was refunded — so they render
 * as the unpaid invoice they are.
 */
function documentTypeFor(status: string | null): InvoicePdfData["documentType"] {
  return (status ?? "").toLowerCase() === "paid" ? "INVOICE_RECEIPT" : "INVOICE";
}

/** Stripe's human number when it has finalized one; the object id otherwise. */
function documentNumber(row: { number: string | null; stripeInvoiceId: string }): string {
  return row.number?.trim() || row.stripeInvoiceId;
}

async function loadRow(
  subscriptionInvoiceId: string,
  userIdScope: string,
): Promise<SubscriptionInvoiceRow | null> {
  return prisma.subscriptionInvoice.findFirst({
    where: {
      id: subscriptionInvoiceId,
      // Ownership: a patient may only render their own membership document.
      subscription: { userId: userIdScope },
    },
    select: {
      id: true,
      number: true,
      stripeInvoiceId: true,
      amountPaidCents: true,
      currency: true,
      taxCents: true,
      periodStart: true,
      status: true,
      createdAt: true,
      subscription: {
        select: {
          countryCode: true,
          plan: { select: { name: true } },
          user: { select: { fullName: true, email: true, phone: true } },
        },
      },
    },
  });
}

/** Null when no such document exists for this user. */
export async function buildSubscriptionInvoiceDetail(
  subscriptionInvoiceId: string,
  userIdScope: string,
): Promise<InvoiceDetailPayload | null> {
  const row = await loadRow(subscriptionInvoiceId, userIdScope);
  if (!row) return null;

  const paid = (row.status ?? "").toLowerCase() === "paid";
  const profile = await prisma.patientProfile.findUnique({
    where: { email: row.subscription.user.email.toLowerCase() },
    select: { id: true, taxIdNumber: true },
  });

  return {
    invoice: {
      id: row.id,
      invoiceNumber: documentNumber(row),
      countryCode: row.subscription.countryCode,
      documentType: documentTypeFor(row.status),
      creditNoteReason: null,
      generatedAt: (row.periodStart ?? row.createdAt).toISOString(),
      emailSentAt: null,
    },
    order: {
      id: row.id,
      orderNumber: null,
      fullName: row.subscription.user.fullName,
      email: row.subscription.user.email,
      phone: row.subscription.user.phone,
      countryCode: row.subscription.countryCode,
      // Stripe stores currency lowercase; Intl.NumberFormat wants the ISO code.
      currencyCode: row.currency.toUpperCase(),
      totalCents: row.amountPaidCents,
      subtotalCents: row.amountPaidCents - row.taxCents,
      shippingCents: 0,
      // A membership is never a commission sale — the whole charge is ours.
      commissionMode: false,
      commissionTotalCents: null,
      doctorPayoutTotalCents: null,
      paymentStatus: paid ? "PAID" : "UNPAID",
      paidAt: paid ? (row.periodStart ?? row.createdAt).toISOString() : null,
      // PHI-encrypted column — see safeDecrypt in invoice-detail.service.ts.
      taxIdNumber: safeDecrypt(profile?.taxIdNumber),
      consultationDate: null,
      items: [
        {
          id: row.id,
          kind: "MEMBERSHIP",
          name: row.subscription.plan.name,
          quantity: 1,
          unitPriceCents: row.amountPaidCents,
          lineTotalCents: row.amountPaidCents,
          commissionCents: null,
        },
      ],
    },
    doctor: null,
    patientProfileId: profile?.id ?? null,
  };
}

/** The same document as PDF, for the portal's download action. */
export async function buildSubscriptionInvoicePdfData(
  subscriptionInvoiceId: string,
  userIdScope: string,
): Promise<{ data: InvoicePdfData; filename: string } | null> {
  const detail = await buildSubscriptionInvoiceDetail(subscriptionInvoiceId, userIdScope);
  if (!detail) return null;

  const data: InvoicePdfData = {
    invoiceNumber: detail.invoice.invoiceNumber,
    invoiceDate: detail.invoice.generatedAt,
    countryCode: detail.invoice.countryCode,
    documentType: detail.invoice.documentType as InvoicePdfData["documentType"],
    commissionMode: false,
    creditNoteReason: null,
    order: {
      fullName: detail.order.fullName,
      email: detail.order.email,
      phone: detail.order.phone,
      currencyCode: detail.order.currencyCode,
      totalCents: detail.order.totalCents,
      subtotalCents: detail.order.subtotalCents,
      shippingCents: 0,
      paidAt: detail.order.paidAt,
      taxIdNumber: detail.order.taxIdNumber,
      consultationDate: null,
      items: detail.order.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unitPriceCents: i.unitPriceCents,
        lineTotalCents: i.lineTotalCents,
      })),
    },
    doctor: null,
  };

  const prefix = detail.invoice.documentType === "INVOICE" ? "invoice" : "receipt";
  return { data, filename: `${prefix}-${detail.invoice.invoiceNumber}.pdf` };
}
