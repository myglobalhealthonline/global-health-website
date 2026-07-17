import { env } from "../config/env.js";
import type { FastifyRequest } from "fastify";
import { prisma } from "../db/prisma.js";
import { evaluateAdminAccess, type AdminAccessResult } from "./admin-access-evaluator.js";
import { verifyAuthToken } from "./auth-session.js";

export async function verifyAdminAccess(request: FastifyRequest): Promise<AdminAccessResult> {
  return verifyAdminAccessInternal(request, false);
}

/**
 * SEC-001: authorization gate for global/cross-country admin operations
 * (country CRUD / global config, full doctor IBAN reveal). Identical to
 * `verifyAdminAccess` except a LOCAL_ADMIN — who is scoped to a single
 * country — is rejected 403 both at the JWT-role check and at the CURRENT-DB
 * role re-validation, so a demoted-to-LOCAL_ADMIN cookie can't reach global
 * ops either. ADMIN/SUPER_ADMIN and the maintenance-token fallback are
 * unchanged.
 */
export async function verifyGlobalAdminAccess(request: FastifyRequest): Promise<AdminAccessResult> {
  return verifyAdminAccessInternal(request, true);
}

async function verifyAdminAccessInternal(
  request: FastifyRequest,
  requireGlobalScope: boolean,
): Promise<AdminAccessResult> {
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
    requireGlobalScope,
  });
  if (!result.ok) return result;

  // S-004: a session-based admin cookie must be re-validated against
  // CURRENT database state on every request, not just its own signature —
  // otherwise a demoted, deactivated, or password/role-changed admin's
  // still-signed cookie keeps working until it naturally expires. A
  // token-fallback admin (dev/local only) has no user row to check.
  if (result.method === "session" && payload) {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { role: true, isActive: true, tokenVersion: true, twoFactorEnabled: true },
    });
    // For global-scope ops, LOCAL_ADMIN is not a valid session role even if
    // the JWT still claimed a higher role (e.g. just demoted) — reject here
    // so the CURRENT DB role governs, mirroring the evaluator's JWT check.
    const roleAllowsSession =
      user &&
      (user.role === "ADMIN" ||
        user.role === "SUPER_ADMIN" ||
        (!requireGlobalScope && user.role === "LOCAL_ADMIN"));
    if (
      !user ||
      !user.isActive ||
      user.tokenVersion !== payload.tokenVersion ||
      !roleAllowsSession
    ) {
      return { ok: false, status: 401, message: "Session is no longer valid — please sign in again" };
    }
    // Gate is a no-op (zero DB cost above) unless the operator opted the
    // role into REQUIRE_2FA_FOR_ROLES — default empty, so this never
    // fires today. Uses the CURRENT DB role, not the JWT's role claim.
    if (env.REQUIRE_2FA_FOR_ROLES.has(user.role) && !user.twoFactorEnabled) {
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
