import type { FastifyRequest } from "fastify";
import { env } from "../config/env.js";
import { getSafeUserById, type SafeUser } from "../modules/auth/auth.service.js";
import { verifyAuthToken } from "./auth-session.js";

export async function resolveOptionalAuthUser(request: FastifyRequest): Promise<SafeUser | null> {
  const token = request.cookies[env.AUTH_COOKIE_NAME];
  if (!token) return null;
  const payload = verifyAuthToken(token);
  if (!payload) return null;
  const user = await getSafeUserById(payload.sub);
  if (!user) return null;
  if (user.role !== "PATIENT" && user.role !== "ADMIN") return null;
  return user;
}

