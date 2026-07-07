import { randomUUID } from "node:crypto";
import { listObjects } from "../../services/object-storage.js";
import { sanitizeOriginalFilename } from "../../utils/media-key.js";

/**
 * Storage helpers for doctor-uploaded payout invoices. Files live under a
 * doctor-scoped S3 prefix — NO DB row — so the "simple upload slot" reuses
 * the existing object store without a schema migration.
 *
 * Key shape: `payout-invoices/<doctorId>/<period>__<uuid>-<safeName>`
 *   - period  = YYYY-MM the invoice covers (parsed back out for display)
 *   - doctorId = cuid, used to scope both list + download access
 */

export const PAYOUT_INVOICE_PREFIX = "payout-invoices";

export const PAYOUT_INVOICE_ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const PAYOUT_INVOICE_MAX_BYTES = 10 * 1024 * 1024;

const PERIOD_RE = /^\d{4}-\d{2}$/;

export function doctorPrefix(doctorId: string): string {
  return `${PAYOUT_INVOICE_PREFIX}/${doctorId}/`;
}

export function buildPayoutInvoiceKey(
  doctorId: string,
  period: string,
  originalName: string,
): string {
  const safe = sanitizeOriginalFilename(originalName || "invoice");
  return `${doctorPrefix(doctorId)}${period}__${randomUUID()}-${safe}`;
}

export function isValidPeriod(period: string): boolean {
  return PERIOD_RE.test(period);
}

export type PayoutInvoiceItem = {
  key: string;
  doctorId: string;
  period: string;
  filename: string;
  size: number;
  uploadedAt: string | null;
};

/** Parse a storage key back into its display parts. Returns null if the key
 *  doesn't match the expected shape (defends the download route). */
export function parsePayoutInvoiceKey(key: string): {
  doctorId: string;
  period: string;
  filename: string;
} | null {
  if (key.includes("..") || key.includes("\\")) return null;
  const parts = key.split("/");
  if (parts.length !== 3) return null;
  const [prefix, doctorId, rest] = parts;
  if (prefix !== PAYOUT_INVOICE_PREFIX || !doctorId) return null;
  const sep = rest.indexOf("__");
  if (sep === -1) return null;
  const period = rest.slice(0, sep);
  if (!isValidPeriod(period)) return null;
  // Strip the `<uuid>-` prefix from the stored name for a clean display name.
  const stored = rest.slice(sep + 2);
  const filename = stored.replace(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/,
    "",
  );
  return { doctorId, period, filename };
}

function toItem(key: string, size: number, uploadedAt: Date | null): PayoutInvoiceItem | null {
  const parsed = parsePayoutInvoiceKey(key);
  if (!parsed) return null;
  return {
    key,
    doctorId: parsed.doctorId,
    period: parsed.period,
    filename: parsed.filename,
    size,
    uploadedAt: uploadedAt ? uploadedAt.toISOString() : null,
  };
}

/** Uploaded invoices for one doctor, newest first. */
export async function listDoctorPayoutInvoices(
  doctorId: string,
): Promise<PayoutInvoiceItem[]> {
  const objects = await listObjects(doctorPrefix(doctorId));
  return objects
    .map((o) => toItem(o.key, o.size, o.lastModified))
    .filter((i): i is PayoutInvoiceItem => i !== null)
    .sort((a, b) => (b.uploadedAt ?? "").localeCompare(a.uploadedAt ?? ""));
}

/** Every doctor's uploaded invoices (admin view), newest first. */
export async function listAllPayoutInvoices(): Promise<PayoutInvoiceItem[]> {
  const objects = await listObjects(`${PAYOUT_INVOICE_PREFIX}/`);
  return objects
    .map((o) => toItem(o.key, o.size, o.lastModified))
    .filter((i): i is PayoutInvoiceItem => i !== null)
    .sort((a, b) => (b.uploadedAt ?? "").localeCompare(a.uploadedAt ?? ""));
}
