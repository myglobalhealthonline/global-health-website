import type { Metadata } from "next";

export type BookingWorkflowSearchParams = Record<
  string,
  string | string[] | undefined
>;

/**
 * Tracking keys are the only query parameters that do not represent booking
 * state. Everything else fails closed as `noindex`, including future wizard
 * parameters, while `/book?utm_source=...` keeps the clean page's normal
 * indexability and canonicalises to `/book`.
 */
const TRACKING_PARAM_KEYS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "gclid",
  // Google appends these itself: `srsltid` on free-listing/organic clicks,
  // `_gl` via the GA4 cross-domain linker, `wbraid`/`gbraid` on Ads clicks.
  // Treating them as booking state would noindex a real organic landing hit.
  "srsltid",
  "_gl",
  "wbraid",
  "gbraid",
  "fbclid",
  "msclkid",
  "ttclid",
  "li_fat_id",
  "mc_cid",
  "mc_eid",
]);

export function hasBookingWorkflowParams(
  searchParams: BookingWorkflowSearchParams | undefined,
): boolean {
  if (!searchParams) return false;
  return Object.keys(searchParams).some((key) => !TRACKING_PARAM_KEYS.has(key));
}

/** Keep the clean canonical metadata but exclude wizard-state URL variants. */
export function applyBookingWorkflowIndexing(
  metadata: Metadata,
  searchParams: BookingWorkflowSearchParams | undefined,
): Metadata {
  if (!hasBookingWorkflowParams(searchParams)) return metadata;
  return { ...metadata, robots: { index: false, follow: true } };
}
