import { env } from "../config/env.js";
import type { FastifyRequest } from "fastify";
import { resolveOptionalAuthUser } from "./request-auth.js";
import { evaluateAdminAccess, type AdminAccessResult } from "./admin-access-evaluator.js";

export async function verifyAdminAccess(request: FastifyRequest): Promise<AdminAccessResult> {
  const authUser = await resolveOptionalAuthUser(request);
  return evaluateAdminAccess({
    sessionRole: authUser?.role ?? null,
    authorizationHeader: request.headers.authorization,
    expectedToken: env.ADMIN_API_TOKEN,
    tokenFallbackEnabled: env.ADMIN_TOKEN_FALLBACK_ENABLED,
  });
}
