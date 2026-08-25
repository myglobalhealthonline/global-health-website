import { prisma } from "../../db/prisma.js";
import {
  getDocument,
  fetchDocumentPdf,
  type IeDocumentType,
} from "../../lib/invoice-express/client.js";
import { isObjectStorageConfigured, putObject } from "../../services/object-storage.js";
import { emitOpsAlert } from "../subscriptions/ops/ops-alert.js";
import type { PaymentLog } from "../orders/complete-order-payment.service.js";

const noopLog: PaymentLog = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

/**
 * Mirror a finalized InvoiceExpress document into our own world: one `invoices`
 * row plus a stored copy of the PDF.
 *
 * Portugal's legal Fatura-Recibo is issued by InvoiceExpress, not drawn by us,
 * so before this a PT order had no `invoices` row — the patient portal listed
 * nothing and an admin had nothing to resend. The row makes a PT document
 * behave like every other market's in both portals.
 *
 * The PDF is COPIED, not linked. InvoiceExpress renders PDFs behind a signed S3
 * URL that expires, and these are fiscal documents we must be able to produce
 * years later regardless of the state of a third-party account.
 *
 * Never throws — a mirror failure must not touch a paid order or unwind an
 * already-issued legal document. It ops-alerts and leaves the order's
 * `invoiceExpressId` in place, so a retry (admin re-run, or the next call for
 * the same document) can complete it.
 */
export async function mirrorPortugalInvoiceDocument(
  orderId: string,
  invoiceExpressId: number,
  invoiceExpressType: IeDocumentType,
  log: PaymentLog = noopLog,
): Promise<void> {
  try {
    const existing = await prisma.invoice.findUnique({
      where: { invoiceExpressId: String(invoiceExpressId) },
      select: { id: true, pdfStorageKey: true },
    });
    if (existing?.pdfStorageKey) {
      log.info({ orderId, invoiceExpressId }, "PT invoice already mirrored — skipping");
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, countryCode: true },
    });
    if (!order) {
      log.warn({ orderId }, "mirrorPortugalInvoiceDocument: order not found");
      return;
    }

    const doc = await getDocument(invoiceExpressId, invoiceExpressType);

    // Storage is the whole point of this function — without it there is no copy
    // to keep, and a row pointing at nothing would show the patient a download
    // button that 404s.
    if (!isObjectStorageConfigured()) {
      throw new Error("Object storage is not configured — cannot store the PT invoice PDF");
    }
    const pdf = await fetchDocumentPdf(invoiceExpressId);
    const storageKey = `invoices/pt/${order.id}/${invoiceExpressId}.pdf`;
    await putObject(storageKey, pdf, "application/pdf");

    // Keyed on invoiceExpressId (unique), so a retry after a half-finished run
    // updates the same row instead of minting a second document for one
    // InvoiceExpress id.
    await prisma.invoice.upsert({
      where: { invoiceExpressId: String(invoiceExpressId) },
      create: {
        invoiceNumber: doc.sequence_number,
        orderId: order.id,
        countryCode: order.countryCode,
        documentType: "INVOICE_RECEIPT",
        invoiceExpressId: String(invoiceExpressId),
        invoiceExpressType,
        invoiceExpressPermalink: doc.permalink ?? null,
        pdfStorageKey: storageKey,
      },
      update: {
        invoiceNumber: doc.sequence_number,
        invoiceExpressPermalink: doc.permalink ?? null,
        pdfStorageKey: storageKey,
      },
    });

    log.info(
      { orderId, invoiceExpressId, invoiceNumber: doc.sequence_number, storageKey },
      "PT InvoiceExpress document mirrored",
    );
  } catch (err) {
    log.warn({ err, orderId, invoiceExpressId }, "PT invoice mirror failed — document still issued");
    await emitOpsAlert({
      severity: "warning",
      title: "PT InvoiceExpress mirror failed",
      detail:
        `The legal document was issued but could not be copied into the portals, so the patient ` +
        `cannot download it and an admin cannot resend it: ` +
        (err instanceof Error ? err.message : String(err)),
      context: { orderId, invoiceExpressId },
    });
  }
}
