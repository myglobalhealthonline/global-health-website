import type { FastifyReply, FastifyRequest } from "fastify";
import type { AdminScope } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";
import { verifyAdminAccess } from "./admin-auth.js";
import type { AdminAccessResult } from "./admin-access-evaluator.js";
import { verifyAuthToken, type UserRoleType } from "./auth-session.js";
import { errorResponse } from "./response.js";

/**
 * MANAGE_SUBSCRIPTION_ADJUSTMENTS scope — STRICTER than MANAGE_SUBSCRIPTIONS.
 *
 * Plan-rule configuration (credits-per-month, perks, redeemable kits, …) is a
 * normal billing-admin power gated by MANAGE_SUBSCRIPTIONS. Directly mutating a
 * *specific user's* earned consultation/wellness balance is a finance/support
 * override that must NOT be normal admin functionality, so it requires the
 * dedicated super-admin **scope** — `User.adminScope === 'SUPER'` — and NOT
 * merely the `SUPER_ADMIN` role. The master admin token fallback is the platform
 * superuser key (dev/automation) and still passes.
 *
 * This is the separation-of-duties boundary requested in the subscription
 * review (§4): a billing admin can shape plans, but only a SUPER-scope admin can
 * edit an individual's balance, and every such edit carries a reason + audit row.
 */
export type ManageAdjustmentsResult =
  | { ok: true; method: "session" | "token_fallback"; actorUserId: string | null; actorRole: string }
  | { ok: false; status: 401 | 403 | 503; message: string };

export const MANAGE_ADJUSTMENTS_FORBIDDEN =
  "Super-admin scope (MANAGE_SUBSCRIPTION_ADJUSTMENTS) is required to adjust a user's balance";

/**
 * Pure elevation rule (unit-testable). Grants ONLY on the master-token fallback
 * or a real `adminScope === 'SUPER'`. The `SUPER_ADMIN` role alone is NOT
 * sufficient (that path is reserved for plan configuration, not balance edits).
 */
export function elevateToManageAdjustments(
  base: AdminAccessResult,
  sessionRole: UserRoleType | null,
  actorUserId: string | null,
  adminScope: AdminScope | null,
): ManageAdjustmentsResult {
  if (!base.ok) return base;
  if (base.method === "token_fallback") {
    return { ok: true, method: "token_fallback", actorUserId: null, actorRole: "SUPER_ADMIN" };
  }
  if (adminScope === "SUPER") {
    return { ok: true, method: "session", actorUserId, actorRole: sessionRole ?? "ADMIN" };
  }
  return { ok: false, status: 403, message: MANAGE_ADJUSTMENTS_FORBIDDEN };
}

export async function verifyManageAdjustmentsAccess(
  request: FastifyRequest,
): Promise<ManageAdjustmentsResult> {
  const base = await verifyAdminAccess(request);
  if (!base.ok) return base;
  if (base.method === "token_fallback") {
    return elevateToManageAdjustments(base, null, null, null);
  }
  // Session admin — the JWT carries only `role`, so resolve `adminScope` from DB.
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
  return elevateToManageAdjustments(base, payload?.role ?? null, payload?.sub ?? null, adminScope);
}

export type ManageAdjustmentsAuthOk = Extract<ManageAdjustmentsResult, { ok: true }>;

/**
 * Route guard: verifies MANAGE_SUBSCRIPTION_ADJUSTMENTS and, on failure, sends
 * the error response and returns null (the handler should `return`). On success
 * returns the resolved admin actor for audit stamping.
 */
export async function requireManageAdjustments(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<ManageAdjustmentsAuthOk | null> {
  const auth = await verifyManageAdjustmentsAccess(request);
  if (!auth.ok) {
    reply.status(auth.status).send(errorResponse(auth.message));
    return null;
  }
  return auth;
}
