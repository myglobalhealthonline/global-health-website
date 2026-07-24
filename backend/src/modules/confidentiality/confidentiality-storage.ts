import { randomUUID } from "node:crypto";
import { listObjects } from "../../services/object-storage.js";
import { sanitizeOriginalFilename } from "../../utils/media-key.js";

/**
 * Storage helpers for the doctor-uploaded, hand-signed copy of the
 * confidentiality agreement.
 *
 * Same shape as `payout-invoice-storage.ts`: files live under a doctor-scoped
 * S3 prefix with NO DB row, so the upload slot reuses the object store without
 * a schema migration on the live database. The in-portal click-to-accept flow
 * (DoctorConfidentialityAgreement rows) is untouched and remains the record
 * that gates PHI access — the signed PDF is supporting paper evidence.
 *
 * Key shape: `doctor-confidentiality/<doctorId>/<version>__<uuid>-<safeName>`
 *   - version  = agreement version the doctor signed (parsed back for display)
 *   - doctorId = cuid, used to scope both list + download access
 */

export const CONFIDENTIALITY_SIGNED_PREFIX = "doctor-confidentiality";

export const CONFIDENTIALITY_SIGNED_ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const CONFIDENTIALITY_SIGNED_MAX_BYTES = 10 * 1024 * 1024;

const VERSION_RE = /^\d+\.\d+\.\d+$/;

export function isValidAgreementVersion(version: string): boolean {
  return VERSION_RE.test(version);
}

export function confidentialityDoctorPrefix(doctorId: string): string {
  return `${CONFIDENTIALITY_SIGNED_PREFIX}/${doctorId}/`;
}

export function buildSignedAgreementKey(
  doctorId: string,
  version: string,
  originalName: string,
): string {
  const safe = sanitizeOriginalFilename(originalName || "signed-agreement");
  return `${confidentialityDoctorPrefix(doctorId)}${version}__${randomUUID()}-${safe}`;
}

export type SignedAgreementItem = {
  key: string;
  doctorId: string;
  agreementVersion: string;
  filename: string;
  size: number;
  uploadedAt: string | null;
};

/** Parse a storage key back into its display parts. Returns null when the key
 *  doesn't match the expected shape (this is what defends the download routes
 *  against a caller-supplied `?key=`). */
export function parseSignedAgreementKey(key: string): {
  doctorId: string;
  agreementVersion: string;
  filename: string;
} | null {
  if (key.includes("..") || key.includes("\\")) return null;
  const parts = key.split("/");
  if (parts.length !== 3) return null;
  const [prefix, doctorId, rest] = parts;
  if (prefix !== CONFIDENTIALITY_SIGNED_PREFIX || !doctorId) return null;
  const sep = rest.indexOf("__");
  if (sep === -1) return null;
  const agreementVersion = rest.slice(0, sep);
  if (!isValidAgreementVersion(agreementVersion)) return null;
  // Strip the `<uuid>-` prefix from the stored name for a clean display name.
  const filename = rest
    .slice(sep + 2)
    .replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/, "");
  return { doctorId, agreementVersion, filename };
}

function toItem(
  key: string,
  size: number,
  uploadedAt: Date | null,
): SignedAgreementItem | null {
  const parsed = parseSignedAgreementKey(key);
  if (!parsed) return null;
  return {
    key,
    doctorId: parsed.doctorId,
    agreementVersion: parsed.agreementVersion,
    filename: parsed.filename,
    size,
    uploadedAt: uploadedAt ? uploadedAt.toISOString() : null,
  };
}

/** Signed copies uploaded by one doctor, newest first. */
export async function listDoctorSignedAgreements(
  doctorId: string,
): Promise<SignedAgreementItem[]> {
  const objects = await listObjects(confidentialityDoctorPrefix(doctorId));
  return objects
    .map((o) => toItem(o.key, o.size, o.lastModified))
    .filter((i): i is SignedAgreementItem => i !== null)
    .sort((a, b) => (b.uploadedAt ?? "").localeCompare(a.uploadedAt ?? ""));
}

/** Every doctor's signed copies (admin overview), newest first. */
export async function listAllSignedAgreements(): Promise<SignedAgreementItem[]> {
  const objects = await listObjects(`${CONFIDENTIALITY_SIGNED_PREFIX}/`);
  return objects
    .map((o) => toItem(o.key, o.size, o.lastModified))
    .filter((i): i is SignedAgreementItem => i !== null)
    .sort((a, b) => (b.uploadedAt ?? "").localeCompare(a.uploadedAt ?? ""));
}
