/**
 * Private membership plans — member-facing types and browser-side mutations
 * (docs/plans/private-membership-plans-implementation.md §10, phase 3).
 *
 * Reads happen in server components via `me-memberships-server.ts`; this is
 * the client path, same-origin `/api/me/*` with the httpOnly cookie attached,
 * mirroring `me-subscription.ts`.
 *
 * Not to be confused with `me-subscription.ts` — that is the *public plan*
 * subscription (Stripe, credits), which now lives at /account/plans. These are
 * partner-run private memberships, which are never sold on the public site.
 */

export type MembershipResult<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; message: string; status?: number };

/**
 * Where "now" sits in the term. Distinct from `status` on purpose: a row with
 * a future `startDate` is ACTIVE and grants nothing until the term opens
 * (§5.2), and the page says "starts on <date>" for that window.
 */
export type MembershipTermState = "NOT_STARTED" | "IN_TERM" | "ENDED";

export type MembershipStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "EXPIRED" | "REMOVED";

export interface MemberBenefitView {
  id: string;
  serviceKind: string | null;
  serviceName: string | null;
  benefitType: "ALLOWANCE" | "PERCENT" | "FIXED" | "EXCLUDED";
  percentOff: number | null;
  fixedPriceCents: number | null;
  currencyCode: string | null;
  fallbackType: "NONE" | "PERCENT" | "FIXED";
  fallbackPercent: number | null;
  fallbackFixedCents: number | null;
  allowance: { allocated: number; used: number; remaining: number } | null;
}

export interface MemberDependentView {
  id: string;
  firstName: string;
  lastName: string;
  membershipId: string;
  status: MembershipStatus;
  relationship: string | null;
  linked: boolean;
  /** Member-added dependents only — see the backend's `removeMemberDependent`. */
  removableByMember: boolean;
}

export interface MemberMembershipView {
  id: string;
  membershipId: string;
  planName: string;
  levelName: string;
  status: MembershipStatus;
  termState: MembershipTermState;
  startDate: string;
  endDate: string | null;
  memberType: "PRIMARY" | "DEPENDENT";
  holderName: string;
  countryCode: string;
  family: { enabled: boolean; maxDependents: number; used: number } | null;
  benefits: MemberBenefitView[];
  dependents: MemberDependentView[];
}

async function meRequest<T>(
  path: string,
  options: { method?: "GET" | "POST" | "DELETE"; body?: unknown } = {},
): Promise<MembershipResult<T>> {
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
    } | null;
    if (!response.ok || !json?.ok) {
      return { ok: false, message: json?.message ?? "Request failed", status: response.status };
    }
    return { ok: true, data: json.data as T, message: json.message };
  } catch {
    return { ok: false, message: "Network error" };
  }
}

/**
 * Claim step 1. The response is deliberately the same whether or not anything
 * matched — do not add a "not found" branch here, it would reintroduce the
 * enumeration oracle the backend exists to avoid.
 */
export function requestMembershipClaim(input: { membershipId: string; email: string }) {
  return meRequest<{ sent: true }>("memberships/claim", { method: "POST", body: input });
}

/** Claim step 2, fired by the confirm page's button (never on page load). */
export function confirmMembershipClaim(token: string) {
  return meRequest<{ enrollmentId: string; status: string }>("memberships/claim/confirm", {
    method: "POST",
    body: { token },
  });
}

export function addMembershipDependent(
  enrollmentId: string,
  input: { email: string; firstName: string; lastName: string; relationship?: string },
) {
  return meRequest<{ id: string }>(`memberships/${enrollmentId}/dependents`, {
    method: "POST",
    body: input,
  });
}

export function removeMembershipDependent(dependentId: string) {
  return meRequest<{ id: string }>(`memberships/dependents/${dependentId}`, { method: "DELETE" });
}
