import { prisma } from "../../db/prisma.js";
import { invoicePrefix, generateInvoiceNumber } from "../../lib/invoice-number.js";
import { sendInvoiceEmail } from "../../lib/email/templates.js";
import { absoluteSiteUrl } from "../../lib/email/send-email.js";
import type { PaymentLog } from "../orders/complete-order-payment.service.js";
import { buildInvoicePdfData, renderInvoicePdfBuffer } from "./invoice-pdf.js";

const MAKE_INVOICE_WEBHOOK_URL =
  process.env.MAKE_INVOICE_WEBHOOK_URL ??
  "https://hook.eu1.make.com/vvts0d52468n9x2p3qgv2hgdi31dr6it";

async function sendPaymentWebhookToMake(
  orderId: string,
  invoiceId: string,
  invoiceNumber: string,
  log: PaymentLog,
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      fullName: true,
      email: true,
      totalCents: true,
      shipLine1: true,
      shipCity: true,
      shipPostalCode: true,
      stripeInvoiceId: true,
      items: { select: { name: true }, take: 1 },
    },
  });
  if (!order) return;

  const profile = await prisma.patientProfile.findUnique({
    where: { email: order.email.toLowerCase() },
    select: {
      taxIdNumber: true,
      addressLine1: true,
      addressCity: true,
      addressPostalCode: true,
    },
  });

  const payload = {
    customer_name: order.fullName,
    customer_email: order.email,
    contact: { contactId: order.email },
    customer_address_street: order.shipLine1 ?? profile?.addressLine1 ?? "",
    customer_address_zip: order.shipPostalCode ?? profile?.addressPostalCode ?? "",
    customer_address_city: order.shipCity ?? profile?.addressCity ?? "",
    total: order.totalCents / 100,
    service_name: order.items[0]?.name ?? "Medical Consultation",
    vat_id: profile?.taxIdNumber?.trim() ?? "",
    invoice_id: invoiceId,
    invoice_number: invoiceNumber,
    stripe_invoice_id: order.stripeInvoiceId ?? null,
  };

  const res = await fetch(MAKE_INVOICE_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Make.com webhook responded ${res.status}`);
  }
}

const noopLog: PaymentLog = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

/**
 * Generate an invoice for a paid order and email it to the patient.
 *
 * - Skips Portugal (countryCode === "pt") — no invoices issued there.
 * - Idempotent: if an invoice already exists for the order, returns early.
 * - Called from ensureOrderPaidAutomations after the order is marked PAID.
 */
export async function generateInvoiceForOrder(
  orderId: string,
  log: PaymentLog = noopLog,
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      email: true,
      fullName: true,
      countryCode: true,
      invoice: { select: { id: true } },
    },
  });

  if (!order) {
    log.warn({ orderId }, "generateInvoiceForOrder: order not found");
    return;
  }

  // Portugal: no invoices.
  if (order.countryCode.toLowerCase() === "pt") return;

  // Skip countries without a prefix (future-proofing).
  if (!invoicePrefix(order.countryCode)) {
    log.info({ orderId, countryCode: order.countryCode }, "No invoice prefix — skipping");
    return;
  }

  // Idempotent: already generated.
  if (order.invoice) {
    log.info({ orderId }, "Invoice already exists — skipping");
    return;
  }

  let invoiceNumber: string;
  try {
    invoiceNumber = await generateInvoiceNumber(order.countryCode);
  } catch (err) {
    log.error({ err, orderId }, "Failed to generate invoice number");
    return;
  }

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      orderId: order.id,
      countryCode: order.countryCode.toLowerCase(),
      emailSentTo: order.email,
    },
  });

  log.info({ orderId, invoiceNumber, invoiceId: invoice.id }, "Invoice created");

  // Fire-and-forget — webhook failure must never block invoice creation.
  sendPaymentWebhookToMake(orderId, invoice.id, invoiceNumber, log).catch((err) => {
    log.warn({ err, orderId, invoiceNumber }, "Make.com invoice webhook failed");
  });

  // Generate PDF to attach to the email (non-blocking failure).
  let pdfBuffer: Buffer | undefined;
  try {
    const pdfData = await buildInvoicePdfData(orderId, invoiceNumber, invoice.generatedAt.toISOString());
    if (pdfData) {
      pdfBuffer = (await renderInvoicePdfBuffer(pdfData)) ?? undefined;
    }
  } catch (err) {
    log.warn({ err, orderId }, "Invoice PDF generation failed — sending link-only email");
  }

  // Send email to patient.
  const invoiceUrl = absoluteSiteUrl(`/print/order-invoices/${invoice.id}`);
  try {
    await sendInvoiceEmail({
      to: order.email,
      fullName: order.fullName,
      invoiceNumber,
      invoiceUrl,
      countryCode: order.countryCode.toLowerCase(),
      pdfBuffer,
    });
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { emailSentAt: new Date() },
    });
    log.info({ invoiceId: invoice.id }, "Invoice email sent");
  } catch (err) {
    log.warn({ err, invoiceId: invoice.id }, "Invoice email failed — invoice still created");
  }
}
