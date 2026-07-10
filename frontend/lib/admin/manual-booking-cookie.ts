/** Short-lived httpOnly cookie that carries the manual-booking recovery
 *  details (temp password, invite + payment links) to the detail page,
 *  so these secrets never appear in the URL / server logs / history.
 *
 *  Lives outside app/(admin)/admin/appointments/new/page.tsx (a Next page
 *  module) — a page file may only export `default`/known Next hooks; any
 *  other export fails the build's page-type check (P-021). */
export const MANUAL_BOOKING_COOKIE = "gh_manual_booking";
