import type { AdminServiceDto, AdminServiceKind } from "@/lib/admin/admin-api";

export const SERVICE_KIND_ORDER: AdminServiceKind[] = [
  "GENERAL",
  "SPECIALIST",
  "PRESCRIPTION",
  // ASYNC_PRESCRIPTION (cross-border) is no longer a catalogue service — it is
  // configured per prescribing doctor on the doctor edit page. Kept out of the
  // Services section entirely.
];

type ServiceKindMeta = {
  label: string;
  singularLabel: string;
  shortLabel: string;
  listHref: string;
  newHref: string;
  pageTitle: string;
  addLabel: string;
  emptySpecialtyLabel: string;
};

/**
 * Service labels were renamed for Google Ads compliance. The enum
 * (`AdminServiceKind`) stays at GENERAL / SPECIALIST / PRESCRIPTION
 * / HEALTH_TEST so the database, URLs in flight, and existing service
 * rows don't need migration — only display copy + admin sidebar paths
 * change. Old public slugs are preserved via 301 redirects in
 * `next.config.ts`.
 *
 * Rationale per label:
 *   - "Online doctor visit" — describes the product; avoids "general
 *     consultation" which Google's medical policy flags as generic
 *     medical advice.
 *   - "Specialist appointment" — anchors on the booking action; safer
 *     than "specialist consultation" near restricted condition copy.
 *   - "Repeat prescription request" — explicitly scopes to existing
 *     prescriptions, avoiding "online prescription" which implies
 *     issuing controlled meds without exam.
 *   - "Lab test booking" — clarifies the scope (scheduling) instead
 *     of suggesting diagnostic services.
 */
/**
 * Final user-approved labels + public slugs for Google Ads compliance.
 * Enum (`AdminServiceKind`) stays GENERAL/SPECIALIST/PRESCRIPTION/
 * HEALTH_TEST so the DB, existing Service rows, and admin sidebar
 * paths don't need migration — only display copy + public URLs change.
 * Old public slugs are preserved via 301 redirects in `next.config.ts`.
 */
export const SERVICE_KIND_META: Record<AdminServiceKind, ServiceKindMeta> = {
  GENERAL: {
    label: "Book a GP Appointment",
    singularLabel: "GP appointment",
    shortLabel: "GP",
    listHref: "/admin/general-consultations",
    newHref: "/admin/general-consultations/new",
    pageTitle: "Book a GP Appointment",
    addLabel: "Add GP appointment",
    emptySpecialtyLabel: "Not used",
  },
  SPECIALIST: {
    label: "See a Specialist",
    singularLabel: "Specialist appointment",
    shortLabel: "Specialist",
    listHref: "/admin/specialist-consultations",
    newHref: "/admin/specialist-consultations/new",
    pageTitle: "See a Specialist",
    addLabel: "Add specialist appointment",
    emptySpecialtyLabel: "Required",
  },
  PRESCRIPTION: {
    label: "Repeat Prescription Request",
    singularLabel: "Repeat prescription request",
    shortLabel: "Repeat Rx",
    listHref: "/admin/online-prescriptions",
    newHref: "/admin/online-prescriptions/new",
    pageTitle: "Repeat Prescription Request",
    addLabel: "Add repeat prescription request",
    emptySpecialtyLabel: "Not used",
  },
  HEALTH_TEST: {
    label: "Lab Test Booking",
    singularLabel: "Lab test booking",
    shortLabel: "Lab test",
    listHref: "/admin/health-tests",
    newHref: "/admin/health-tests/new",
    pageTitle: "Lab Test Booking",
    addLabel: "Add lab test booking",
    emptySpecialtyLabel: "Not used",
  },
  HOME_DELIVERY: {
    label: "Home Delivery",
    singularLabel: "Home delivery service",
    shortLabel: "Delivery",
    listHref: "/admin/home-delivery",
    newHref: "/admin/home-delivery/new",
    pageTitle: "Home Delivery",
    addLabel: "Add home delivery service",
    emptySpecialtyLabel: "Not used",
  },
  ASYNC_PRESCRIPTION: {
    label: "Cross-Border Prescription",
    singularLabel: "cross-border prescription service",
    shortLabel: "Cross-border Rx",
    // Inner admin-only service — managed through the generic services screens
    // (no dedicated public catalogue section; it is never listed publicly).
    listHref: "/admin/services?kind=ASYNC_PRESCRIPTION",
    newHref: "/admin/services/new?kind=ASYNC_PRESCRIPTION",
    pageTitle: "Cross-Border Prescription",
    addLabel: "Add cross-border prescription service",
    emptySpecialtyLabel: "Not used",
  },
};

export function isAdminServiceKind(value: string | undefined | null): value is AdminServiceKind {
  return value === "GENERAL" ||
    value === "SPECIALIST" ||
    value === "PRESCRIPTION" ||
    value === "HEALTH_TEST" ||
    value === "HOME_DELIVERY" ||
    value === "ASYNC_PRESCRIPTION";
}

export function readServiceKind(value: string | undefined | null, fallback: AdminServiceKind = "GENERAL"): AdminServiceKind {
  return isAdminServiceKind(value) ? value : fallback;
}

export function adminHrefForService(service: Pick<AdminServiceDto, "id" | "kind">, mode: "view" | "edit" = "view") {
  const base = `/admin/services/${service.id}`;
  const path = mode === "edit" ? `${base}/edit` : base;
  return `${path}?kind=${encodeURIComponent(service.kind)}`;
}
