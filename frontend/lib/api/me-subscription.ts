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
  options: { method?: "GET" | "POST"; body?: unknown } = {},
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

export function getRedemptions(): Promise<MeResult<RedemptionsView>> {
  return meRequest("redemptions");
}

export function getCredits(): Promise<MeResult<CreditsView>> {
  return meRequest("credits");
}

export function startSubscription(planId: string, returnTo?: string): Promise<MeResult<{ checkoutUrl: string }>> {
  return meRequest("subscription", { method: "POST", body: { planId, ...(returnTo ? { returnTo } : {}) } });
}

export function changePlan(planId: string): Promise<MeResult<{ pendingChangeEffectiveAt: string | null }>> {
  return meRequest("subscription/change", { method: "POST", body: { planId } });
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
