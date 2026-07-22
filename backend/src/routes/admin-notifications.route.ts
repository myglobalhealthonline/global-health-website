import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { resolveOptionalAuthUser } from "../utils/request-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Admin in-app notifications. Polling-based, mirrors the doctor
 * (`notifications.route.ts`) and patient (`me-notifications.route.ts`)
 * routes but scoped to the authenticated ADMIN. Rows are written
 * internally by `notifyAdmins` (patient chat messages, internal messages,
 * clinical events); there is no public create endpoint.
 *
 *   GET   /api/admin/notifications?onlyUnread=1&limit=50
 *   PATCH /api/admin/notifications/:id/read
 *   POST  /api/admin/notifications/read-all
 *   POST  /api/admin/notifications/appointment/:appointmentId/read
 */

const listQuerySchema = z.object({
  onlyUnread: z.preprocess((v) => v === "1" || v === "true", z.boolean()).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// Deliberately session-only (resolveOptionalAuthUser), not verifyAdminAccess
// — this route filters by recipientUserId, which requires a real
// session-bound user id. verifyAdminAccess also accepts the Bearer-token
// admin fallback, which has no such id, so it can't be swapped in here.
// The `role !== "ADMIN"` check below is what actually enforces the guard;
// don't drop it in a future edit just because the resolver name says
// "optional".
async function requireAdminId(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<string | null> {
  let user;
  try {
    user = await resolveOptionalAuthUser(request);
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) {
      reply.status(503).send(errorResponse(error.message));
      return null;
    }
    reply.status(500).send(errorResponse("Unexpected authentication error"));
    return null;
  }
  if (!user) {
    reply.status(401).send(errorResponse("Not authenticated"));
    return null;
  }
  if (user.role !== "ADMIN") {
    reply.status(403).send(errorResponse("Forbidden"));
    return null;
  }
  return user.id;
}

const adminNotificationsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/admin/notifications", async (request, reply) => {
    const userId = await requireAdminId(request, reply);
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
    "/api/admin/notifications/:id/read",
    async (request, reply) => {
      const userId = await requireAdminId(request, reply);
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

  // Clear every unread notification tied to one appointment. Called when
  // an admin actually opens that appointment's thread in the Messages
  // inbox — without it the bell count only ever grows, since nothing else
  // marks admin rows read.
  app.post<{ Params: { appointmentId: string } }>(
    "/api/admin/notifications/appointment/:appointmentId/read",
    async (request, reply) => {
      const userId = await requireAdminId(request, reply);
      if (!userId) return;
      try {
        const updated = await prisma.notification.updateMany({
          where: {
            recipientUserId: userId,
            readAt: null,
            payload: {
              path: ["appointmentId"],
              equals: request.params.appointmentId,
            },
          },
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

  app.post("/api/admin/notifications/read-all", async (request, reply) => {
    const userId = await requireAdminId(request, reply);
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

export default adminNotificationsRoute;
