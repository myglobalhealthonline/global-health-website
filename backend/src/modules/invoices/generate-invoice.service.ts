import { prisma } from "../../db/prisma.js";
import { invoicePrefix, generateInvoiceNumber, generateCreditNoteNumber } from "../../lib/invoice-number.js";
import { sendInvoiceEmail } from "../../lib/email/templates.js";
import { absoluteSiteUrl } from "../../lib/email/send-email.js";
import { sendSalesInvoiceCopy } from "../../lib/email/sales-invoice-copy.js";
import type { PaymentLog } from "../orders/complete-order-payment.service.js";
import { buildInvoicePdfData, renderInvoicePdfBuffer, type CreditNoteReason } from "./invoice-pdf.js";
import { issueInvoicePublicCapability } from "./invoice-public-link.service.js";

const noopLog: PaymentLog = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

type InvoiceDocumentType = "INVOICE" | "RECEIPT" | "INVOICE_RECEIPT" | "CREDIT_NOTE";

type InvoiceDocRef = {
  invoiceId: string;
  orderId: string;
  invoiceNumber: string;
  invoiceDateIso: string;
  email: string;
  fullName: string;
  countryCode: string;
  documentType: InvoiceDocumentType;
  /** CREDIT_NOTE only — refund vs cancellation wording. */
  creditNoteReason?: CreditNoteReason | null;
};

export type CreditNoteIssueResult = {
  invoiceId: string;
  invoiceNumber: string;
  /** Number of the document being reversed — null when the order had none. */
  creditedInvoiceNumber: string | null;
  /** Only set for `deliver: "caller"`; undefined if the render failed. */
  pdfBuffer?: Buffer;
};

/**
 * Render the document PDF. Never throws — a failed render degrades to a
 * link-only email rather than losing the document.
 */
async function renderInvoiceDocPdf(opts: InvoiceDocRef, log: PaymentLog): Promise<Buffer | undefined> {
  try {
    const pdfData = await buildInvoicePdfData(
      opts.orderId,
      opts.invoiceNumber,
      opts.invoiceDateIso,
      opts.documentType,
      opts.creditNoteReason ?? null,
    );
    if (!pdfData) return undefined;
    return (await renderInvoicePdfBuffer(pdfData)) ?? undefined;
  } catch (err) {
    log.warn({ err, orderId: opts.orderId }, "Invoice PDF generation failed");
    return undefined;
  }
}

/**
 * Render the document PDF and email it to the patient, then stamp emailSentAt.
 * Shared by every issue/transition path. PDF + email failures are non-fatal —
 * the invoice row is the source of truth and must survive email trouble.
 *
 * `salesCopy` (default true) also forwards the PDF to the accounting inbox for
 * PAID documents outside PT/CZ — see lib/email/sales-invoice-copy.ts. Admin
 * resends pass false so the accountant is never sent the same document twice.
 */
