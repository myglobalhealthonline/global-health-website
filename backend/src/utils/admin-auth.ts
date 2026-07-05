import { env } from "../config/env.js";
import type { FastifyRequest } from "fastify";
import { evaluateAdminAccess, type AdminAccessResult } from "./admin-access-evaluator.js";
import { verifyAuthToken } from "./auth-session.js";

export async function verifyAdminAccess(request: FastifyRequest): Promise<AdminAccessResult> {
  // JWT role must be read for DOCTOR sessions — resolveOptionalAuthUser only loads PATIENT/ADMIN.
  let sessionRole: "PATIENT" | "ADMIN" | "DOCTOR" | "LOCAL_ADMIN" | "SUPER_ADMIN" | null = null;
  const cookieToken = request.cookies[env.AUTH_COOKIE_NAME];
  const payload = cookieToken ? verifyAuthToken(cookieToken) : null;
  if (payload?.role) {
    sessionRole = payload.role;
  }
  return evaluateAdminAccess({
    sessionRole,
    authorizationHeader: request.headers.authorization,
    expectedToken: env.ADMIN_API_TOKEN,
    tokenFallbackEnabled: env.ADMIN_TOKEN_FALLBACK_ENABLED,
  });
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
