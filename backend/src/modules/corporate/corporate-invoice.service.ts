import { prisma } from "../../db/prisma.js";
import {
  invoicePrefix,
  generateInvoiceNumber,
  generateCreditNoteNumber,
} from "../../lib/invoice-number.js";
import { buildInvoicePdfData, renderInvoicePdfBuffer } from "../invoices/invoice-pdf.js";
import { sendInvoiceEmail } from "../../lib/email/templates.js";
import { absoluteSiteUrl } from "../../lib/email/send-email.js";
import { sendSalesInvoiceCopy } from "../../lib/email/sales-invoice-copy.js";
import type { PaymentLog } from "../orders/complete-order-payment.service.js";

/**
 * Corporate subscription invoices.
 *
 * A corporate company is billed offline (annual). To let admins hand the
 * company real Invoice / Receipt / Credit-note PDFs in the SAME format as the
 * patient-facing ones — without a bespoke second invoice pipeline — each
 * document is minted as a *synthetic* Order flagged with
 * `Order.corporateCompanyId`, carrying a single line item and one Invoice row.
 * Everything downstream (numbering, PDF builder, /print page, PDF download,
 * email/WhatsApp resend) then works unchanged because it is Order-centric.
 *
 * The tab also surfaces the company's EMPLOYEES' consultation documents — the
 * ordinary Invoice rows from orders the employees booked — so an admin sees
 * both the company's own billing and its members' consultation invoices.
 */

export type CorporateInvoiceDocument = {
  id: string;
  invoiceNumber: string;
  countryCode: string;
  documentType: "INVOICE" | "RECEIPT" | "INVOICE_RECEIPT" | "CREDIT_NOTE";
  generatedAt: string;
  emailSentAt: string | null;
  emailSentTo: string | null;
  orderId: string;
  orderNumber: string | null;
  fullName: string;
  email: string;
  totalCents: number;
  currencyCode: string;
  /** Which bucket the document belongs to in the corporate tab. */
  source: "SUBSCRIPTION" | "CONSULTATION";
};

type InvoiceWithOrder = {
  id: string;
  invoiceNumber: string;
  countryCode: string;
  documentType: CorporateInvoiceDocument["documentType"];
  generatedAt: Date;
  emailSentAt: Date | null;
  emailSentTo: string | null;
  orderId: string;
  order: {
    orderNumber: string | null;
    fullName: string;
    email: string;
    totalCents: number;
    currencyCode: string;
  };
};

function toDocument(
  inv: InvoiceWithOrder,
  source: CorporateInvoiceDocument["source"],
): CorporateInvoiceDocument {
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    countryCode: inv.countryCode,
    documentType: inv.documentType,
    generatedAt: inv.generatedAt.toISOString(),
    emailSentAt: inv.emailSentAt?.toISOString() ?? null,
    emailSentTo: inv.emailSentTo,
    orderId: inv.orderId,
    orderNumber: inv.order.orderNumber,
    fullName: inv.order.fullName,
    email: inv.order.email,
    totalCents: inv.order.totalCents,
    currencyCode: inv.order.currencyCode,
    source,
  };
}

const ORDER_SELECT = {
  orderNumber: true,
  fullName: true,
  email: true,
  totalCents: true,
  currencyCode: true,
} as const;

/**
 * List every fiscal document tied to a corporate company:
 *   - SUBSCRIPTION: synthetic billing orders (Order.corporateCompanyId == id)
 *   - CONSULTATION: the company's employees' own consultation invoices,
 *     matched by employee userId / email (excluding subscription orders).
 */
