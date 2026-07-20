import { env } from "../../config/env.js";
import { sendEmail } from "./send-email.js";

/**
 * Sales/accounting archive copy of every PAID fiscal document.
 *
 * The accountant's Dext inbox ingests the PDF attachment only — it parses the
 * document, not the message — so this send carries NO template, NO greeting and
 * NO body. Subject is the document number, body is blank.
 *
 * Scope (deliberately narrow, see the two gates below):
 *   - Countries: everything EXCEPT `pt` and `cz`.
 *       pt — invoices are issued and emailed by InvoiceExpress, which never hands
 *            us a PDF buffer; Portugal's bookkeeping already lives there.
 *       cz — the Czech entity (IČO 19071680) is booked separately.
 *   - Documents: only the PAID ones (RECEIPT, INVOICE_RECEIPT). An unpaid
 *     INVOICE and a CREDIT_NOTE are not forwarded.
 *
 * Sent once, at issuance. Admin "resend to patient" does NOT re-forward, so the
 * accountant never receives the same document twice.
 */

/** Baked-in recipient so production works without touching Railway variables. */
const DEFAULT_SALES_INVOICE_COPY_EMAIL = "nuno.figueira.global.guest.s.r.o+sales@dext.cc";

/** Countries that do NOT get an archive copy. Lowercase `Country.code`. */
const EXCLUDED_COUNTRY_CODES = new Set(["pt", "cz"]);

/** Document types that represent money actually received. */
const PAID_DOCUMENT_TYPES = new Set(["RECEIPT", "INVOICE_RECEIPT"]);

/**
 * Recipient, or null when the forward is switched off.
 *
 * Locally the backend runs against the LIVE database, so an unguarded forward
 * would push test documents straight into the accountant's real inbox. Outside
 * production the forward therefore stays off unless SALES_INVOICE_COPY_EMAIL is
 * set explicitly (which is also how you point it at your own address to test).
 */
export function salesInvoiceCopyRecipient(): string | null {
  const configured = env.SALES_INVOICE_COPY_EMAIL?.trim();
  if (configured) {
    return configured.toLowerCase() === "off" ? null : configured;
  }
  if (env.NODE_ENV !== "production") return null;
  return DEFAULT_SALES_INVOICE_COPY_EMAIL;
}

/** True when this country + document type qualifies for the archive copy. */
export function shouldCopyInvoiceToSales(countryCode: string, documentType: string): boolean {
  if (!PAID_DOCUMENT_TYPES.has(documentType)) return false;
  return !EXCLUDED_COUNTRY_CODES.has(countryCode.trim().toLowerCase());
}

type CopyLog = {
  info: (obj: Record<string, unknown>, msg: string) => void;
  warn: (obj: Record<string, unknown>, msg: string) => void;
};

/**
 * Forward the rendered PDF to the accounting inbox. Never throws — the archive
 * copy is a downstream convenience and must never affect the patient's document
 * or the Invoice row.
 */
export async function sendSalesInvoiceCopy(
  opts: {
    invoiceId: string;
    invoiceNumber: string;
    countryCode: string;
    documentType: string;
    pdfBuffer?: Buffer;
  },
  log: CopyLog,
): Promise<void> {
  if (!shouldCopyInvoiceToSales(opts.countryCode, opts.documentType)) return;

  const to = salesInvoiceCopyRecipient();
  if (!to) return;

  // No PDF means nothing to archive — a body-less email with no attachment is
  // pure noise in the accountant's inbox.
  if (!opts.pdfBuffer) {
    log.warn(
      { invoiceId: opts.invoiceId, invoiceNumber: opts.invoiceNumber },
      "Sales invoice copy skipped — PDF render produced no buffer",
    );
    return;
  }

  const filenamePrefix = opts.documentType === "RECEIPT" ? "receipt" : "invoice";

  try {
    // A single space, not "": SendGrid rejects zero-length content. It renders
    // as an empty message, which is what the accountant asked for.
    const result = await sendEmail({
      to,
      subject: opts.invoiceNumber,
      text: " ",
      html: " ",
      attachments: [
        {
          filename: `${filenamePrefix}-${opts.invoiceNumber}.pdf`,
          content: opts.pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });
    if (!result.ok) {
      log.warn(
        { invoiceId: opts.invoiceId, invoiceNumber: opts.invoiceNumber, message: result.message },
        "Sales invoice copy failed",
      );
      return;
    }
    log.info(
      {
        invoiceId: opts.invoiceId,
        invoiceNumber: opts.invoiceNumber,
        countryCode: opts.countryCode.toLowerCase(),
        documentType: opts.documentType,
      },
      "Sales invoice copy sent",
    );
  } catch (err) {
    log.warn(
      { err, invoiceId: opts.invoiceId, invoiceNumber: opts.invoiceNumber },
      "Sales invoice copy failed",
    );
  }
}
