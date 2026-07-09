import { prisma } from "../../db/prisma.js";
import { invoicePrefix, generateInvoiceNumber, generateCreditNoteNumber } from "../../lib/invoice-number.js";
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
  _log: PaymentLog,
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

type InvoiceDocumentType = "INVOICE" | "RECEIPT" | "INVOICE_RECEIPT" | "CREDIT_NOTE";

/**
 * Render the document PDF and email it to the patient, then stamp emailSentAt.
 * Shared by every issue/transition path. PDF + email failures are non-fatal —
 * the invoice row is the source of truth and must survive email trouble.
 */
async function renderAndSendInvoiceDoc(
  opts: {
    invoiceId: string;
    orderId: string;
    invoiceNumber: string;
    invoiceDateIso: string;
    email: string;
    fullName: string;
    countryCode: string;
    documentType: InvoiceDocumentType;
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
    if (pdfData) {
      pdfBuffer = (await renderInvoicePdfBuffer(pdfData)) ?? undefined;
    }
  } catch (err) {
    log.warn({ err, orderId: opts.orderId }, "Invoice PDF generation failed — sending link-only email");
  }

  const invoiceUrl = absoluteSiteUrl(`/print/order-invoices/${opts.invoiceId}`);
  try {
    await sendInvoiceEmail({
      to: opts.email,
      fullName: opts.fullName,
      invoiceNumber: opts.invoiceNumber,
      invoiceUrl,
      countryCode: opts.countryCode.toLowerCase(),
      pdfBuffer,
      documentType: opts.documentType,
    });
    await prisma.invoice.update({
      where: { id: opts.invoiceId },
      data: { emailSentAt: new Date() },
    });
    log.info({ invoiceId: opts.invoiceId, documentType: opts.documentType }, "Invoice email sent");
  } catch (err) {
    log.warn({ err, invoiceId: opts.invoiceId }, "Invoice email failed — invoice still created");
  }
}

/**
 * Re-send the current fiscal document's email to the patient (admin action).
 * Uses the row's existing documentType + number — no new number, no state
 * change. Returns false if the invoice/order can't be found.
 */
export async function resendInvoiceDocument(
  invoiceId: string,
  log: PaymentLog = noopLog,
): Promise<boolean> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      invoiceNumber: true,
      generatedAt: true,
      documentType: true,
      countryCode: true,
      order: { select: { id: true, email: true, fullName: true } },
    },
  });
  if (!invoice) return false;

  await renderAndSendInvoiceDoc(
    {
      invoiceId: invoice.id,
      orderId: invoice.order.id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDateIso: invoice.generatedAt.toISOString(),
      email: invoice.order.email,
      fullName: invoice.order.fullName,
      countryCode: invoice.countryCode,
      documentType: invoice.documentType as InvoiceDocumentType,
    },
    log,
  );
  return true;
}

/**
 * Send the fiscal document to the patient over WhatsApp (admin action) as a
 * message with the print-page link. Consent-gated the same way as the other
 * patient WhatsApp sends. Returns a discriminated result so the route can
 * surface "no consent"/"no phone" as a 4xx rather than a silent success.
 */
export async function resendInvoiceWhatsApp(
  invoiceId: string,
  log: PaymentLog = noopLog,
): Promise<
  | { ok: true }
  | { ok: false; reason: "not_found" | "no_phone" | "no_consent" | "send_failed"; message: string }
> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      invoiceNumber: true,
      documentType: true,
      countryCode: true,
      order: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          countryCode: true,
          items: {
            select: { patientWhatsappConsent: true, patientAddressCountryCode: true },
            take: 1,
          },
        },
      },
    },
  });
  if (!invoice) return { ok: false, reason: "not_found", message: "Invoice not found" };

  const item = invoice.order.items[0];
  if (!item?.patientWhatsappConsent) {
    return { ok: false, reason: "no_consent", message: "Patient has not consented to WhatsApp updates" };
  }
  if (!invoice.order.phone?.trim()) {
    return { ok: false, reason: "no_phone", message: "Order has no patient phone number" };
  }

  const { sendWhatsAppText, formatWhatsAppSendError } = await import("../../lib/whatsapp/wasender.js");
  const docLabel =
    invoice.documentType === "RECEIPT"
      ? "receipt"
      : invoice.documentType === "CREDIT_NOTE"
        ? "credit note"
        : "invoice";
  const invoiceUrl = absoluteSiteUrl(`/print/order-invoices/${invoice.id}`);
  const result = await sendWhatsAppText({
    to: invoice.order.phone,
    message:
      `Hi ${invoice.order.fullName}, here is your ${docLabel} #${invoice.invoiceNumber} from Global Health: ${invoiceUrl}` +
      `\n\nReply here or reach us out at globalhealth@myglobalhealth.online`,
    hints: {
      orderCountryCode: invoice.order.countryCode,
      patientAddressCountryCode: item.patientAddressCountryCode ?? null,
    },
  });
  if (!result.ok || result.skipped) {
    const message = result.skipped
      ? "WhatsApp is not configured on this environment"
      : formatWhatsAppSendError(result);
    log.warn({ invoiceId, message }, "Invoice WhatsApp resend failed");
    return { ok: false, reason: "send_failed", message };
  }
  log.info({ invoiceId }, "Invoice WhatsApp sent");
  return { ok: true };
}

/**
 * Issue an UNPAID invoice for a manual / AI-agent booking and email it to the
 * patient so they can pay. Called at booking-creation time (before payment).
 *
 * - Skips Portugal + prefixless countries (same rule as the paid path).
 * - Idempotent: returns early if an invoice already exists for the order.
 * - The presence of this row is later how generateInvoiceForOrder knows the
 *   booking was manual/AI (→ transition to RECEIPT) rather than direct web.
 */
export async function createUnpaidInvoiceForOrder(
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
      invoices: { where: { documentType: { not: "CREDIT_NOTE" } }, select: { id: true } },
    },
  });

  if (!order) {
    log.warn({ orderId }, "createUnpaidInvoiceForOrder: order not found");
    return;
  }
  if (order.countryCode.toLowerCase() === "pt") return;
  if (!invoicePrefix(order.countryCode)) {
    log.info({ orderId, countryCode: order.countryCode }, "No invoice prefix — skipping");
    return;
  }
  if (order.invoices.length > 0) {
    log.info({ orderId }, "Invoice already exists — skipping unpaid issue");
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
      documentType: "INVOICE",
    },
  });

  log.info({ orderId, invoiceNumber, invoiceId: invoice.id }, "Unpaid invoice created");

  // No Make.com payment webhook here — nothing is paid yet.
  await renderAndSendInvoiceDoc(
    {
      invoiceId: invoice.id,
      orderId: order.id,
      invoiceNumber,
      invoiceDateIso: invoice.generatedAt.toISOString(),
      email: order.email,
      fullName: order.fullName,
      countryCode: order.countryCode,
      documentType: "INVOICE",
    },
    log,
  );
}

