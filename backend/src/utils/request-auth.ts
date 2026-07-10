import type { FastifyRequest } from "fastify";
import { env } from "../config/env.js";
import { getSafeUserById, getUserTokenVersion, type SafeUser } from "../modules/auth/auth.service.js";
import { verifyAuthToken, type UserRoleType } from "./auth-session.js";

export async function resolveOptionalAuthUser(request: FastifyRequest): Promise<SafeUser | null> {
  const token = request.cookies[env.AUTH_COOKIE_NAME];
  if (!token) return null;
  const payload = verifyAuthToken(token);
  if (!payload) return null;
  // "Sign out of all devices" — reject a JWT whose tokenVersion is stale
  // before doing the heavier getSafeUserById lookup.
  const tokenVersion = await getUserTokenVersion(payload.sub);
  if (tokenVersion !== payload.tokenVersion) return null;
  const user = await getSafeUserById(payload.sub);
  if (!user) return null;
  if (user.role !== "PATIENT" && user.role !== "ADMIN") return null;
  return user;
}

/**
 * S-008 fix: resolve (userId, role) straight from the verified session JWT
 * for ALL authenticated roles, not just PATIENT/ADMIN.
 *
 * `resolveOptionalAuthUser` above is deliberately narrow — several routes
 * rely on it returning null for DOCTOR/LOCAL_ADMIN/SUPER_ADMIN/CORPORATE_ADMIN
 * sessions, so widening it would change behaviour far outside this pass's
 * scope (same reasoning as `resolveAdminSessionActor` in admin-auth.ts,
 * which fixed the identical gap for the ADMIN-tier subset in code review
 * 2026-07-05, bug #4).
 *
 * Use THIS function instead at call sites that only need to attribute an
 * already-authorized action to its real actor for an audit-log row (the
 * route's actual permission check — verifyAdminAccess / verifyDoctorAccess /
 * etc. — has already run by the time this is called). Using
 * `resolveOptionalAuthUser` for that purpose silently drops the actor id
 * (and mislabels the role) for every DOCTOR/LOCAL_ADMIN/SUPER_ADMIN action,
 * which is exactly the "null/incorrect actor" gap S-008 flags.
 *
 * Does not re-check tokenVersion (session revocation) — by design, this is
 * an attribution helper for a request already past its real auth gate, not
 * an auth check itself.
 */
export function resolveAuditActor(
  request: FastifyRequest,
): { userId: string; role: UserRoleType } | null {
  const token = request.cookies[env.AUTH_COOKIE_NAME];
  if (!token) return null;
  const payload = verifyAuthToken(token);
  if (!payload) return null;
  return { userId: payload.sub, role: payload.role };
}

