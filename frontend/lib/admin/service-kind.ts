import type { AdminServiceDto, AdminServiceKind } from "@/lib/admin/admin-api";

export const SERVICE_KIND_ORDER: AdminServiceKind[] = [
  "GENERAL",
  "SPECIALIST",
  "PRESCRIPTION",
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
export const SERVICE_KIND_META: Record<AdminServiceKind, ServiceKindMeta> = {
  GENERAL: {
    label: "Online Doctor Visits",
    singularLabel: "Online doctor visit",
    shortLabel: "Doctor visit",
    listHref: "/admin/general-consultations",
    newHref: "/admin/general-consultations/new",
    pageTitle: "Online Doctor Visits",
    addLabel: "Add online doctor visit",
    emptySpecialtyLabel: "Not used",
  },
  SPECIALIST: {
    label: "Specialist Appointments",
    singularLabel: "Specialist appointment",
    shortLabel: "Specialist",
    listHref: "/admin/specialist-consultations",
    newHref: "/admin/specialist-consultations/new",
    pageTitle: "Specialist Appointments",
    addLabel: "Add specialist appointment",
    emptySpecialtyLabel: "Required",
  },
  PRESCRIPTION: {
    label: "Repeat Prescription Requests",
    singularLabel: "Repeat prescription request",
    shortLabel: "Repeat Rx",
    listHref: "/admin/online-prescriptions",
    newHref: "/admin/online-prescriptions/new",
    pageTitle: "Repeat Prescription Requests",
    addLabel: "Add repeat prescription request",
    emptySpecialtyLabel: "Not used",
  },
  HEALTH_TEST: {
    label: "Lab Test Bookings",
    singularLabel: "Lab test booking",
    shortLabel: "Lab test",
    listHref: "/admin/health-tests",
    newHref: "/admin/health-tests/new",
    pageTitle: "Lab Test Bookings",
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
};

export function isAdminServiceKind(value: string | undefined | null): value is AdminServiceKind {
  return value === "GENERAL" ||
    value === "SPECIALIST" ||
    value === "PRESCRIPTION" ||
    value === "HEALTH_TEST" ||
    value === "HOME_DELIVERY";
}

export function readServiceKind(value: string | undefined | null, fallback: AdminServiceKind = "GENERAL"): AdminServiceKind {
  return isAdminServiceKind(value) ? value : fallback;
}

export function adminHrefForService(service: Pick<AdminServiceDto, "id" | "kind">, mode: "view" | "edit" = "view") {
  const base = `/admin/services/${service.id}`;
  const path = mode === "edit" ? `${base}/edit` : base;
  return `${path}?kind=${encodeURIComponent(service.kind)}`;
}
