import "server-only";
import { adminRequest, type AdminApiResponse } from "./admin-api";

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
  countryId: string;
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
  countryId: string;
  slug: string;
  name: string;
  internalNotes: string | null;
  isActive: boolean;
  payerName: string | null;
  country: MembershipPlanCountry;
  translations: { locale: string; name: string }[];
  _count: { levels: number; enrollments: number };
};

export type MembershipPlanDetail = Omit<MembershipPlanListItem, "translations" | "_count"> & {
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