async function renderAndSendInvoiceDoc(
  opts: InvoiceDocRef,
  log: PaymentLog,
  { salesCopy = true }: { salesCopy?: boolean } = {},
): Promise<void> {
  const pdfBuffer = await renderInvoiceDocPdf(opts, log);
  try {
    const token = await issueInvoicePublicCapability(opts.invoiceId);
    if (!token) {
      throw new Error(`Could not mint a public capability for invoice ${opts.invoiceId}`);
    }
    const invoiceUrl = absoluteSiteUrl(
      `/print/order-invoices/${opts.invoiceId}?token=${encodeURIComponent(token)}`,
    );
    await sendInvoiceEmail({
      to: opts.email,
      fullName: opts.fullName,
      invoiceNumber: opts.invoiceNumber,
      invoiceUrl,
      countryCode: opts.countryCode.toLowerCase(),
      pdfBuffer,
      documentType: opts.documentType,
      creditNoteReason: opts.creditNoteReason ?? null,
    });
    await prisma.invoice.update({
      where: { id: opts.invoiceId },
      data: { emailSentAt: new Date() },
    });
    log.info({ invoiceId: opts.invoiceId, documentType: opts.documentType }, "Invoice email sent");
  } catch (err) {
    log.warn({ err, invoiceId: opts.invoiceId }, "Invoice email failed — invoice still created");
  }

  // Outside the try above on purpose: a failed patient email must not cost the
  // accountant their copy. Self-gates on country + document type.
  if (salesCopy) {
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
      creditNoteReason: true,
      countryCode: true,
      invoiceExpressId: true,
      invoiceExpressType: true,
      order: { select: { id: true, email: true, fullName: true } },
    },
  });
  if (!invoice) return false;

  // Portugal: the document is InvoiceExpress's, not ours — there is nothing
  // here to render, and attaching a Global Health template would send the
  // patient a second, unofficial version of a legal document. Ask InvoiceExpress
  // to email its own PDF again instead.
  if (invoice.invoiceExpressId) {
    const { emailInvoiceReceipt } = await import("../../lib/invoice-express/client.js");
    await emailInvoiceReceipt(
      Number(invoice.invoiceExpressId),
      invoice.invoiceExpressType === "Invoice" ? "Invoice" : "InvoiceReceipt",
      {
        email: invoice.order.email,
        subject: "Your Receipt from Global Health",
        body: `Dear ${invoice.order.fullName},\n\nPlease find your receipt attached.\n\nKind regards,\nGlobal Health`,
      },
    );
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { emailSentAt: new Date(), emailSentTo: invoice.order.email },
    });
    log.info(
      { invoiceId: invoice.id, invoiceExpressId: invoice.invoiceExpressId },
      "PT InvoiceExpress document resent",
    );
    return true;
  }

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
      creditNoteReason: invoice.creditNoteReason as CreditNoteReason | null,
    },
    log,
    // Patient-only resend. The accounting inbox already received this document
    // when it was issued; forwarding again would duplicate it in the books.
    { salesCopy: false },
  );
  return true;
}

type InvoiceWhatsAppLang = "en" | "pt" | "ro" | "cs" | "es";

const INVOICE_DOC_LABEL: Record<
  InvoiceWhatsAppLang,
  Record<"RECEIPT" | "CREDIT_NOTE" | "INVOICE", string>
> = {
  en: { RECEIPT: "receipt", CREDIT_NOTE: "credit note", INVOICE: "invoice" },
  pt: { RECEIPT: "recibo", CREDIT_NOTE: "nota de crédito", INVOICE: "fatura" },
  ro: { RECEIPT: "chitanță", CREDIT_NOTE: "notă de credit", INVOICE: "factură" },
  cs: { RECEIPT: "účtenka", CREDIT_NOTE: "dobropis", INVOICE: "faktura" },
  es: { RECEIPT: "recibo", CREDIT_NOTE: "nota de crédito", INVOICE: "factura" },
};

const INVOICE_WHATSAPP_INTRO: Record<
  InvoiceWhatsAppLang,
  (name: string, docLabel: string, number: string, url: string) => string
