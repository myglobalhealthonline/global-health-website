/**
 * Patient subscription API — shared types + browser-side mutation calls.
 * Reads (server components) use `me-subscription-server.ts`; this module is the
 * client path: same-origin `/api/me/*` proxy with the httpOnly cookie attached
 * via `credentials:"include"` (mirrors auth-api). All routes require auth (D15).
 */

export type MeResult<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; message: string; status?: number; code?: string };

export interface SubscriptionPlanRef {
  id: string;
  slug: string;
  name: string;
  monthlyPriceCents: number;
  currencyCode: string;
}

export interface SubscriptionView {
  plan: SubscriptionPlanRef | null;
  countryCode: string | null;
  status: string;
  currentPeriodEnd: string | null;
  paidMonthsCount: number;
  cancelAtPeriodEnd: boolean;
  /** Paid months before plan benefits unlock (D25). Optional for resilience
   *  against older API responses; treat missing as 0 (immediate). */
  benefitsUnlockAfterPaidMonths?: number;
  /** Whether plan benefits (GP credits + discounts) are usable yet. */
  benefitsUnlocked?: boolean;
  /** Plan allows family credit use AND sub is benefit-eligible now (Premium). */
  familyEligible?: boolean;
  pendingChange?: { planName: string; effectiveAt: string | null };
}

export interface CreditsLedgerEntry {
  kind: "CONSULTATION" | "WELLNESS";
  deltaCredits: number;
  reason: string;
  createdAt: string;
}

export interface CreditsView {
  consultation: { balance: number; usedThisPeriod: number };
  wellness: { balance: number };
  ledger: CreditsLedgerEntry[];
}

export interface RedemptionKit {
  healthTestId: string;
  name: string;
  requiredWellnessCredits: number;
  progress: number;
  eligible: boolean;
  reason?: string;
}

export interface RedemptionsView {
  kits: RedemptionKit[];
}

export interface SubscriptionInvoiceView {
  id: string;
  number: string | null;
  amountPaidCents: number;
  currency: string;
  taxCents: number;
  periodStart: string | null;
  hostedInvoiceUrl: string | null;
  pdfUrl: string | null;
  status: string | null;
  createdAt: string;
}

export interface InvoicesView {
  invoices: SubscriptionInvoiceView[];
}

async function meRequest<T>(
  path: string,
  options: { method?: "GET" | "POST" | "PATCH"; body?: unknown } = {},
): Promise<MeResult<T>> {
  try {
    const hasBody = options.body !== undefined;
    const response = await fetch(`/api/me/${path}`, {
      method: options.method ?? "GET",
      credentials: "include",
      headers: hasBody ? { "Content-Type": "application/json" } : undefined,
      body: hasBody ? JSON.stringify(options.body) : undefined,
    });
    const json = (await response.json().catch(() => null)) as {
      ok?: boolean;
      data?: T;
      message?: string;
      details?: { code?: string };
    } | null;
    if (!response.ok || !json?.ok) {
      return {
        ok: false,
        message: json?.message ?? "Request failed",
        status: response.status,
        code: json?.details?.code,
      };
    }
    return { ok: true, data: json.data as T, message: json.message };
  } catch {
    return { ok: false, message: "Backend is unavailable" };
  }
}

/** Current subscription view — used by the activation poller on return from
 *  Stripe checkout to await the webhook flipping status to ACTIVE (B4). */
export function getSubscription(): Promise<MeResult<SubscriptionView>> {
  return meRequest("subscription");
}

export function getRedemptions(): Promise<MeResult<RedemptionsView>> {
  return meRequest("redemptions");
}

export function getCredits(): Promise<MeResult<CreditsView>> {
  return meRequest("credits");
}

export type CartCoverageMode = "CREDIT" | "FIXED" | "PERCENT" | "NORMAL" | "NOT_COVERED";

export type BenefitSelection = "PAY_NORMAL" | "USE_PLAN_CREDIT" | "USE_PLAN_DISCOUNT";

/** Per-line preview reason — why the line resolved to its price. */
export type CartCoverageReason =
  | "COVERED"
  | "NOT_COVERED"
  | "LOCKED"
  | "NOT_ENOUGH_CREDITS"
  | "FAMILY_UNAVAILABLE"
  | "NOT_OWNED"
  | "FAMILY_NOT_ENABLED"
  | "SERVICE_NOT_FAMILY_USABLE"
  | "MEMBER_NOT_ALLOWED";

/** Corporate-membership discount attached to a preview line (plan doc §3.3).
 *  Automatic — no selection; applied only when no plan benefit priced the line. */
export interface CorporateDiscountInfo {
  percent: number;
  amountCents: number;
  companyName: string;
  planName: string;
}

