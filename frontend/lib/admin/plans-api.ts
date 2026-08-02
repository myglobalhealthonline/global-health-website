import "server-only";
import { adminRequest, type AdminApiResponse } from "./admin-api";

/**
 * Server-only admin client for the Sprint 2 plan-management surface. Mirrors the
 * backend route shapes (okResponse data payloads). Reuses the shared
 * `adminRequest` cookie/token forwarding from admin-api.ts.
 */

export type PlanType = "ESSENTIAL" | "COMPREHENSIVE" | "PREMIUM";
export type PlanDiscountMode = "NONE" | "PERCENT" | "FIXED";
export type PerkKey =
  | "SPECIALIST_DISCOUNT"
  | "FAMILY_USAGE"
  | "WELLNESS_REDEMPTION"
  | "TEST_KIT_REDEMPTION"
  | "HIGHER_DISCOUNT_TIER";
export type PerkUnlockMode = "MONTH_1" | "AFTER_PAID_MONTHS" | "MANUAL_APPROVAL" | "NOT_AVAILABLE";
export type SubscriptionStatus = "INCOMPLETE" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "PAUSED";
export type CreditKind = "CONSULTATION" | "WELLNESS";

export type AdminPlanCountry = { id: string; code: string; name: string };

export type AdminPlanListItem = {
  id: string;
  countryId: string;
  slug: string;
  planType: PlanType;
  name: string;
  shortDescription: string | null;
  monthlyPriceCents: number;
  currencyCode: string;
  billingInterval: string;
  isActive: boolean;
  displayOrder: number;
  isFeatured: boolean;
  badgeLabel: string | null;
  monthlyConsultationCredits: number;
  wellnessCreditsPerMonth: number;
  benefitsUnlockAfterPaidMonths: number;
  familyEnabled: boolean;
  stripePriceId: string | null;
  country: AdminPlanCountry;
  _count: { consultationRules: number; perkRules: number; healthTestRules: number; subscriptions: number };
  /** Per-locale CMS content (display-only EN name preference). */
  translations: { locale: string; name: string }[];
};

export type AdminConsultationRule = {
  id: string;
  planId: string;
  countryId: string;
  serviceId: string;
  isIncluded: boolean;
  usesCredits: boolean;
  creditsPerUse: number;
  discountMode: PlanDiscountMode;
  discountPercent: number | null;
  fixedPriceCents: number | null;
  unlockAfterPaidMonths: number;
  familyUsable: boolean;
  isActive: boolean;
  service: { id: string; name: string; slug: string; kind: string; basePriceCents: number | null; currencyCode: string | null };
};

export type AdminPerkRule = {
  id: string;
  planId: string;
  perkKey: PerkKey;
  unlockMode: PerkUnlockMode;
  unlockAfterPaidMonths: number | null;
};

export type AdminHealthTestRule = {
  id: string;
  planId: string;
  healthTestId: string;
  requiredWellnessCredits: number;
  unlockAfterPaidMonths: number;
  isActive: boolean;
  healthTest: { id: string; title: string; slug: string; priceCents: number; currencyCode: string };
};

export type AdminPlanTranslation = {
  id: string;
  planId: string;
  locale: string;
  name: string;
  shortDescription: string | null;
  longDescription: string | null;
  notesTerms: string | null;
  features: string[];
};

export type AdminPlanDetail = Omit<AdminPlanListItem, "translations"> & {
  longDescription: string | null;
  notesTerms: string | null;
  stripeProductId: string | null;
  consultationRules: AdminConsultationRule[];
  perkRules: AdminPerkRule[];
  healthTestRules: AdminHealthTestRule[];
  translations: AdminPlanTranslation[];
};

export type AdminPlanPreview = {
  resolvedLocale: string;
  name: string;
  shortDescription: string | null;
  longDescription: string | null;
  notesTerms: string | null;
  plan: AdminPlanDetail;
};

export type AdminSubscriptionInvoice = {
  id: string;
  number: string | null;
  amountPaidCents: number;
  currency: string;
  periodStart: string | null;
  status: string | null;
  hostedInvoiceUrl: string | null;
  createdAt: string;
};

