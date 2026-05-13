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

export const SERVICE_KIND_META: Record<AdminServiceKind, ServiceKindMeta> = {
  GENERAL: {
    label: "General Consultations",
    singularLabel: "General consultation",
    shortLabel: "General",
    listHref: "/admin/general-consultations",
    newHref: "/admin/general-consultations/new",
    pageTitle: "General Consultations",
    addLabel: "Add general consultation",
    emptySpecialtyLabel: "Not used",
  },
  SPECIALIST: {
    label: "Specialist Consultations",
    singularLabel: "Specialist consultation",
    shortLabel: "Specialist",
    listHref: "/admin/specialist-consultations",
    newHref: "/admin/specialist-consultations/new",
    pageTitle: "Specialist Consultations",
    addLabel: "Add specialist consultation",
    emptySpecialtyLabel: "Required",
  },
  PRESCRIPTION: {
    label: "Online Prescriptions",
    singularLabel: "Online prescription",
    shortLabel: "Prescription",
    listHref: "/admin/online-prescriptions",
    newHref: "/admin/online-prescriptions/new",
    pageTitle: "Online Prescriptions",
    addLabel: "Add online prescription",
    emptySpecialtyLabel: "Not used",
  },
  HEALTH_TEST: {
    label: "Health Tests",
    singularLabel: "Health test",
    shortLabel: "Health test",
    listHref: "/admin/health-tests",
    newHref: "/admin/health-tests/new",
    pageTitle: "Health Tests",
    addLabel: "Add health test",
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
