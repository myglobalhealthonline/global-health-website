import { prisma } from "../../db/prisma.js";

/**
 * SubscriptionInvoice mirror (§38.1). Stripe remains the system of record for
 * subscription revenue (invoice numbering, VAT lines, PDF); this lightweight
 * row only renders the account → payments page and links the hosted PDF. No
 * local PDF/number generation. Upsert keyed on stripeInvoiceId = idempotent.
 */

export interface WriteSubscriptionInvoiceInput {
  userSubscriptionId: string;
  stripeInvoiceId: string;
  number: string | null;
  amountPaidCents: number;
  currency: string;
  taxCents: number;
  periodStart: Date | null;
  hostedInvoiceUrl: string | null;
  pdfUrl: string | null;
  status: string | null;
}

export interface SubscriptionInvoiceView {
  id: string;
  number: string | null;
  amountPaidCents: number;
  currency: string;
  taxCents: number;
  periodStart: string | null;
  hostedInvoiceUrl: string | null;
  pdfUrl: string | null;
  status: string | null;
  createdAt: string;
}

/**
 * The patient's subscription invoices (Sprint 3, account → payments mirror).
 * Read-only; scoped to the owning user via the subscription relation.
 */
export async function listUserSubscriptionInvoices(
  userId: string,
): Promise<{ invoices: SubscriptionInvoiceView[] }> {
  const rows = await prisma.subscriptionInvoice.findMany({
    where: { subscription: { userId } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      number: true,
      amountPaidCents: true,
      currency: true,
      taxCents: true,
      periodStart: true,
      hostedInvoiceUrl: true,
      pdfUrl: true,
      status: true,
      createdAt: true,
    },
  });
  return {
    invoices: rows.map((r) => ({
      id: r.id,
      number: r.number,
      amountPaidCents: r.amountPaidCents,
      currency: r.currency,
      taxCents: r.taxCents,
      periodStart: r.periodStart?.toISOString() ?? null,
      hostedInvoiceUrl: r.hostedInvoiceUrl,
      pdfUrl: r.pdfUrl,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export async function writeSubscriptionInvoice(
  input: WriteSubscriptionInvoiceInput,
): Promise<void> {
  await prisma.subscriptionInvoice.upsert({
    where: { stripeInvoiceId: input.stripeInvoiceId },
    create: {
      userSubscriptionId: input.userSubscriptionId,
      stripeInvoiceId: input.stripeInvoiceId,
      number: input.number,
      amountPaidCents: input.amountPaidCents,
      currency: input.currency.toLowerCase(),
      taxCents: input.taxCents,
      periodStart: input.periodStart,
      hostedInvoiceUrl: input.hostedInvoiceUrl,
      pdfUrl: input.pdfUrl,
      status: input.status,
    },
    update: {
      amountPaidCents: input.amountPaidCents,
      taxCents: input.taxCents,
      hostedInvoiceUrl: input.hostedInvoiceUrl,
      pdfUrl: input.pdfUrl,
      status: input.status,
    },
  });
}