> = {
  en: (n, d, no, url) => `Hi ${n}, here is your ${d} #${no} from Global Health: ${url}`,
  pt: (n, d, no, url) => `Olá ${n}, aqui está a sua ${d} #${no} da Global Health: ${url}`,
  ro: (n, d, no, url) => `Bună ${n}, aceasta este ${d} dumneavoastră #${no} de la Global Health: ${url}`,
  cs: (n, d, no, url) => `Dobrý den ${n}, zde je vaše ${d} #${no} od Global Health: ${url}`,
  es: (n, d, no, url) => `Hola ${n}, aquí tiene su ${d} #${no} de Global Health: ${url}`,
};

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
          notificationLocale: true,
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
  const { resolveNotificationLang } = await import("../automation/notification-language.js");
  const { whatsappContactFooter } = await import("../automation/whatsapp-contact-footer.js");
  const lang = resolveNotificationLang({
    notificationLocale: invoice.order.notificationLocale,
    countryCode: invoice.order.countryCode,
  });
  const docLabel = INVOICE_DOC_LABEL[lang][
    invoice.documentType === "RECEIPT"
      ? "RECEIPT"
      : invoice.documentType === "CREDIT_NOTE"
        ? "CREDIT_NOTE"
        : "INVOICE"
  ];
  const token = await issueInvoicePublicCapability(invoice.id);
  if (!token) {
    log.warn({ invoiceId }, "Invoice WhatsApp resend skipped — could not mint public capability");
    return { ok: false, reason: "send_failed", message: "Could not generate the invoice link" };
  }
  const invoiceUrl = absoluteSiteUrl(
    `/print/order-invoices/${invoice.id}?token=${encodeURIComponent(token)}`,
  );
  const result = await sendWhatsAppText({
    to: invoice.order.phone,
    message:
      INVOICE_WHATSAPP_INTRO[lang](invoice.order.fullName, docLabel, invoice.invoiceNumber, invoiceUrl) +
      whatsappContactFooter(lang),
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
 *   booking was manual/AI (→ issue a separate RECEIPT beside it) rather than
 *   direct web (→ single combined INVOICE_RECEIPT).
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
 * - Manual/AI booking (an unpaid INVOICE row already exists) → keeps the INVOICE and
 *   creates a SEPARATE RECEIPT row reusing the same number, then emails the receipt.
 * - Direct-website order (no invoice yet) → creates a combined INVOICE_RECEIPT.
 * - Idempotent: an already-finalised RECEIPT / INVOICE_RECEIPT returns early.
 * - Called from ensureOrderPaidAutomations after the order is marked PAID.
 */
export async function generateInvoiceForOrder(
  orderId: string,
  log: PaymentLog = noopLog,
  opts: { skipEmail?: boolean } = {},
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

  // Already finalised (a RECEIPT or INVOICE_RECEIPT exists) → idempotent no-op,
  // so webhook retries never issue a second receipt.
  if (order.invoices.some((i) => i.documentType === "RECEIPT" || i.documentType === "INVOICE_RECEIPT")) {
    log.info({ orderId }, "Invoice already finalised — skipping");
    return;
  }

  // Manual/AI booking: an unpaid INVOICE was pre-issued at booking time. Keep that
  // INVOICE row and issue a SEPARATE RECEIPT that reuses the same number (invoiceNumber
  // is no longer DB-unique), so the order retains both the invoice and its receipt.
  const unpaidInvoice = order.invoices.find((i) => i.documentType === "INVOICE");
  if (unpaidInvoice) {
    const receipt = await prisma.invoice.create({
      data: {
        invoiceNumber: unpaidInvoice.invoiceNumber,
        orderId: order.id,
        countryCode: order.countryCode.toLowerCase(),
        emailSentTo: order.email,
        documentType: "RECEIPT",
      },
    });
    log.info(
      { orderId, invoiceId: receipt.id, invoiceNumber: receipt.invoiceNumber },
      "Receipt issued on payment (unpaid invoice row preserved)",
    );

    // create-only backfill: keep the invoice row (it shows in the invoice
    // section, unsent) but don't deliver it — the admin sends it via Resend.
    if (!opts.skipEmail) {
      await renderAndSendInvoiceDoc(
        {
          invoiceId: receipt.id,
          orderId: order.id,
          invoiceNumber: receipt.invoiceNumber,
          invoiceDateIso: receipt.generatedAt.toISOString(),
          email: order.email,
          fullName: order.fullName,
          countryCode: order.countryCode,
          documentType: "RECEIPT",
        },
        log,
      );
    }
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

  // create-only backfill: keep the row (visible + unsent in the invoice
  // section) but skip delivery — admin sends it via Resend.
  if (!opts.skipEmail) {
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
}

/**
 * Issue a CREDIT_NOTE for an order and email it to the patient. The credit note
 * reverses the order's earlier fiscal document and reuses the exact invoice PDF
 * template (title "Credit Note").
 *
 * Two reasons, and the reason is persisted on the row so re-renders and admin
 * resends keep saying the same thing:
 *   REFUND       — the paid document was refunded (red REFUNDED badge).
 *   CANCELLATION — an unpaid INVOICE was voided after the booking was cancelled
 *                  for non-payment (CANCELLED badge, no refund wording). Only
 *                  manual/AI bookings reach this: they are the only orders that
 *                  carry an invoice before payment.
 *
 * - Skips Portugal (no Invoice rows there — PT lives in InvoiceExpress).
 * - Skips prefixless countries (same rule as the invoice path).
 * - CANCELLATION additionally requires an existing document to credit — a
 *   direct-web order cancelled before payment has none, and crediting a document
 *   that was never issued would burn a CN number on nothing.
 * - Idempotent: returns the existing credit note if one was already issued.
 * - Own numbering series: CN-IE-00001, CN-CZ-00001, …
 *
 * `deliver` picks who emails the PDF:
 *   "email"  (default) — this function sends the standard credit-note email.
 *   "caller"           — returns the rendered PDF and sends nothing. The
 *                        cancellation path uses this to attach the credit note to
 *                        the "reservation cancelled" email the patient already
 *                        gets, instead of sending a second message. The caller
 *                        owns stamping emailSentAt.
 */
export async function generateCreditNoteForOrder(
  orderId: string,
  log: PaymentLog = noopLog,
  opts: { reason?: CreditNoteReason; deliver?: "email" | "caller" } = {},
): Promise<CreditNoteIssueResult | null> {
  const reason: CreditNoteReason = opts.reason ?? "REFUND";
  const deliver = opts.deliver ?? "email";
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      email: true,
      fullName: true,
      countryCode: true,
      invoices: {
        select: {
          id: true,
          invoiceNumber: true,
          documentType: true,
          creditNoteReason: true,
          generatedAt: true,
        },
      },
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

  // The document this credit note reverses. Only manual/AI bookings carry an
  // invoice before payment; a direct-web order cancelled unpaid has none, so a
  // cancellation credit note would reverse thin air — skip rather than burn a
  // CN number on nothing.
  const credited = order.invoices.find((i) => i.documentType !== "CREDIT_NOTE") ?? null;

  // Idempotent: a credit note already exists for this order.
  const already = order.invoices.find((i) => i.documentType === "CREDIT_NOTE");
  if (already) {
    log.info({ orderId, invoiceNumber: already.invoiceNumber }, "Credit note already issued — skipping");
    return {
      invoiceId: already.id,
      invoiceNumber: already.invoiceNumber,
      creditedInvoiceNumber: credited?.invoiceNumber ?? null,
      // Re-render for a caller that owns delivery — it still has an email to
      // attach this to. The "email" path already sent the document on the first
      // run and must not send it twice.
      pdfBuffer:
        deliver === "caller"
          ? await renderInvoiceDocPdf(
              {
                invoiceId: already.id,
                orderId: order.id,
                invoiceNumber: already.invoiceNumber,
                invoiceDateIso: already.generatedAt.toISOString(),
                email: order.email,
                fullName: order.fullName,
                countryCode: order.countryCode,
                documentType: "CREDIT_NOTE",
                creditNoteReason: already.creditNoteReason as CreditNoteReason | null,
              },
              log,
            )
          : undefined,
    };
  }

  if (reason === "CANCELLATION" && !credited) {
    log.info({ orderId }, "No issued document to credit — skipping cancellation credit note");
    return null;
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
      creditNoteReason: reason,
    },
  });

  log.info(
    { orderId, creditNoteNumber, invoiceId: creditNote.id, reason, credits: credited?.invoiceNumber ?? null },
    "Credit note created",
  );

  const docRef: InvoiceDocRef = {
    invoiceId: creditNote.id,
    orderId: order.id,
    invoiceNumber: creditNoteNumber,
    invoiceDateIso: creditNote.generatedAt.toISOString(),
    email: order.email,
    fullName: order.fullName,
    countryCode: order.countryCode,
    documentType: "CREDIT_NOTE",
    creditNoteReason: reason,
  };
  const result: CreditNoteIssueResult = {
    invoiceId: creditNote.id,
    invoiceNumber: creditNoteNumber,
    creditedInvoiceNumber: credited?.invoiceNumber ?? null,
  };

  if (deliver === "caller") {
    return { ...result, pdfBuffer: await renderInvoiceDocPdf(docRef, log) };
  }

  await renderAndSendInvoiceDoc(docRef, log);
  return result;
}
