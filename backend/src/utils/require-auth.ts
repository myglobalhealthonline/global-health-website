import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { verifyAuthToken } from "./auth-session.js";
import { errorResponse } from "./response.js";

export type AuthedUserPayload = {
  sub: string;
  role: "PATIENT" | "ADMIN" | "DOCTOR" | "LOCAL_ADMIN" | "SUPER_ADMIN" | "CORPORATE_ADMIN";
  email: string;
};

declare module "fastify" {
  interface FastifyRequest {
    /** Set by the `requireAuth` preHandler on successful verification. */
    authUser?: AuthedUserPayload;
  }
}

/**
 * Fastify preHandler: require a valid auth cookie. Replies with 401 +
 * the standard `errorResponse("Not authenticated")` body if missing /
 * invalid. On success, the verified payload is stashed on
 * `request.authUser` so route handlers can read it without re-parsing
 * the cookie.
 *
 * Also enforces "sign out of all devices": the JWT's tokenVersion must
 * match the current DB value, and the account must still be active and
 * not past its scheduled deletion date. This is the single most-used
 * auth gate, so the DB check lives here once rather than duplicated
 * per-route.
 *
 * Use either as a per-route `{ preHandler: requireAuth }` config or as
 * an `onRequest`/`preHandler` hook on an entire plugin.
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const token = request.cookies[env.AUTH_COOKIE_NAME];
  if (!token) {
    void reply.status(401).send(errorResponse("Not authenticated"));
    return;
  }
  const payload = verifyAuthToken(token);
  if (!payload) {
    void reply.status(401).send(errorResponse("Not authenticated"));
    return;
  }
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { tokenVersion: true, isActive: true, deletionScheduledAt: true },
  });
  const deletionPassed = Boolean(user?.deletionScheduledAt && user.deletionScheduledAt.getTime() < Date.now());
  if (!user || !user.isActive || deletionPassed || user.tokenVersion !== payload.tokenVersion) {
    void reply.status(401).send(errorResponse("Not authenticated"));
    return;
  }
  request.authUser = payload;
}
