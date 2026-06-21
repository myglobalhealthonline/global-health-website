import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env.js";
import { verifyAdminAccess } from "./admin-auth.js";
import type { AdminAccessResult } from "./admin-access-evaluator.js";
import { verifyAuthToken, type UserRoleType } from "./auth-session.js";
import { errorResponse } from "./response.js";

/**
 * MANAGE_SUBSCRIPTIONS scope (§25.1). Plan/billing management touches money +
 * subscriber data, so it requires the dedicated super-admin scope — NOT generic
 * admin access. The repo models this scope as the `SUPER_ADMIN` role (there is
 * no separate `MANAGE_SUBSCRIPTIONS` permission column; §25.1 maps it onto
 * SUPER_ADMIN). The master admin token fallback is the platform superuser key
 * (dev/automation), so it is treated as super-admin-equivalent.
 *
 * On success the result carries the resolved admin actor so mutation handlers
 * can audit (§24) and stamp `adjustCredits.actorAdminId` without re-decoding the
 * cookie.
 */
export type ManageSubscriptionsResult =
  | { ok: true; method: "session" | "token_fallback"; actorUserId: string | null; actorRole: string }
  | { ok: false; status: 401 | 403 | 503; message: string };

export const MANAGE_SUBSCRIPTIONS_FORBIDDEN =
  "Super admin access (MANAGE_SUBSCRIPTIONS) is required";

/**
 * Pure elevation rule (unit-testable): given the base admin-access decision and
 * the resolved session role, decide whether the caller holds MANAGE_SUBSCRIPTIONS.
 */
export function elevateToManageSubscriptions(
  base: AdminAccessResult,
  sessionRole: UserRoleType | null,
  actorUserId: string | null,
): ManageSubscriptionsResult {
  if (!base.ok) return base;
  if (base.method === "token_fallback") {
    return { ok: true, method: "token_fallback", actorUserId: null, actorRole: "SUPER_ADMIN" };
  }
  if (sessionRole === "SUPER_ADMIN") {
    return { ok: true, method: "session", actorUserId, actorRole: "SUPER_ADMIN" };
  }
  return { ok: false, status: 403, message: MANAGE_SUBSCRIPTIONS_FORBIDDEN };
}

export async function verifyManageSubscriptionsAccess(
  request: FastifyRequest,
): Promise<ManageSubscriptionsResult> {
  const base = await verifyAdminAccess(request);
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
