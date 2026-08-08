import "server-only";
import { adminPostMultipart, adminRequest, type AdminApiResponse } from "./admin-api";

/**
 * Server-only admin client for the private membership plans surface
 * (docs/plans/private-membership-plans-implementation.md §4.1, phase 1).
 *
 * Mirrors the backend route shapes (okResponse data payloads) and reuses the
 * shared `adminRequest` cookie/token forwarding, exactly as plans-api.ts does.
 * Enrollment, import and reporting clients arrive with their own phases.
 */

export type MembershipServiceKind = "GENERAL" | "SPECIALIST";
export type MembershipBenefitType = "ALLOWANCE" | "PERCENT" | "FIXED" | "EXCLUDED";
export type MembershipFallbackType = "NONE" | "PERCENT" | "FIXED";
export type MembershipAllowancePool = "SHARED" | "PER_PERSON";

export type MembershipPlanCountry = { id: string; code: string; name: string };

export type MembershipTranslation = {
  id: string;
  locale: string;
  name: string;
  description: string | null;
};

export type MembershipBenefit = {
  id: string;
  levelId: string;
  planId: string;
  /** Which covered country this row configures. Fixed once created. */
  countryId: string;
  serviceKind: MembershipServiceKind | null;
  serviceId: string | null;
  benefitType: MembershipBenefitType;
  allowanceCount: number | null;
  percentOff: number | null;
  fixedPriceCents: number | null;
  fallbackType: MembershipFallbackType;
  fallbackPercent: number | null;
  fallbackFixedCents: number | null;
  isActive: boolean;
  service: {
    id: string;
    name: string;
    slug: string;
    kind: string;
    basePriceCents: number | null;
    currencyCode: string | null;
  } | null;
};

export type MembershipLevel = {
  id: string;
  planId: string;
  /**
   * Card background, admin-set per level. Hex or null; the foreground is
   * DERIVED from its luminance and never stored, so an admin cannot produce
   * white-on-pale. A level no longer carries a country — it spans the plan's
   * covered ones, and the per-country configuration lives on its benefits.
   */
  cardBackgroundHex: string | null;
  slug: string;
  name: string;
  sortOrder: number;
  isDefault: boolean;
  isActive: boolean;
  familyEnabled: boolean;
  maxDependents: number;
  allowancePool: MembershipAllowancePool;
  translations: MembershipTranslation[];
  _count: { benefits: number; enrollments: number };
};

export type MembershipPlanListItem = {
  id: string;
  /** Where the plan was created and where its shared allowance pool lives. */
  primaryCountryId: string;
  slug: string;
  name: string;
  internalNotes: string | null;
  isActive: boolean;
  payerName: string | null;
  primaryCountry: MembershipPlanCountry;
  translations: { locale: string; name: string }[];
  _count: { levels: number; enrollments: number };
};

export type MembershipPlanDetail = Omit<MembershipPlanListItem, "translations" | "_count"> & {
  /**
   * Every covered country, primary included. Coverage is not configuration —
   * a country listed here with no benefit rows gives members nothing at all,
   * allowance units included, which is why the level editor badges it.
   */
  countries: { countryId: string; country: MembershipPlanCountry }[];
  payerEmail: string | null;
  payerPhone: string | null;
  payerAmountCents: number | null;
  payerCurrency: string | null;
  payerNotes: string | null;
  translations: MembershipTranslation[];
  levels: MembershipLevel[];
  _count: { enrollments: number };
};

export type MembershipPlanInput = {
  countryId?: string;
  slug?: string;
  name?: string;
  internalNotes?: string | null;
  isActive?: boolean;
  payerName?: string | null;
  payerEmail?: string | null;
  payerPhone?: string | null;
  payerAmountCents?: number | null;
  payerCurrency?: string | null;
  payerNotes?: string | null;
};

export type MembershipLevelInput = {
  slug?: string;
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
  familyEnabled?: boolean;
  maxDependents?: number;
  allowancePool?: MembershipAllowancePool;
  /** `#RRGGBB` or null. Only the background is stored; the rest is derived. */
  cardBackgroundHex?: string | null;
};