/**
 * Issue or finalise the fiscal document for a PAID order and email the patient.
 *
 * - Skips Portugal (countryCode === "pt") — no invoices issued there.
 * - Manual/AI booking (an unpaid INVOICE row already exists) → transitions it to
 *   a RECEIPT (same number) and emails the receipt.
 * - Direct-website order (no invoice yet) → creates a combined INVOICE_RECEIPT.
 * - Idempotent: an already-finalised RECEIPT / INVOICE_RECEIPT returns early.
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
      invoices: {
        where: { documentType: { not: "CREDIT_NOTE" } },
        select: {
          id: true,
          invoiceNumber: true,
          generatedAt: true,
          documentType: true,
        },
      },
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

  // Manual/AI booking: an unpaid INVOICE was pre-issued at booking time.
  const existing = order.invoices[0];
  if (existing) {
    if (existing.documentType !== "INVOICE") {
      // Already a RECEIPT or INVOICE_RECEIPT — idempotent no-op.
      log.info({ orderId }, "Invoice already finalised — skipping");
      return;
    }

    // Transition INVOICE → RECEIPT, keeping the same number.
    await prisma.invoice.update({
      where: { id: existing.id },
      data: { documentType: "RECEIPT" },
    });
    log.info(
      { orderId, invoiceId: existing.id, invoiceNumber: existing.invoiceNumber },
      "Invoice transitioned to receipt on payment",
    );

    // Fire-and-forget — webhook failure must never block the receipt.
    sendPaymentWebhookToMake(orderId, existing.id, existing.invoiceNumber, log).catch(
      (err) => {
        log.warn({ err, orderId, invoiceNumber: existing.invoiceNumber }, "Make.com invoice webhook failed");
      },
    );

    await renderAndSendInvoiceDoc(
      {
        invoiceId: existing.id,
        orderId: order.id,
        invoiceNumber: existing.invoiceNumber,
        invoiceDateIso: existing.generatedAt.toISOString(),
        email: order.email,
        fullName: order.fullName,
        countryCode: order.countryCode,
        documentType: "RECEIPT",
      },
      log,
    );
    return;
  }

  // Direct-website order paid at checkout → combined invoice/receipt.
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
      documentType: "INVOICE_RECEIPT",
    },
  });

  log.info({ orderId, invoiceNumber, invoiceId: invoice.id }, "Invoice/receipt created");

  // Fire-and-forget — webhook failure must never block invoice creation.
  sendPaymentWebhookToMake(orderId, invoice.id, invoiceNumber, log).catch((err) => {
    log.warn({ err, orderId, invoiceNumber }, "Make.com invoice webhook failed");
  });

  await renderAndSendInvoiceDoc(
    {
      invoiceId: invoice.id,
      orderId: order.id,
      invoiceNumber,
      invoiceDateIso: invoice.generatedAt.toISOString(),
      email: order.email,
      fullName: order.fullName,
      countryCode: order.countryCode,
      documentType: "INVOICE_RECEIPT",
    },
    log,
  );
}

/**
 * Issue a CREDIT_NOTE for a refunded order and email it to the patient. The
 * credit note reverses the order's paid fiscal document and reuses the exact
 * invoice PDF template (title "Credit Note", red REFUNDED badge).
 *
 * - Skips Portugal (no Invoice rows there — PT lives in InvoiceExpress).
 * - Skips prefixless countries (same rule as the invoice path).
 * - Idempotent: returns the existing credit note if one was already issued.
 * - Own numbering series: CN-IE-00001, CN-CZ-00001, …
 */
export async function generateCreditNoteForOrder(
  orderId: string,
  log: PaymentLog = noopLog,
): Promise<{ invoiceId: string; invoiceNumber: string } | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      email: true,
      fullName: true,
      countryCode: true,
      invoices: { where: { documentType: "CREDIT_NOTE" }, select: { id: true, invoiceNumber: true } },
    },
  });

  if (!order) {
    log.warn({ orderId }, "generateCreditNoteForOrder: order not found");
    return null;
  }

  // Portugal: credit notes are handled via InvoiceExpress, not here.
  if (order.countryCode.toLowerCase() === "pt") return null;

  if (!invoicePrefix(order.countryCode)) {
    log.info({ orderId, countryCode: order.countryCode }, "No invoice prefix — skipping credit note");
    return null;
  }

  // Idempotent: a credit note already exists for this order.
  const already = order.invoices[0];
  if (already) {
    log.info({ orderId, invoiceNumber: already.invoiceNumber }, "Credit note already issued — skipping");
    return { invoiceId: already.id, invoiceNumber: already.invoiceNumber };
  }

  let creditNoteNumber: string;
  try {
    creditNoteNumber = await generateCreditNoteNumber(order.countryCode);
  } catch (err) {
    log.error({ err, orderId }, "Failed to generate credit note number");
    return null;
  }

  const creditNote = await prisma.invoice.create({
    data: {
      invoiceNumber: creditNoteNumber,
      orderId: order.id,
      countryCode: order.countryCode.toLowerCase(),
      emailSentTo: order.email,
      documentType: "CREDIT_NOTE",
    },
  });

  log.info({ orderId, creditNoteNumber, invoiceId: creditNote.id }, "Credit note created");

  await renderAndSendInvoiceDoc(
    {
      invoiceId: creditNote.id,
      orderId: order.id,
      invoiceNumber: creditNoteNumber,
      invoiceDateIso: creditNote.generatedAt.toISOString(),
      email: order.email,
      fullName: order.fullName,
      countryCode: order.countryCode,
      documentType: "CREDIT_NOTE",
    },
    log,
  );

  return { invoiceId: creditNote.id, invoiceNumber: creditNoteNumber };
}
