/**
 * Shared breadcrumb helpers for PortalShell / AdminShell.
 *
 * Route slugs are sometimes a patient email (e.g. /doctor/patients/[email],
 * /admin/patients/[email]) — per the GDPR plan (see lib/api/doctor-api.ts
 * DoctorPatient.email) that value must never render as visible text.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** True if a raw (possibly URL-encoded) path segment decodes to an email address. */
export function isEmailSegment(rawSegment: string): boolean {
  let decoded = rawSegment;
  try {
    decoded = decodeURIComponent(rawSegment);
  } catch {
    // malformed encoding — fall through with the raw segment
  }
  return EMAIL_RE.test(decoded);
}

/** Generic, non-PII label to show in place of an email path segment. */
export const PII_SAFE_CRUMB_LABEL = "Patient record";