export type AdminSubscriptionListItem = {
  id: string;
  userId: string;
  planId: string;
  countryCode: string;
  status: SubscriptionStatus;
  paidMonthsCount: number;
  startedAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  createdAt: string;
  user: { id: string; email: string; fullName: string | null };
  plan: {
    id: string;
    name: string;
    slug: string;
    countryId: string;
    monthlyPriceCents: number;
    currencyCode: string;
  };
  /** Terms captured at subscribe/renewal (D18). The member is billed THIS
   *  price, which may differ from the plan's current one after an admin edit. */
  planSnapshot: { monthlyPriceCents?: number; currencyCode?: string } | null;
  balances: Array<{ kind: CreditKind; balance: number }>;
  perkGrants: Array<{ perkKey: PerkKey; status: "PENDING" | "APPROVED" | "DENIED" | "AUTO" }>;
  /** Newest first, capped server-side. Mirror rows only — Stripe holds the PDFs. */
  invoices: AdminSubscriptionInvoice[];
};

export type AdminPerkGrant = {
  id: string;
  userSubscriptionId: string;
  perkKey: PerkKey;
  status: "PENDING" | "APPROVED" | "DENIED" | "AUTO";
  approvedByAdminId: string | null;
  approvedAt: string | null;
  createdAt: string;
  subscription: {
    id: string;
    countryCode: string;
    status: SubscriptionStatus;
    paidMonthsCount: number;
    user: { id: string; email: string; fullName: string | null };
    plan: { id: string; name: string; slug: string };
  };
};

export type SubscriptionHealth = {
  lastReconciliationAt: string | null;
  drift: Array<{ subscriptionId: string; field: string; db: unknown; stripe: unknown }>;
  invariantAlerts: Array<{ subscriptionId: string; kind: string; detail: string }>;
  priceSyncFailures: Array<Record<string, unknown>>;
};

