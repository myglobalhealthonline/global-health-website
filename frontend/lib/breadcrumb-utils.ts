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

// Prisma cuid (25 alphanum) or hyphenated UUID (36 chars) — legacy/seeded
// records use UUIDs, so a length-25-only check lets raw ids leak into
// breadcrumbs as "Bf0bf90b A31e 4b35…".
const CUID_RE = /^[a-z0-9]{25}$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True if a path segment is an opaque record id (cuid or UUID). */
export function isIdSegment(segment: string): boolean {
  return CUID_RE.test(segment) || UUID_RE.test(segment);
}

/** Short display form for an opaque id segment ("bf0bf90b…"). */
export function shortIdLabel(segment: string): string {
  return `${segment.slice(0, 8)}…`;
}
