import type { FastifyReply, FastifyRequest } from "fastify";
import type { AdminScope } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";
import { verifyAdminAccess } from "./admin-auth.js";
import type { AdminAccessResult } from "./admin-access-evaluator.js";
import { verifyAuthToken, type UserRoleType } from "./auth-session.js";
import { errorResponse } from "./response.js";

/**
 * MANAGE_SUBSCRIPTIONS scope (§25.1). Plan/billing management touches money +
 * subscriber data, so it requires the dedicated super-admin scope — NOT generic
 * admin access. The repo has no `MANAGE_SUBSCRIPTIONS` column; §25.1 maps it onto
 * the super-admin tier, which this codebase models as `User.adminScope === SUPER`
 * (the AdminScope enum) — or the explicit `SUPER_ADMIN` role. The master admin
 * token fallback is the platform superuser key (dev/automation), so it counts as
 * super-admin-equivalent.
 *
 * NOTE (provisioning): no super-admin is seeded by default. Grant a billing
 * admin access by setting `User.adminScope = 'SUPER'` (their `role` stays
 * `ADMIN` so the admin UI layout still admits them). Until then, only the token
 * fallback (dev) passes.
 *
 * On success the result carries the resolved admin actor so mutation handlers
 * can audit (§24) and stamp `adjustCredits.actorAdminId` without re-querying.
 */
export type ManageSubscriptionsResult =
  | { ok: true; method: "session" | "token_fallback"; actorUserId: string | null; actorRole: string }
  | { ok: false; status: 401 | 403 | 503; message: string };

export const MANAGE_SUBSCRIPTIONS_FORBIDDEN =
  "Super admin access (MANAGE_SUBSCRIPTIONS) is required";

/**
 * Pure elevation rule (unit-testable): given the base admin-access decision and
 * the resolved session role + DB admin scope, decide whether the caller holds
 * MANAGE_SUBSCRIPTIONS. Grants on token fallback, SUPER_ADMIN role, or SUPER scope.
 */
export function elevateToManageSubscriptions(
  base: AdminAccessResult,
  sessionRole: UserRoleType | null,
  actorUserId: string | null,
  adminScope: AdminScope | null,
): ManageSubscriptionsResult {
  if (!base.ok) return base;
  if (base.method === "token_fallback") {
    return { ok: true, method: "token_fallback", actorUserId: null, actorRole: "SUPER_ADMIN" };
  }
  if (sessionRole === "SUPER_ADMIN" || adminScope === "SUPER") {
    return { ok: true, method: "session", actorUserId, actorRole: sessionRole ?? "ADMIN" };
  }
  return { ok: false, status: 403, message: MANAGE_SUBSCRIPTIONS_FORBIDDEN };
}

export async function verifyManageSubscriptionsAccess(
  request: FastifyRequest,
): Promise<ManageSubscriptionsResult> {
  const base = await verifyAdminAccess(request);
  if (!base.ok) return base;
  if (base.method === "token_fallback") {
    return elevateToManageSubscriptions(base, null, null, null);
  }
  // Session admin — resolve the user's role + adminScope from the DB (the JWT
  // carries only `role`, never `adminScope`).
  const cookieToken = request.cookies[env.AUTH_COOKIE_NAME];
  const payload = cookieToken ? verifyAuthToken(cookieToken) : null;
  let adminScope: AdminScope | null = null;
  if (payload?.sub) {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { adminScope: true },
    });
    adminScope = user?.adminScope ?? null;
  }
  return elevateToManageSubscriptions(base, payload?.role ?? null, payload?.sub ?? null, adminScope);
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
