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
