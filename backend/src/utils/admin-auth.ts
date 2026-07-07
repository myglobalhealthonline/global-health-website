import { env } from "../config/env.js";
import type { FastifyRequest } from "fastify";
import { prisma } from "../db/prisma.js";
import { evaluateAdminAccess, type AdminAccessResult } from "./admin-access-evaluator.js";
import { verifyAuthToken } from "./auth-session.js";

export async function verifyAdminAccess(request: FastifyRequest): Promise<AdminAccessResult> {
  // JWT role must be read for DOCTOR sessions — resolveOptionalAuthUser only loads PATIENT/ADMIN.
  let sessionRole: "PATIENT" | "ADMIN" | "DOCTOR" | "LOCAL_ADMIN" | "SUPER_ADMIN" | "CORPORATE_ADMIN" | null = null;
  const cookieToken = request.cookies[env.AUTH_COOKIE_NAME];
  const payload = cookieToken ? verifyAuthToken(cookieToken) : null;
  if (payload?.role) {
    sessionRole = payload.role;
  }
  const result = evaluateAdminAccess({
    sessionRole,
    authorizationHeader: request.headers.authorization,
    expectedToken: env.ADMIN_API_TOKEN,
    tokenFallbackEnabled: env.ADMIN_TOKEN_FALLBACK_ENABLED,
  });
  // Gate is a no-op (zero DB cost) unless the operator opted the session's
  // role into REQUIRE_2FA_FOR_ROLES — default empty, so this block never
  // runs for any role today. Only applies to the session path: a
  // token-fallback admin has no user row for 2FA to check.
  if (
    result.ok &&
    result.method === "session" &&
    payload &&
    env.REQUIRE_2FA_FOR_ROLES.has(payload.role)
  ) {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { twoFactorEnabled: true },
    });
    if (!user?.twoFactorEnabled) {
      return {
        ok: false,
        status: 403,
        message: "Two-factor authentication is required for this role. Enroll TOTP in account security settings before continuing.",
      };
    }
  }
  return result;
}

/**
 * Resolve the real (userId, role) of an admin-tier session directly from
 * the JWT, for callers that need to know the actual role — e.g. to pass to
 * guardMedicalRead's LOCAL_ADMIN folder-scope check.
 *
 * Do NOT use `resolveOptionalAuthUser` for this: it only resolves
 * PATIENT/ADMIN sessions and returns null for LOCAL_ADMIN and DOCTOR (same
 * reasoning as the comment on `verifyAdminAccess` above). A caller that
 * fell back to `actor?.role ?? "ADMIN"` after that null would silently
 * treat every real LOCAL_ADMIN session as unrestricted ADMIN — exactly the
 * bug this function exists to prevent (code review 2026-07-05, bug #4 and
 * its wider blast radius across the admin PHI routes).
 */
export function resolveAdminSessionActor(
  request: FastifyRequest,
): { userId: string; role: "ADMIN" | "SUPER_ADMIN" | "LOCAL_ADMIN" } | null {
  const cookieToken = request.cookies[env.AUTH_COOKIE_NAME];
  const payload = cookieToken ? verifyAuthToken(cookieToken) : null;
  if (
    !payload ||
    (payload.role !== "ADMIN" && payload.role !== "SUPER_ADMIN" && payload.role !== "LOCAL_ADMIN")
  ) {
    return null;
  }
  return { userId: payload.sub, role: payload.role };
}