export async function listCorporateInvoiceDocuments(companyId: string): Promise<{
  subscription: CorporateInvoiceDocument[];
  consultations: CorporateInvoiceDocument[];
}> {
  const subscriptionInvoices = await prisma.invoice.findMany({
    where: { order: { corporateCompanyId: companyId } },
    orderBy: { generatedAt: "desc" },
    select: {
      id: true,
      invoiceNumber: true,
      countryCode: true,
      documentType: true,
      generatedAt: true,
      emailSentAt: true,
      emailSentTo: true,
      orderId: true,
      order: { select: ORDER_SELECT },
    },
  });

  // Employees' consultation invoices — resolve the company's employees first,
  // then their orders' invoices by userId OR (case-insensitive) email.
  const employees = await prisma.corporateEmployee.findMany({
    where: { companyId },
    select: { userId: true, email: true },
  });
  const userIds = employees.map((e) => e.userId).filter((v): v is string => Boolean(v));
  const emails = Array.from(
    new Set(employees.map((e) => e.email.toLowerCase()).filter(Boolean)),
  );

  let consultationInvoices: typeof subscriptionInvoices = [];
  if (userIds.length || emails.length) {
    const emailOr = emails.map((email) => ({
      order: { email: { equals: email, mode: "insensitive" as const } },
    }));
    consultationInvoices = await prisma.invoice.findMany({
      where: {
        // Never fold a synthetic billing order into the consultation bucket.
        order: { corporateCompanyId: null },
        OR: [
          ...(userIds.length ? [{ order: { userId: { in: userIds } } }] : []),
          ...emailOr,
        ],
      },
      orderBy: { generatedAt: "desc" },
      select: {
        id: true,
        invoiceNumber: true,
        countryCode: true,
        documentType: true,
        generatedAt: true,
        emailSentAt: true,
        emailSentTo: true,
        orderId: true,
        order: { select: ORDER_SELECT },
      },
      take: 200,
    });
  }

  return {
    subscription: subscriptionInvoices.map((inv) => toDocument(inv, "SUBSCRIPTION")),
    consultations: consultationInvoices.map((inv) => toDocument(inv, "CONSULTATION")),
  };
}

const noopLog: PaymentLog = { info: () => {}, warn: () => {}, error: () => {} };

export type GenerateCorporateInvoiceInput = {
  documentType: CorporateInvoiceDocument["documentType"];
  /** Gross amount in minor units (cents). VAT-exempt, so subtotal == total. */
  amountCents: number;
  /** Line-item description shown on the PDF, e.g. "2026 annual plan". */
  description: string;
  quantity: number;
  /** Email the document to the company billing address after minting. */
  send: boolean;
};

export type GenerateCorporateInvoiceResult =
  | { ok: true; invoiceId: string; invoiceNumber: string }
  | { ok: false; message: string };

/**
 * Mint one corporate subscription fiscal document (synthetic Order + line +
 * Invoice) and optionally email it to the company billing address.
 */