export type MembershipBenefitInput = {
  serviceKind: MembershipServiceKind | null;
  serviceId: string | null;
  benefitType: MembershipBenefitType;
  allowanceCount: number | null;
  percentOff: number | null;
  fixedPriceCents: number | null;
  fallbackType: MembershipFallbackType;
  fallbackPercent: number | null;
  fallbackFixedCents: number | null;
  isActive: boolean;
};

function withQuery(path: string, query?: Record<string, string | undefined>) {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

// ─── Plans ───────────────────────────────────────────────────────────────────

export async function fetchMembershipPlans(query?: {
  countryId?: string;
  includeInactive?: string;
}): Promise<AdminApiResponse<{ plans: MembershipPlanListItem[] }>> {
  return adminRequest<{ plans: MembershipPlanListItem[] }>(
    withQuery("/api/admin/membership-plans", query),
  );
}

export async function fetchMembershipPlan(planId: string) {
  return adminRequest<{ plan: MembershipPlanDetail }>(`/api/admin/membership-plans/${planId}`);
}

export async function createMembershipPlan(body: MembershipPlanInput) {
  return adminRequest<{ plan: MembershipPlanDetail }>("/api/admin/membership-plans", {
    method: "POST",
    body,
  });
}

export async function updateMembershipPlan(planId: string, body: MembershipPlanInput) {
  return adminRequest<{ plan: MembershipPlanDetail }>(`/api/admin/membership-plans/${planId}`, {
    method: "PATCH",
    body,
  });
}

export async function deactivateMembershipPlan(planId: string) {
  return adminRequest<{ plan: MembershipPlanDetail }>(
    `/api/admin/membership-plans/${planId}/deactivate`,
    { method: "POST" },
  );
}

// ─── Translations ────────────────────────────────────────────────────────────

export async function putMembershipPlanTranslation(
  planId: string,
  locale: string,
  body: { name: string; description: string | null },
) {
  return adminRequest<{ translation: MembershipTranslation }>(
    `/api/admin/membership-plans/${planId}/translations/${locale}`,
    { method: "PUT", body },
  );
}

export async function putMembershipLevelTranslation(
  levelId: string,
  locale: string,
  body: { name: string; description: string | null },
) {
  return adminRequest<{ translation: MembershipTranslation }>(
    `/api/admin/membership-levels/${levelId}/translations/${locale}`,
    { method: "PUT", body },
  );
}

// ─── Levels ──────────────────────────────────────────────────────────────────

export async function createMembershipLevel(planId: string, body: MembershipLevelInput) {
  return adminRequest<{ level: MembershipLevel }>(
    `/api/admin/membership-plans/${planId}/levels`,
    { method: "POST", body },
  );
}

export async function updateMembershipLevel(levelId: string, body: MembershipLevelInput) {
  return adminRequest<{ level: MembershipLevel }>(`/api/admin/membership-levels/${levelId}`, {
    method: "PATCH",
    body,
  });
}

export async function deleteMembershipLevel(levelId: string) {
  return adminRequest<{ id: string }>(`/api/admin/membership-levels/${levelId}`, {
    method: "DELETE",
  });
}

// ─── Benefits ────────────────────────────────────────────────────────────────

export async function fetchMembershipBenefits(levelId: string) {
  return adminRequest<{ benefits: MembershipBenefit[] }>(
    `/api/admin/membership-levels/${levelId}/benefits`,
  );
}

export async function createMembershipBenefit(levelId: string, body: MembershipBenefitInput) {
  return adminRequest<{ benefit: MembershipBenefit }>(
    `/api/admin/membership-levels/${levelId}/benefits`,
    { method: "POST", body },
  );
}

export async function updateMembershipBenefit(benefitId: string, body: MembershipBenefitInput) {
  return adminRequest<{ benefit: MembershipBenefit }>(
    `/api/admin/membership-benefits/${benefitId}`,
    { method: "PATCH", body },
  );
}

export async function deleteMembershipBenefit(benefitId: string) {
  return adminRequest<{ id: string }>(`/api/admin/membership-benefits/${benefitId}`, {
    method: "DELETE",
  });
}

// ─── Enrollments (phase 2) ───────────────────────────────────────────────────

export type MembershipEnrollmentStatus =
  | "PENDING"
  | "ACTIVE"
  | "SUSPENDED"
  | "EXPIRED"
  | "REMOVED";

export type MembershipEnrollmentDependent = {
  id: string;
  membershipId: string;
  firstName: string;
  lastName: string;
  email: string;
  relationship: string | null;
  status: MembershipEnrollmentStatus;
};

export type MembershipEnrollment = {
  id: string;
  planId: string;
  levelId: string;
  countryId: string;
  /** Generated and immutable — printed on the card, checked by the claim form. */
  membershipId: string;
  /** The partner's own number. Searchable, non-unique, editable. */
  partnerReference: string | null;
  /** Welcome-email language while PENDING; `User.preferredLocale` wins once linked. */
  preferredLocale: string | null;
  /** Set when the card + welcome email went out. Null = never issued. */
  cardIssuedAt: string | null;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  dateOfBirth: string | null;
  status: MembershipEnrollmentStatus;
  memberType: "PRIMARY" | "DEPENDENT";
  primaryEnrollmentId: string | null;
  relationship: string | null;
  startDate: string;
  endDate: string | null;
  userId: string | null;
  linkedAt: string | null;
  claimedAt: string | null;
  adminNotes: string | null;
  createdAt: string;
  plan: { id: string; name: string; slug: string; primaryCountryId: string };
  level: {
    id: string;
    name: string;
    slug: string;
    familyEnabled: boolean;
    maxDependents: number;
  };
  user: { id: string; email: string; fullName: string; emailVerifiedAt: string | null } | null;
  dependents: MembershipEnrollmentDependent[];
  /** Present on the DETAIL fetch only — the member list renders hundreds of
   *  rows and has no use for per-benefit counters (§7). */
  allowances?: MembershipAllowanceView[];
};

export type MembershipEnrollmentListResult = {
  items: MembershipEnrollment[];
  total: number;
  page: number;
  pageSize: number;
};

export type MembershipEnrollmentInput = {
  planId?: string;
  levelId?: string;
  /** No `membershipId`: generated server-side and never accepted from a form. */
  partnerReference?: string | null;
  preferredLocale?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  startDate?: string;
  endDate?: string | null;
  adminNotes?: string | null;
};

export type MembershipDependentInput = {
  membershipId?: string;
  partnerReference?: string | null;
  preferredLocale?: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  relationship?: string | null;
  adminNotes?: string | null;
};

export async function fetchMembershipEnrollments(query?: {
  planId?: string;
  status?: string;
  q?: string;
  page?: string;
  pageSize?: string;
}) {
  return adminRequest<MembershipEnrollmentListResult>(
    withQuery("/api/admin/membership-enrollments", query),
  );
}

export async function fetchMembershipEnrollment(id: string) {
  return adminRequest<{ enrollment: MembershipEnrollment }>(
    `/api/admin/membership-enrollments/${id}`,
  );
}

export async function createMembershipEnrollment(body: MembershipEnrollmentInput) {
  return adminRequest<{ enrollment: MembershipEnrollment }>("/api/admin/membership-enrollments", {
    method: "POST",
    body,
  });
}

export async function updateMembershipEnrollment(id: string, body: MembershipEnrollmentInput) {
  return adminRequest<{ enrollment: MembershipEnrollment }>(
    `/api/admin/membership-enrollments/${id}`,
    { method: "PATCH", body },
  );
}

export async function suspendMembershipEnrollment(id: string, reason: string | null) {
  return adminRequest<{ enrollment: MembershipEnrollment }>(
    `/api/admin/membership-enrollments/${id}/suspend`,
    { method: "POST", body: { reason } },
  );
}

export async function reactivateMembershipEnrollment(id: string) {
  return adminRequest<{ enrollment: MembershipEnrollment }>(
    `/api/admin/membership-enrollments/${id}/reactivate`,
    { method: "POST" },
  );
}

export async function removeMembershipEnrollment(id: string) {
  return adminRequest<{ enrollment: MembershipEnrollment }>(
    `/api/admin/membership-enrollments/${id}/remove`,
    { method: "POST" },
  );
}

export async function addMembershipDependent(id: string, body: MembershipDependentInput) {
  return adminRequest<{ enrollment: MembershipEnrollment }>(
    `/api/admin/membership-enrollments/${id}/dependents`,
    { method: "POST", body },
  );
}

export async function sendMembershipInvite(id: string) {
  return adminRequest<{ ok: boolean; email: string }>(
    `/api/admin/membership-enrollments/${id}/invite`,
    { method: "POST" },
  );
}

// ─── CSV import (phase 2) ────────────────────────────────────────────────────

export type MembershipImportOutcome = "CREATE" | "REVIVE" | "LINK" | "REJECT";

export type MembershipImportPreviewRow = {
  line: number;
  outcome: MembershipImportOutcome;
  /** Why the row was rejected. Nothing is applied for it. */
  reason?: string;
  /**
   * Non-blocking notes: an unrecognised locale, a partner reference repeated
   * inside the file. Worth an admin's eye, never worth failing a row over.
   */
  warnings?: string[];
  /**
   * The partner's own number. There is no membership id to show at preview
   * time — it is generated at commit.
   */
  partnerReference: string | null;
  preferredLocale: string | null;
  /** True when committing this row sends a welcome email + card. */
  willEmail: boolean;
  email: string;
  firstName: string;
  lastName: string;
  startDate: string;
  endDate: string | null;
  levelId: string | null;
  levelSlug: string | null;
  primaryMembershipId: string | null;
  primaryEmail: string | null;
};

/**
 * Server-computed tallies. `recipients` is the blast radius — the number of
 * emails a commit sends — and is deliberately not the row count: a rejected
 * row applies nothing, and a revived member who already has their card is not
 * emailed twice.
 */
export type MembershipImportCounts = {
  create: number;
  link: number;
  revive: number;
  reject: number;
  warned: number;
  recipients: number;
};

export type MembershipImportBatch = {
  id: string;
  planId: string;
  fileName: string;
  status: "PREVIEW" | "COMMITTED" | "CANCELLED";
  rowCount: number;
  createdCount: number;
  revivedCount: number;
  rejectedCount: number;
  previewData: { rows: MembershipImportPreviewRow[]; headers: string[] };
  committedAt: string | null;
  createdAt: string;
};

export async function uploadMembershipImport(planId: string, file: File) {
  const body = new FormData();
  body.append("planId", planId);
  body.append("file", file);
  return adminPostMultipart<{ batch: MembershipImportBatch; counts: MembershipImportCounts | null }>(
    "/api/admin/membership-imports",
    body,
  );
}

export async function fetchMembershipImport(batchId: string) {
  return adminRequest<{ batch: MembershipImportBatch; counts: MembershipImportCounts | null }>(
    `/api/admin/membership-imports/${batchId}`,
  );
}

export async function commitMembershipImport(batchId: string) {
  return adminRequest<{
    batch: MembershipImportBatch;
    applied: boolean;
    created?: number;
    revived?: number;
    skipped?: { line: number; reason: string }[];
  }>(`/api/admin/membership-imports/${batchId}/commit`, { method: "POST" });
}

export async function cancelMembershipImport(batchId: string) {
  return adminRequest<{ batch: MembershipImportBatch; cancelled: boolean }>(
    `/api/admin/membership-imports/${batchId}/cancel`,
    { method: "POST" },
  );
}

/* ── Staff card verification (§10/§20) ────────────────────────────────────────
   The only lookup by membership id, and it is admin-session only: there is no
   public verification URL, because a partner's sequential ids plus an open
   endpoint is a member directory. */

export type MembershipVerifyResult =
  | { found: false }
  | {
      found: true;
      membershipId: string;
      holderName: string;
      planName: string;
      levelName: string;
      status: "PENDING" | "ACTIVE" | "SUSPENDED" | "EXPIRED" | "REMOVED";
      termState: "NOT_STARTED" | "IN_TERM" | "ENDED";
      startDate: string;
      endDate: string | null;
      countryCode: string;
      /** Status AND term together — either alone would mislead staff. */
      benefitsActive: boolean;
    };

export async function verifyMembershipId(membershipId: string) {
  return adminRequest<MembershipVerifyResult>(
    `/api/admin/membership-verify?membershipId=${encodeURIComponent(membershipId)}`,
  );
}

/* ── Allowance adjust (§7, phase 6) ───────────────────────────────────────────
   SUPER_ADMIN only, reason mandatory. The delta is CLAMPED server-side into
   [0, allocated] rather than rejected, and `appliedDelta` reports what actually
   happened — so the UI must read that back rather than assume it got what it
   asked for. */

export type MembershipAllowanceView = {
  benefitId: string;
  /** What the rule covers: a service name, or a service kind. */
  target: string;
  allocated: number;
  used: number;
  remaining: number;
};

export type MembershipAllowanceAdjustResult = {
  balanceId: string;
  allocated: number;
  used: number;
  remaining: number;
  requestedDelta: number;
  appliedDelta: number;
};

export async function adjustMembershipAllowance(
  enrollmentId: string,
  body: { benefitId: string; delta: number; reason: string },
) {
  return adminRequest<MembershipAllowanceAdjustResult>(
    `/api/admin/membership-enrollments/${enrollmentId}/allowance-adjust`,
    { method: "POST", body },
  );
}

/* ── Usage reporting (§15/§32, phase 6) ───────────────────────────────────────
   MANAGE_MEMBERSHIPS: named members and their bookings are member PII, so these
   sit with the member list rather than with price configuration. Booking
   metadata only — no clinical content crosses this boundary. */

export type MembershipBenefitTypeCounts = Record<MembershipBenefitType, number>;

export type MembershipUsageRow = {
  orderItemId: string;
  orderId: string;
  orderNumber: string;
  bookedAt: string;
  serviceName: string;
  doctorName: string | null;
  listPriceCents: number;
  pricePaidCents: number;
  discountCents: number;
  benefitType: MembershipBenefitType | null;
  allowanceUsed: boolean;
  /** Non-null ONLY for a goodwill override — and then it is the reason (§11.7). */
  overrideReason: string | null;
  memberName: string | null;
  membershipId: string | null;
  enrollmentId: string | null;
};

export type MembershipUsageReport = {
  plan: { id: string; name: string; slug: string; countryCode: string };
  range: { from: string | null; to: string | null };
  membersByStatus: Record<MembershipEnrollmentStatus, number>;
  usage: {
    consultations: number;
    byBenefitType: MembershipBenefitTypeCounts;
    totalDiscountCents: number;
    totalChargedCents: number;
    rows: MembershipUsageRow[];
  };
  allowance: { allocated: number; used: number };
  /** Excluded from every total above, and never hidden between two (§15). */
  overrides: { consultations: number; totalValueCents: number; rows: MembershipUsageRow[] };
  currencyCode: string | null;
};

export type MembershipMemberUsage = {
  enrollment: {
    id: string;
    membershipId: string;
    fullName: string;
    email: string;
    planId: string;
    planName: string;
    levelName: string;
    status: MembershipEnrollmentStatus;
  };
  rows: MembershipUsageRow[];
  totals: {
    consultations: number;
    discountCents: number;
    allowanceUsed: number;
    overrides: number;
  };
};

export async function fetchMembershipUsageReport(
  planId: string,
  query?: { from?: string | null; to?: string | null },
) {
  const params = new URLSearchParams();
  if (query?.from) params.set("from", query.from);
  if (query?.to) params.set("to", query.to);
  const qs = params.toString();
  return adminRequest<MembershipUsageReport>(
    `/api/admin/membership-reports/${planId}/usage${qs ? `?${qs}` : ""}`,
  );
}

/** Writes a `MEMBERSHIP_REPORT_VIEWED` audit row server-side (§32). */
export async function fetchMemberUsageReport(enrollmentId: string) {
  return adminRequest<MembershipMemberUsage>(
    `/api/admin/membership-reports/enrollment/${enrollmentId}/usage`,
  );
}
