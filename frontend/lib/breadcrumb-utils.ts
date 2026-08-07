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

export type Crumb = {
  label: string;
  href: string | null;
  isRecord?: boolean;
  /** Raw path segment this crumb was derived from — the key <SetCrumbTitle
   *  segment="…"> matches against. Absent on synthetic crumbs (root, the
   *  topbar country context) which no page can name. */
  segment?: string;
};

/**
 * Key used by a <SetCrumbTitle> that names no segment: "whichever record
 * crumb this page bottoms out at". Kept as a key in the same map so one
 * setter serves both forms.
 */
export const TRAILING_CRUMB_KEY = "";

/**
 * Overlay page-supplied labels onto a pathname-derived trail.
 *
 * Keyed titles land on the crumb built from that exact segment, so a route
 * with two dynamic segments (/memberships/<planId>/members/<enrollmentId>)
 * can name both. The unkeyed title lands on the LAST record crumb — on
 * /plans/<id>/edit that is the id rather than "Edit", and on a two-id route
 * it is the leaf record rather than its ancestor (which used to take it).
 */
export function applyCrumbTitles(crumbs: Crumb[], titles: Record<string, string>): Crumb[] {
  const trailingTitle = titles[TRAILING_CRUMB_KEY];
  let trailingIndex = -1;
  if (trailingTitle !== undefined && crumbs.length > 0) {
    for (let i = crumbs.length - 1; i >= 0; i--) {
      if (crumbs[i].isRecord) {
        trailingIndex = i;
        break;
      }
    }
    if (trailingIndex === -1) trailingIndex = crumbs.length - 1;
  }
  if (trailingIndex === -1 && Object.keys(titles).length === 0) return crumbs;
  return crumbs.map((crumb, i) => {
    const keyed = crumb.segment ? titles[crumb.segment] : undefined;
    if (keyed !== undefined) return { ...crumb, label: keyed };
    if (i === trailingIndex) return { ...crumb, label: trailingTitle as string };
    return crumb;
  });
}