function withQuery(path: string, query?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") params.set(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

// ─── Plans ───────────────────────────────────────────────────────────────────

export async function fetchAdminPlans(query?: Record<string, string | undefined>) {
  return adminRequest<{ plans: AdminPlanListItem[] }>(withQuery("/api/admin/plans", query));
}

export async function fetchAdminPlanById(id: string) {
  return adminRequest<{ plan: AdminPlanDetail }>(`/api/admin/plans/${id}`);
}

export async function postAdminPlan(body: unknown) {
  return adminRequest<{ plan: AdminPlanDetail }>("/api/admin/plans", { method: "POST", body });
}

export async function patchAdminPlan(id: string, body: unknown) {
  return adminRequest<{ plan: AdminPlanDetail }>(`/api/admin/plans/${id}`, { method: "PATCH", body });
}

export async function deleteAdminPlan(id: string) {
  return adminRequest<{ plan: AdminPlanDetail }>(`/api/admin/plans/${id}`, { method: "DELETE" });
}

export async function postAdminPlanReorder(items: Array<{ id: string; displayOrder: number }>) {
  return adminRequest<Record<string, never>>("/api/admin/plans/reorder", {
    method: "POST",
    body: { items },
  });
}

// ─── Consultation rules ──────────────────────────────────────────────────────

export async function postAdminPlanConsultationRule(planId: string, body: unknown) {
  return adminRequest<{ rule: AdminConsultationRule }>(
    `/api/admin/plans/${planId}/consultation-rules`,
    { method: "POST", body },
  );
}

export async function deleteAdminPlanConsultationRule(planId: string, serviceId: string) {
  return adminRequest<Record<string, never>>(
    `/api/admin/plans/${planId}/consultation-rules/${serviceId}`,
    { method: "DELETE" },
  );
}

// ─── Perk rules ──────────────────────────────────────────────────────────────
// Perk rules can no longer be created from the admin — only removed. See the
// "Old benefit rules" block in the plan editor.

export async function deleteAdminPlanPerk(planId: string, perkKey: string) {
  return adminRequest<Record<string, never>>(`/api/admin/plans/${planId}/perks/${perkKey}`, {
    method: "DELETE",
  });
}

// ─── Health-test redemption rules ────────────────────────────────────────────

export async function postAdminPlanHealthTestRule(planId: string, body: unknown) {
  return adminRequest<{ rule: AdminHealthTestRule }>(
    `/api/admin/plans/${planId}/health-test-rules`,
    { method: "POST", body },
  );
}

export async function deleteAdminPlanHealthTestRule(planId: string, healthTestId: string) {
  return adminRequest<Record<string, never>>(
    `/api/admin/plans/${planId}/health-test-rules/${healthTestId}`,
    { method: "DELETE" },
  );
}

// ─── Translations + preview ──────────────────────────────────────────────────

export async function fetchAdminPlanTranslation(planId: string, locale: string) {
  return adminRequest<{ translation: AdminPlanTranslation | null }>(
    `/api/admin/plans/${planId}/translations/${locale}`,
  );
}

export async function putAdminPlanTranslation(planId: string, locale: string, body: unknown) {
  return adminRequest<{ translation: AdminPlanTranslation }>(
    `/api/admin/plans/${planId}/translations/${locale}`,
    { method: "PUT", body },
  );
}

export async function fetchAdminPlanPreview(planId: string, locale?: string) {
  return adminRequest<{ preview: AdminPlanPreview }>(
    withQuery(`/api/admin/plans/${planId}/preview`, { locale }),
  );
}

// ─── Subscriptions view + adjust-credits ─────────────────────────────────────

export async function fetchAdminSubscriptions(query?: Record<string, string | undefined>) {
  return adminRequest<{
    items: AdminSubscriptionListItem[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
    /** Whether the current caller may manually adjust balances (SUPER scope). */
    capabilities: { canAdjustCredits: boolean };
  }>(withQuery("/api/admin/subscriptions", query));
}

export async function postAdminAdjustCredits(subscriptionId: string, body: unknown) {
  return adminRequest<{ balance: number }>(
    `/api/admin/subscriptions/${subscriptionId}/adjust-credits`,
    { method: "POST", body },
  );
}

export async function postAdminSubscriptionResync(subscriptionId: string) {
  return adminRequest<{ outcome: "RESYNCED" | "DRIFT" | "NO_PROVIDER" }>(
    `/api/admin/subscriptions/${subscriptionId}/resync`,
    { method: "POST" },
  );
}

export async function postAdminSubscriptionRegrant(subscriptionId: string) {
  return adminRequest<{ outcome: "GRANTED" | "NOT_APPLICABLE"; reason?: string }>(
    `/api/admin/subscriptions/${subscriptionId}/regrant-period`,
    { method: "POST" },
  );
}

/** SUPER_ADMIN-only (§4, money mutation). No request body — the backend
 *  refunds the subscriber's latest paid period and reconciles (claws back
 *  unused credits, cancels). Denied outside the 7-day window or once a
 *  consultation credit has been used this period (RefundError codes). */
export async function postAdminSubscriptionRefund(subscriptionId: string) {
  return adminRequest<{ reconciled: boolean; consultationClawedBack: number; wellnessClawedBack: number; policyViolation: boolean }>(
    `/api/admin/subscriptions/${subscriptionId}/refund`,
    { method: "POST" },
  );
}

export type AdminCreditLedgerEntry = {
  kind: "CONSULTATION" | "WELLNESS";
  deltaCredits: number;
  reason: string;
  createdAt: string;
};

export async function fetchAdminSubscriptionLedger(subscriptionId: string) {
  return adminRequest<{ ledger: AdminCreditLedgerEntry[] }>(
    `/api/admin/subscriptions/${subscriptionId}/ledger`,
  );
}

// ─── Perk-grant queue ────────────────────────────────────────────────────────

export async function fetchAdminPerkGrants(status = "PENDING") {
  return adminRequest<{ grants: AdminPerkGrant[] }>(
    withQuery("/api/admin/subscription-perk-grants", { status }),
  );
}

export async function postApproveAdminPerkGrant(id: string) {
  return adminRequest<{ grant: AdminPerkGrant }>(
    `/api/admin/subscription-perk-grants/${id}/approve`,
    { method: "POST" },
  );
}

// ─── Subscription health (Sprint 1 endpoint) ─────────────────────────────────

export async function fetchSubscriptionHealth(): Promise<AdminApiResponse<SubscriptionHealth>> {
  return adminRequest<SubscriptionHealth>("/api/admin/subscription-health");
}
