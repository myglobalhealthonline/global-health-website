import { env } from "../config/env.js";
import type { FastifyRequest } from "fastify";
import { evaluateAdminAccess, type AdminAccessResult } from "./admin-access-evaluator.js";
import { verifyAuthToken } from "./auth-session.js";

export async function verifyAdminAccess(request: FastifyRequest): Promise<AdminAccessResult> {
  // JWT role must be read for DOCTOR sessions — resolveOptionalAuthUser only loads PATIENT/ADMIN.
  let sessionRole: "PATIENT" | "ADMIN" | "DOCTOR" | null = null;
  const cookieToken = request.cookies[env.AUTH_COOKIE_NAME];
  const payload = cookieToken ? verifyAuthToken(cookieToken) : null;
  if (payload?.role === "ADMIN" || payload?.role === "DOCTOR" || payload?.role === "PATIENT") {
    sessionRole = payload.role;
  }
  return evaluateAdminAccess({
    sessionRole,
    authorizationHeader: request.headers.authorization,
    expectedToken: env.ADMIN_API_TOKEN,
    tokenFallbackEnabled: env.ADMIN_TOKEN_FALLBACK_ENABLED,
  });
}
