import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env.js";
import { verifyAdminAccess } from "./admin-auth.js";
import type { AdminAccessResult } from "./admin-access-evaluator.js";
import { verifyAuthToken, type UserRoleType } from "./auth-session.js";
import { errorResponse } from "./response.js";

/**
 * MANAGE_SUBSCRIPTIONS — plan/billing management for the subscription admin
 * surfaces (plans, rules, perks, subscriber list, manual credit adjustments).
 *
 * `verifyAdminAccess` proves the caller is ADMIN/SUPER_ADMIN/LOCAL_ADMIN;
 * MANAGE_SUBSCRIPTIONS is then granted to the GLOBAL admin tiers only —
 * LOCAL_ADMIN (country-scoped ops role) is explicitly denied, since these
 * surfaces span all countries (plan config, subscriber PII, resync/refund).
 * Money mutations (balance adjustment, refund) additionally require
 * `actorRole === "SUPER_ADMIN"`, checked by the route handler using the
 * `actorRole` this function resolves.
 *
 * Sensitive money actions are further protected by friction on top of the
 * role check: a hidden "Support override" panel, a mandatory written reason,
 * a confirm step, and a full audit row (§4).
 *
 * On success the result carries the resolved admin actor so mutation handlers
 * can audit (§24) and stamp `adjustCredits.actorAdminId` without re-querying.
 */
export type ManageSubscriptionsResult =
  | { ok: true; method: "session" | "token_fallback"; actorUserId: string | null; actorRole: string }
  | { ok: false; status: 401 | 403 | 503; message: string };

export const MANAGE_SUBSCRIPTIONS_FORBIDDEN = "Admin access is required";

/**
 * Pure elevation rule (unit-testable): any successful admin base decision
 * (session or master-token fallback) holds MANAGE_SUBSCRIPTIONS. A failed base
 * decision (non-admin / unauthenticated) is propagated unchanged.
 */
export function elevateToManageSubscriptions(
  base: AdminAccessResult,
  sessionRole: UserRoleType | null,
  actorUserId: string | null,
): ManageSubscriptionsResult {
  if (!base.ok) return base;
  if (base.method === "token_fallback") {
    return { ok: true, method: "token_fallback", actorUserId: null, actorRole: "ADMIN" };
  }
  // LOCAL_ADMIN is a country-scoped operational role (orders, patient support).
  // Subscription plan/billing config is global — plans, rules, subscriber PII,
  // resync/regrant/refund — so it stays with global admins only.
  if (sessionRole === "LOCAL_ADMIN") {
    return { ok: false, status: 403, message: MANAGE_SUBSCRIPTIONS_FORBIDDEN };
  }
  return { ok: true, method: "session", actorUserId, actorRole: sessionRole ?? "ADMIN" };
}

export async function verifyManageSubscriptionsAccess(
  request: FastifyRequest,
): Promise<ManageSubscriptionsResult> {
  const base = await verifyAdminAccess(request);
  if (!base.ok) return base;
  if (base.method === "token_fallback") {
    return elevateToManageSubscriptions(base, null, null);
  }
  // Session admin — resolve the actor id + role from the JWT for audit stamping.
  const cookieToken = request.cookies[env.AUTH_COOKIE_NAME];
  const payload = cookieToken ? verifyAuthToken(cookieToken) : null;
  return elevateToManageSubscriptions(base, payload?.role ?? null, payload?.sub ?? null);
}

export type ManageSubscriptionsAuthOk = Extract<ManageSubscriptionsResult, { ok: true }>;

/**
 * Route guard: verifies MANAGE_SUBSCRIPTIONS and, on failure, sends the error
 * response and returns null (handler should `return`). On success returns the
 * resolved admin actor for audit/idempotency stamping.
 */
export async function requireManageSubscriptions(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<ManageSubscriptionsAuthOk | null> {
  const auth = await verifyManageSubscriptionsAccess(request);
  if (!auth.ok) {
    reply.status(auth.status).send(errorResponse(auth.message));
    return null;
  }
  return auth;
}
