import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Patient in-app notifications (§30). Polling-based, mirrors the doctor route
 * but scoped to the authenticated PATIENT. Rows are written internally by the
 * subscription notification dispatchers; there is no public create endpoint.
 *
 *   GET   /api/me/notifications?onlyUnread=1&limit=50
 *   PATCH /api/me/notifications/:id/read
 *   POST  /api/me/notifications/read-all
 */

const listQuerySchema = z.object({
  onlyUnread: z.preprocess((v) => v === "1" || v === "true", z.boolean()).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

async function requirePatientId(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<string | null> {
  const user = await resolveOptionalAuthUser(request);
  if (!user || user.role !== "PATIENT") {
    reply.status(401).send(errorResponse("Authentication required"));
    return null;
  }
  return user.id;
}

const meNotificationsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/me/notifications", async (request, reply) => {
    const userId = await requirePatientId(request, reply);
    if (!userId) return;
    const q = listQuerySchema.safeParse(request.query);
    if (!q.success) {
      return reply.status(400).send(errorResponse("Invalid query", q.error.flatten()));
    }
    try {
      const where = {
        recipientUserId: userId,
        ...(q.data.onlyUnread ? { readAt: null } : {}),
      };
      const [items, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: q.data.limit,
        }),
        prisma.notification.count({ where: { recipientUserId: userId, readAt: null } }),
      ]);
      return okResponse({
        items: items.map((n) => ({
          id: n.id,
          type: n.type,
          payload: n.payload,
          readAt: n.readAt?.toISOString() ?? null,
          createdAt: n.createdAt.toISOString(),
        })),
        unreadCount,
      });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load notifications"));
    }
  });

  app.patch<{ Params: { id: string } }>(
    "/api/me/notifications/:id/read",
    async (request, reply) => {
      const userId = await requirePatientId(request, reply);
      if (!userId) return;
      try {
        const updated = await prisma.notification.updateMany({
          where: { id: request.params.id, recipientUserId: userId, readAt: null },
          data: { readAt: new Date() },
        });
        return okResponse({ updated: updated.count });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not mark as read"));
      }
    },
  );

  app.post("/api/me/notifications/read-all", async (request, reply) => {
    const userId = await requirePatientId(request, reply);
    if (!userId) return;
    try {
      const res = await prisma.notification.updateMany({
        where: { recipientUserId: userId, readAt: null },
        data: { readAt: new Date() },
      });
      return okResponse({ updated: res.count });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not mark all as read"));
    }
  });
};

export default meNotificationsRoute;
