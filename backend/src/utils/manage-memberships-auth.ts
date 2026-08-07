import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env.js";
import { verifyAdminAccess } from "./admin-auth.js";
import type { AdminAccessResult } from "./admin-access-evaluator.js";
import { verifyAuthToken, type UserRoleType } from "./auth-session.js";
import { errorResponse } from "./response.js";

/**
 * MANAGE_MEMBERSHIPS — the private membership plans admin surface
 * (docs/plans/private-membership-plans-implementation.md §4.2).
 *
 * Modelled on `manage-subscriptions-auth.ts`, and split the same two ways:
 *
 *   - `requireManageMemberships` gates the operational surface (enrollment
 *     list, suspend/remove, invites, CSV import). Any GLOBAL admin tier holds
 *     it; LOCAL_ADMIN is denied outright, because a plan spans a whole market's
 *     member PII and the config it exposes is not country-scoped the way
 *     LOCAL_ADMIN's other surfaces are.
 *   - `requireMembershipConfigRole` gates plan/level/benefit writes. Those
 *     change what every member is charged, so they require a real admin
 *     *session* — SUPER_ADMIN or ADMIN, never the shared master token.
 *
 * On success the result carries the resolved admin actor so handlers can stamp
 * `recordAudit` without re-querying.
 */
export type ManageMembershipsResult =
  | { ok: true; method: "session" | "token_fallback"; actorUserId: string | null; actorRole: string }
  | { ok: false; status: 401 | 403 | 503; message: string };

export const MANAGE_MEMBERSHIPS_FORBIDDEN = "Admin access is required";
export const MEMBERSHIP_CONFIG_FORBIDDEN =
  "Membership plan configuration requires an admin session";

/**
 * Pure elevation rule (unit-testable): any successful admin base decision
 * (session or master-token fallback) holds MANAGE_MEMBERSHIPS, except
 * LOCAL_ADMIN. A failed base decision is propagated unchanged.
 */
export function elevateToManageMemberships(
  base: AdminAccessResult,
  sessionRole: UserRoleType | null,
  actorUserId: string | null,
): ManageMembershipsResult {
  if (!base.ok) return base;
  if (base.method === "token_fallback") {
    return { ok: true, method: "token_fallback", actorUserId: null, actorRole: "ADMIN" };
  }
  // LOCAL_ADMIN is a country-scoped operational role (orders, patient support).
  // Membership config is per-country but the member list is whole-plan PII, and
  // the benefit rules decide prices across a market — global admins only.
  if (sessionRole === "LOCAL_ADMIN") {
    return { ok: false, status: 403, message: MANAGE_MEMBERSHIPS_FORBIDDEN };
  }
  return { ok: true, method: "session", actorUserId, actorRole: sessionRole ?? "ADMIN" };
}

export async function verifyManageMembershipsAccess(
  request: FastifyRequest,
): Promise<ManageMembershipsResult> {
  const base = await verifyAdminAccess(request);
  if (!base.ok) return base;
  if (base.method === "token_fallback") {
    return elevateToManageMemberships(base, null, null);
  }
  // Session admin — resolve the actor id + role from the JWT.
  //
  // Reading the role claim rather than the DB row is safe *because
  // verifyAdminAccess already ran on this same cookie*: for a session it
  // re-checks the user against current DB state and rejects on a tokenVersion
  // mismatch, and `admin-users.route.ts` bumps tokenVersion on every
  // privilege-affecting change (role, isActive, doctorId, email). So a cookie
  // still claiming SUPER_ADMIN after a demotion is already dead one request
  // later and can never reach `holdsMembershipConfigRole` below.
  const cookieToken = request.cookies[env.AUTH_COOKIE_NAME];
  // nosemgrep: gh-route-raw-token-verify -- verifyAdminAccess ran above and is the real gate (session re-validated against DB role/isActive/tokenVersion); this re-read only lifts the actor id and role claim off the already-validated cookie.
  const payload = cookieToken ? verifyAuthToken(cookieToken) : null;
  return elevateToManageMemberships(base, payload?.role ?? null, payload?.sub ?? null);
}

export type ManageMembershipsAuthOk = Extract<ManageMembershipsResult, { ok: true }>;

/**
 * Route guard: verifies MANAGE_MEMBERSHIPS and, on failure, sends the error
 * response and returns null (handler should `return`). On success returns the
 * resolved admin actor for audit stamping.
 */
export async function requireManageMemberships(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<ManageMembershipsAuthOk | null> {
  const auth = await verifyManageMembershipsAccess(request);
  if (!auth.ok) {
    reply.status(auth.status).send(errorResponse(auth.message));
    return null;
  }
  return auth;
}

/**
 * Pure rule (unit-testable) for the config tier.
 *
 * SUPER_ADMIN and ADMIN both hold it (user decision 2026-08-07 — day-to-day
 * membership setup is admin work, and requiring a super admin for every price
 * rule made the surface unusable). LOCAL_ADMIN never reaches here: the first
 * stage already denied it.
 *
 * What stays excluded is the master-token fallback. It resolves to actorRole
 * "ADMIN", so without the `method === "session"` check a leaked shared token
 * could rewrite what every member pays. Config writes need a real session, with
 * a named actor to stamp on the audit row.
 */
export function holdsMembershipConfigRole(auth: ManageMembershipsAuthOk): boolean {
  return (
    auth.method === "session" &&
    (auth.actorRole === "SUPER_ADMIN" || auth.actorRole === "ADMIN")
  );
}

/**
 * Second-stage guard for plan/level/benefit writes. Call it with the result of
 * `requireManageMemberships`; on failure it sends the 403 and returns false.
 */
export function requireMembershipConfigRole(
  auth: ManageMembershipsAuthOk,
  reply: FastifyReply,
): boolean {
  if (!holdsMembershipConfigRole(auth)) {
    reply.status(403).send(errorResponse(MEMBERSHIP_CONFIG_FORBIDDEN));
    return false;
  }
  return true;
}

export const MEMBERSHIP_SUPER_ADMIN_FORBIDDEN =
  "This action requires a super admin session";

/**
 * Pure rule (unit-testable) for the third and narrowest tier: SUPER_ADMIN, in a
 * real session, only.
 *
 * Two phase 6 writes sit here, and both share a shape the config tier does not:
 * they move money on a live member by hand, outside the rules an admin
 * configured. The allowance adjust rewrites a counter the member paid for
 * (§7); the manual-booking override applies a benefit the patient is not
 * entitled to (§26). Neither is derivable from plan setup, so neither can be
 * reviewed by looking at the plan afterwards — the only trail is the audit row
 * and the written reason, which is exactly why the named actor is mandatory
 * and the shared master token (`method === "token_fallback"`, actorRole
 * "ADMIN", no actor id) can never reach them.
 */
export function holdsMembershipSuperAdminRole(auth: ManageMembershipsAuthOk): boolean {
  return auth.method === "session" && auth.actorRole === "SUPER_ADMIN";
}

/**
 * Third-stage guard for the allowance adjust (§7) and the goodwill override
 * (§26). Call it with the result of `requireManageMemberships`; on failure it
 * sends the 403 and returns false.
 */
export function requireMembershipSuperAdmin(
  auth: ManageMembershipsAuthOk,
  reply: FastifyReply,
): boolean {
  if (!holdsMembershipSuperAdminRole(auth)) {
    reply.status(403).send(errorResponse(MEMBERSHIP_SUPER_ADMIN_FORBIDDEN));
    return false;
  }
  return true;
}
