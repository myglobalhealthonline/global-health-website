import { env } from "../config/env.js";

export function verifyAdminToken(authorizationHeader: string | undefined) {
  const expectedToken = env.ADMIN_API_TOKEN;
  if (!expectedToken) {
    return { ok: false as const, status: 503, message: "Admin auth is not configured" };
  }

  if (!authorizationHeader?.startsWith("Bearer ")) {
    return { ok: false as const, status: 401, message: "Missing bearer token" };
  }

  const providedToken = authorizationHeader.slice("Bearer ".length).trim();
  if (providedToken.length === 0 || providedToken !== expectedToken) {
    return { ok: false as const, status: 401, message: "Invalid admin token" };
  }

  return { ok: true as const };
}
