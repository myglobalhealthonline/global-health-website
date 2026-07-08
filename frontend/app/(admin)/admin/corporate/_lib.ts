import type { PillTone } from "../_components/atoms";
import type {
  CorporateCompanyStatus,
  CorporateMemberStatus,
  CorporateServiceKind,
} from "@/lib/admin/admin-api/corporate";

/** cents → "€180.00" (symbol from the plan's currencyCode). */
export function formatCents(cents: number, currencyCode: string): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: currencyCode || "EUR",
  }).format(cents / 100);
}

const MEMBER_STATUS_LABELS: Record<CorporateMemberStatus, string> = {
  DRAFT: "Draft",
  INVITED: "Invited",
  INVITE_SENT: "Invite sent",
  INVITE_FAILED: "Invite failed",
  REGISTERED: "Registered",
  PROFILE_INCOMPLETE: "Profile incomplete",
  PROFILE_COMPLETE: "Profile complete",
  PREASSESSMENT_PENDING: "Pre-assessment pending",
  PREASSESSMENT_BOOKED: "Pre-assessment booked",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  REMOVED: "Removed",
};

const MEMBER_STATUS_TONES: Record<CorporateMemberStatus, PillTone> = {
  DRAFT: "draft",
  INVITED: "pending",
  INVITE_SENT: "pending",
  INVITE_FAILED: "inactive",
  REGISTERED: "info",
  PROFILE_INCOMPLETE: "pending",
  PROFILE_COMPLETE: "info",
  PREASSESSMENT_PENDING: "pending",
  PREASSESSMENT_BOOKED: "info",
  ACTIVE: "active",
  SUSPENDED: "inactive",
  REMOVED: "neutral",
};

export function memberStatusLabel(status: string): string {
  return MEMBER_STATUS_LABELS[status as CorporateMemberStatus] ?? status;
}

export function memberStatusTone(status: string): PillTone {
  return MEMBER_STATUS_TONES[status as CorporateMemberStatus] ?? "neutral";
}

const COMPANY_STATUS_LABELS: Record<CorporateCompanyStatus, string> = {
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  EXPIRED: "Expired",
};

const COMPANY_STATUS_TONES: Record<CorporateCompanyStatus, PillTone> = {
  ACTIVE: "active",
  SUSPENDED: "pending",
  EXPIRED: "inactive",
};

export function companyStatusLabel(status: string): string {
  return COMPANY_STATUS_LABELS[status as CorporateCompanyStatus] ?? status;
}

export function companyStatusTone(status: string): PillTone {
  return COMPANY_STATUS_TONES[status as CorporateCompanyStatus] ?? "neutral";
}

const SERVICE_KIND_LABELS: Record<CorporateServiceKind, string> = {
  GENERAL: "GP consultations",
  SPECIALIST: "Specialist consultations",
  PRESCRIPTION: "Prescriptions",
  HEALTH_TEST: "Health tests",
  HOME_DELIVERY: "Home delivery",
};

/** "10% off GP consultations · beneficiaries included" */
export function ruleLabel(rule: {
  serviceKind: CorporateServiceKind | null;
  serviceId: string | null;
  discountPercent: number;
  appliesToBeneficiaries: boolean;
}): string {
  const target = rule.serviceId
    ? "pinned service"
    : rule.serviceKind
      ? SERVICE_KIND_LABELS[rule.serviceKind]
      : "all services";
  const beneficiaries = rule.appliesToBeneficiaries
    ? "beneficiaries included"
    : "employees only";
  return `${rule.discountPercent}% off ${target} · ${beneficiaries}`;
}

/* CorporatePlanServiceRole enum (backend/prisma/schema.prisma). */
export const PLAN_SERVICE_ROLE_LABELS: Record<string, string> = {
  INCLUDED: "Included in plan",
  PRE_ASSESSMENT: "Pre-assessment (onboarding)",
  ILLNESS_BENEFIT: "Illness benefit request",
  FIT_FOR_WORK: "Fit-for-work request",
};

export function planServiceRoleLabel(role: string): string {
  return PLAN_SERVICE_ROLE_LABELS[role] ?? role;
}

export const REQUEST_TYPE_LABELS: Record<string, string> = {
  ILLNESS_BENEFIT: "Illness benefit",
  FIT_FOR_WORK: "Fit for work",
};

/* CorporateRequestStatus enum (backend/prisma/schema.prisma). */
const REQUEST_STATUS_LABELS: Record<string, string> = {
  REQUESTED: "Requested",
  EMPLOYEE_NOTIFIED: "Employee notified",
  BOOKED: "Booked",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

const REQUEST_STATUS_TONES: Record<string, PillTone> = {
  REQUESTED: "pending",
  EMPLOYEE_NOTIFIED: "info",
  BOOKED: "info",
  COMPLETED: "active",
  CANCELLED: "neutral",
  EXPIRED: "inactive",
};

export function requestStatusLabel(status: string): string {
  return REQUEST_STATUS_LABELS[status] ?? status;
}

export function requestStatusTone(status: string): PillTone {
  return REQUEST_STATUS_TONES[status] ?? "neutral";
}

/** True while the request can still be cancelled by admin. */
export function isRequestCancellable(status: string): boolean {
  return status === "REQUESTED" || status === "EMPLOYEE_NOTIFIED" || status === "BOOKED";
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
