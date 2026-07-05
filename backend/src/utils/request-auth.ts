import type { FastifyRequest } from "fastify";
import { env } from "../config/env.js";
import { getSafeUserById, getUserTokenVersion, type SafeUser } from "../modules/auth/auth.service.js";
import { verifyAuthToken } from "./auth-session.js";

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

