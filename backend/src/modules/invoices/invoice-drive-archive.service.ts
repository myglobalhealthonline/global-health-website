import { env } from "../../config/env.js";
import {
  ensureFolderPath,
  isGoogleDriveConfigured,
  uploadFileIfAbsent,
} from "../../lib/google-drive/drive.service.js";

/**
 * Google Drive archive of every PAID fiscal document.
 *
 * Folder layout, under the configured root ("Invoice"):
 *
 *   Invoice/<COUNTRY>/<YYYY-MM>/<YYYY-MM-DD>_<document number>.pdf
 *
 *   COUNTRY  uppercase `Country.code` — IE, CZ, ES, RO, BR, PT. Matches the
 *            invoice-number prefixes, so `IE/` holds exactly the IE- series.
 *   YYYY-MM  the month the document was ISSUED, in UTC. UTC, not local time,
 *            so a payment at 23:40 in Lisbon files into the same month on every
 *            worker and in every re-run of the backfill.
 *
 * Scope: RECEIPT and INVOICE_RECEIPT — money actually received — in all six
 * markets, Portugal included (its PDF is the stored InvoiceExpress copy, see
 * pt-invoice-mirror.service.ts). An unpaid INVOICE and a CREDIT_NOTE are NOT
 * archived; the folder is a record of revenue, not of every document drawn.
 *
 * Nothing before ARCHIVE_MIN_MONTH is ever filed — the archive starts at
 * August 2026 by decision, and a late credit-note re-render or a replayed old
 * webhook must not quietly open a July folder behind the accountant's back.
 *
 * Never throws. The archive is downstream of a document that is already issued,
 * emailed and legally binding; a Drive outage must not touch any of that.
 */

/** First month the Drive archive covers. Anything earlier is skipped. */
export const ARCHIVE_MIN_MONTH = "2026-08";

/** Document types that represent money actually received. */
const PAID_DOCUMENT_TYPES = new Set(["RECEIPT", "INVOICE_RECEIPT"]);

type ArchiveLog = {
  info: (obj: Record<string, unknown>, msg: string) => void;
  warn: (obj: Record<string, unknown>, msg: string) => void;
};

/**
 * True when the archive should run at all.
 *
 * Locally the backend runs against the LIVE database, so an unguarded upload
 * would push test documents into the real accounting Drive. Outside production
 * the archive therefore stays off unless INVOICE_DRIVE_ARCHIVE=on is set
 * explicitly (which is also how you point a local run at your own test folder).
 * `off` force-disables it anywhere, production included.
 */
export function isInvoiceDriveArchiveEnabled(): boolean {
  const flag = env.INVOICE_DRIVE_ARCHIVE?.trim().toLowerCase();
  if (flag === "off") return false;
  if (!isGoogleDriveConfigured()) return false;
  if (flag === "on") return true;
  return env.NODE_ENV === "production";
}

/** `YYYY-MM` of a document date, in UTC. */
export function archiveMonth(issuedAt: Date): string {
  return issuedAt.toISOString().slice(0, 7);
}

/** `[COUNTRY, YYYY-MM]` — the folder chain under the "Invoice" root. */
export function archiveFolderSegments(countryCode: string, issuedAt: Date): string[] {
  return [countryCode.trim().toUpperCase(), archiveMonth(issuedAt)];
}

/**
 * Filename: date first so a folder sorts chronologically, then the document
 * number. Portugal's InvoiceExpress numbers carry a slash ("202/Globalhealth"),
 * which Drive shows as a path separator in some clients — flattened here.
 */
export function archiveFileName(invoiceNumber: string, issuedAt: Date): string {
  const safeNumber = invoiceNumber.trim().replace(/[\\/:*?"<>|]+/g, "-");
  return `${issuedAt.toISOString().slice(0, 10)}_${safeNumber}.pdf`;
}

/** True when this document type + issue date belongs in the Drive archive. */
export function shouldArchiveInvoiceToDrive(documentType: string, issuedAt: Date): boolean {
  if (!PAID_DOCUMENT_TYPES.has(documentType)) return false;
  return archiveMonth(issuedAt) >= ARCHIVE_MIN_MONTH;
}

export type InvoiceArchiveInput = {
  invoiceId: string;
  invoiceNumber: string;
  countryCode: string;
  documentType: string;
  /** Document issue date — `Invoice.generatedAt`. */
  issuedAt: Date;
  pdfBuffer?: Buffer;
};

export type InvoiceArchiveResult =
  | { status: "uploaded"; fileId: string; path: string }
  | { status: "exists"; fileId: string; path: string }
  | { status: "skipped"; reason: "disabled" | "out_of_scope" | "no_pdf" }
  | { status: "failed"; message: string };

/**
 * File one document into Drive. Idempotent on the filename, so a webhook retry
 * or a second backfill pass finds the copy already there and does nothing.
 */
export async function archiveInvoiceToDrive(
  opts: InvoiceArchiveInput,
  log: ArchiveLog,
): Promise<InvoiceArchiveResult> {
  if (!isInvoiceDriveArchiveEnabled()) return { status: "skipped", reason: "disabled" };
  if (!shouldArchiveInvoiceToDrive(opts.documentType, opts.issuedAt)) {
    return { status: "skipped", reason: "out_of_scope" };
  }

  // No PDF means nothing to archive. Worth a warning: the document exists and
  // the accountant's folder will be missing it until someone re-runs the
  // backfill for that month.
  if (!opts.pdfBuffer?.length) {
    log.warn(
      { invoiceId: opts.invoiceId, invoiceNumber: opts.invoiceNumber },
      "Drive invoice archive skipped — no PDF buffer",
    );
    return { status: "skipped", reason: "no_pdf" };
  }

  const segments = archiveFolderSegments(opts.countryCode, opts.issuedAt);
  const fileName = archiveFileName(opts.invoiceNumber, opts.issuedAt);
  const path = `${segments.join("/")}/${fileName}`;

  try {
    const folderId = await ensureFolderPath(
      segments,
      env.GOOGLE_DRIVE_INVOICE_ROOT_FOLDER_ID!.trim(),
    );
    const { fileId, created } = await uploadFileIfAbsent({
      name: fileName,
      parentId: folderId,
      body: opts.pdfBuffer,
      mimeType: "application/pdf",
    });

    if (created) {
      log.info(
        { invoiceId: opts.invoiceId, invoiceNumber: opts.invoiceNumber, path, fileId },
        "Invoice archived to Drive",
      );
    }
    return created ? { status: "uploaded", fileId, path } : { status: "exists", fileId, path };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn(
      { err, invoiceId: opts.invoiceId, invoiceNumber: opts.invoiceNumber, path },
      "Drive invoice archive failed — document still issued",
    );
    return { status: "failed", message };
  }
}