export interface CartCoverageLine {
  itemId: string;
  serviceId: string | null;
  mode: CartCoverageMode;
  basePriceCents: number;
  finalUnitPriceCents: number;
  creditsUsed: number;
  savedCents: number;
  /** Present when the member's corporate plan discounted this line. */
  corporateDiscount?: CorporateDiscountInfo | null;
  /** The benefit currently selected on this line. */
  selection: BenefitSelection;
  /** Why this line resolved as it did (drives warning chips). */
  reason: CartCoverageReason;
  /** Only the selections this line can honour — drives the cart selector. */
  eligibleSelections: BenefitSelection[];
  /** Dependent the line targets (null = self). */
  familyMemberId: string | null;
  /** Display name of the dependent (null = self / unknown). */
  familyMemberName: string | null;
}

export interface CartCoverageView {
  subscriptionId: string | null;
  planName: string | null;
  currencyCode: string | null;
  consultationCreditsRemaining: number;
  lines: CartCoverageLine[];
  totalBaseCents: number;
  totalFinalCents: number;
  totalSavedCents: number;
}

/** Read-only subscription coverage for the patient's current cart (§6).
 *  Guests get a 401 (handled by the caller as a "log in to use benefits"). */
export function getCartPreview(): Promise<MeResult<CartCoverageView>> {
  return meRequest("cart-preview");
}

export interface ServiceBenefitOption {
  selection: BenefitSelection;
  unitPriceCents: number;
  creditsToReserve: number;
}

export interface ServiceBenefitPreview {
  subscriptionId: string | null;
  planName: string | null;
  benefitsUnlocked: boolean;
  consultationCreditsRemaining: number;
  eligibleSelections: BenefitSelection[];
  options: ServiceBenefitOption[];
  basePriceCents: number;
  /** Automatic corporate-membership discount for this service, if any. */
  corporateDiscount?: CorporateDiscountInfo | null;
}

/** Per-service benefit preview for the booking step (B6). Guests get 401 →
 *  the form simply omits the selector. */
export function getBenefitPreview(
  serviceId: string,
  basePriceCents: number,
): Promise<MeResult<ServiceBenefitPreview>> {
  const qs = `?serviceId=${encodeURIComponent(serviceId)}&basePriceCents=${basePriceCents}`;
  return meRequest(`benefit-preview${qs}`);
}

/** Patient in-app notifications (§30). Payload carries pre-localized copy. */
export interface NotificationItem {
  id: string;
  type: string;
  payload: { title?: string; body?: string; href?: string } | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsView {
  items: NotificationItem[];
  unreadCount: number;
}

export function getNotifications(): Promise<MeResult<NotificationsView>> {
  return meRequest("notifications");
}

export function markNotificationRead(id: string): Promise<MeResult<{ updated: number }>> {
  return meRequest(`notifications/${id}/read`, { method: "PATCH" });
}

export function markAllNotificationsRead(): Promise<MeResult<{ updated: number }>> {
  return meRequest("notifications/read-all", { method: "POST" });
}

export function startSubscription(planId: string, returnTo?: string): Promise<MeResult<{ checkoutUrl: string }>> {
  return meRequest("subscription", { method: "POST", body: { planId, ...(returnTo ? { returnTo } : {}) } });
}

/** DEV / LOCAL only — activate the just-created subscription when the fake
 *  billing driver returned a non-payable checkout URL (no Stripe webhook fires
 *  locally). Returns 403 in production, where Stripe is the sole activator. */
export function devActivateSubscription(): Promise<MeResult<{ activated: boolean; status: string }>> {
  return meRequest("subscription/dev-activate", { method: "POST" });
}

export function changePlan(planId: string): Promise<MeResult<{ pendingChangeEffectiveAt: string | null }>> {
  return meRequest("subscription/change", { method: "POST", body: { planId } });
}

/** Undo a scheduled next-cycle plan change — keep the current plan. */
export function cancelScheduledChange(): Promise<MeResult<{ canceled: boolean }>> {
  return meRequest("subscription/cancel-change", { method: "POST" });
}

export function cancelSubscription(): Promise<MeResult<{ status: string; currentPeriodEnd: string | null }>> {
  return meRequest("subscription/cancel", { method: "POST" });
}

export function getBillingPortalUrl(returnTo?: string): Promise<MeResult<{ portalUrl: string }>> {
  const qs = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
  return meRequest(`subscription/portal${qs}`);
}

export interface RedeemShippingInput {
  healthTestId: string;
  shipName: string;
  shipLine1: string;
  shipLine2?: string;
  shipCity: string;
  shipPostalCode: string;
  shipCountryCode: string;
  returnTo?: string;
}

export function redeemKit(
  input: RedeemShippingInput,
): Promise<MeResult<{ redemptionId: string; checkoutUrl?: string; status: string }>> {
  return meRequest("redemptions", { method: "POST", body: input });
}