export async function generateCorporateSubscriptionInvoice(
  companyId: string,
  input: GenerateCorporateInvoiceInput,
  log: PaymentLog = noopLog,
): Promise<GenerateCorporateInvoiceResult> {
  const company = await prisma.corporateCompany.findUnique({
    where: { id: companyId },
    include: { plan: { select: { currencyCode: true } } },
  });
  if (!company) return { ok: false, message: "Company not found" };

  const countryCode = company.countryCode.toLowerCase();
  if (!invoicePrefix(countryCode)) {
    return {
      ok: false,
      message: `No invoice series configured for country "${company.countryCode.toUpperCase()}" (Portugal uses InvoiceExpress).`,
    };
  }

  const amountCents = Math.round(input.amountCents);
  const quantity = Math.max(1, Math.round(input.quantity));
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return { ok: false, message: "Amount must be greater than zero." };
  }
  const unitPriceCents = Math.round(amountCents / quantity);
  const currencyCode = company.plan.currencyCode;

  // documentType drives the paid/unpaid state the PDF renders.
  const isUnpaid = input.documentType === "INVOICE";
  const isCredit = input.documentType === "CREDIT_NOTE";
  const now = new Date();

  let invoiceNumber: string;
  try {
    invoiceNumber = isCredit
      ? await generateCreditNoteNumber(countryCode)
      : await generateInvoiceNumber(countryCode);
  } catch (err) {
    log.error({ err, companyId }, "Corporate invoice numbering failed");
    return { ok: false, message: "Could not allocate an invoice number." };
  }

  const order = await prisma.order.create({
    data: {
      corporateCompanyId: company.id,
      // Bill TO the company (its billing address / name appear on the PDF).
      email: company.billingEmail,
      fullName: company.name,
      phone: company.contactPhone,
      countryCode,
      currencyCode,
      subtotalCents: amountCents,
      shippingCents: 0,
      totalCents: amountCents,
      status: isUnpaid ? "PENDING" : isCredit ? "REFUNDED" : "PAID",
      paymentStatus: isUnpaid ? "UNPAID" : isCredit ? "REFUNDED" : "PAID",
      paidAt: isUnpaid ? null : now,
      items: {
        create: {
          // Internal audit kind only — never shown on the invoice (the PDF
          // renders the line `name`). Deliberately NOT a consultation kind so
          // the PDF builder's doctor-lookup path is skipped.
          kind: "HEALTH_TEST",
          name: input.description,
          quantity,
          unitPriceCents,
          lineTotalCents: unitPriceCents * quantity,
        },
      },
      invoices: {
        create: {
          invoiceNumber,
          countryCode,
          documentType: input.documentType,
          emailSentTo: company.billingEmail,
        },
      },
    },
    select: { id: true, invoices: { select: { id: true, generatedAt: true } } },
  });

  const invoice = order.invoices[0];
  log.info(
    { companyId, orderId: order.id, invoiceId: invoice?.id, invoiceNumber },
    "Corporate subscription document created",
  );

  if (input.send && invoice) {
    await renderAndSendCorporateInvoice(
      {
        invoiceId: invoice.id,
        orderId: order.id,
        invoiceNumber,
        invoiceDateIso: invoice.generatedAt.toISOString(),
        email: company.billingEmail,
        fullName: company.name,
        countryCode,
        documentType: input.documentType,
      },
      log,
    );
  }

  return {
    ok: true,
    invoiceId: invoice?.id ?? "",
    invoiceNumber,
  };
}

/**
 * Render the PDF and email it to the company billing address, then stamp
 * emailSentAt. PDF/email failures are non-fatal — the Invoice row is the
 * source of truth. Mirrors renderAndSendInvoiceDoc in generate-invoice.service.
 */
async function renderAndSendCorporateInvoice(
  opts: {
    invoiceId: string;
    orderId: string;
    invoiceNumber: string;
    invoiceDateIso: string;
    email: string;
    fullName: string;
    countryCode: string;
    documentType: CorporateInvoiceDocument["documentType"];
  },
  log: PaymentLog,
): Promise<void> {
  let pdfBuffer: Buffer | undefined;
  try {
    const pdfData = await buildInvoicePdfData(
      opts.orderId,
      opts.invoiceNumber,
      opts.invoiceDateIso,
      opts.documentType,
    );
    if (pdfData) pdfBuffer = (await renderInvoicePdfBuffer(pdfData)) ?? undefined;
  } catch (err) {
    log.warn({ err, orderId: opts.orderId }, "Corporate invoice PDF failed — link-only email");
  }

  try {
    await sendInvoiceEmail({
      to: opts.email,
      fullName: opts.fullName,
      invoiceNumber: opts.invoiceNumber,
      invoiceUrl: absoluteSiteUrl(`/print/order-invoices/${opts.invoiceId}`),
      countryCode: opts.countryCode.toLowerCase(),
      pdfBuffer,
      documentType: opts.documentType,
    });
    await prisma.invoice.update({
      where: { id: opts.invoiceId },
      data: { emailSentAt: new Date() },
    });
    log.info({ invoiceId: opts.invoiceId }, "Corporate invoice email sent");
  } catch (err) {
    log.warn({ err, invoiceId: opts.invoiceId }, "Corporate invoice email failed — doc still created");
  }

  // Same accounting archive as the patient path: PAID documents outside PT/CZ
  // are forwarded to the bookkeeping inbox. Outside the try above so a failed
  // company email still archives. Self-gates on country + document type.
  await sendSalesInvoiceCopy(
    {
      invoiceId: opts.invoiceId,
      invoiceNumber: opts.invoiceNumber,
      countryCode: opts.countryCode,
      documentType: opts.documentType,
      pdfBuffer,
    },
    log,
  );
}
