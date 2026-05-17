import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 *   GET   /api/doctor/notifications?onlyUnread=1
 *   PATCH /api/doctor/notifications/:id/read
 *   POST  /api/doctor/notifications/read-all
 *
 * Polling-based notifications for the doctor portal. Writers across
 * the codebase (internal-message POST, appointment-assign hook,
 * consult-sign POST) insert rows directly via Prisma — there's no
 * public `POST /api/doctor/notifications` because creation is
 * always internal.
 */

const listQuerySchema = z.object({
  onlyUnread: z
    .preprocess((v) => v === "1" || v === "true", z.boolean())
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const notificationsRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/doctor/notifications", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
    const q = listQuerySchema.safeParse(request.query);
    if (!q.success) {
      return reply.status(400).send(errorResponse("Invalid query", q.error.flatten()));
    }
    try {
      const where = {
        recipientUserId: auth.userId,
        ...(q.data.onlyUnread ? { readAt: null } : {}),
      };
      const [items, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: q.data.limit,
        }),
        prisma.notification.count({
          where: { recipientUserId: auth.userId, readAt: null },
        }),
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
    "/api/doctor/notifications/:id/read",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const updated = await prisma.notification.updateMany({
          where: { id: request.params.id, recipientUserId: auth.userId, readAt: null },
          data: { readAt: new Date() },
        });
        if (updated.count === 0) {
          // Either not theirs or already read — both surface as "no
          // change" rather than 404 to keep the bell UI idempotent.
          return okResponse({ updated: 0 });
        }
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

  app.post("/api/doctor/notifications/read-all", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
    try {
      const res = await prisma.notification.updateMany({
        where: { recipientUserId: auth.userId, readAt: null },
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

export default notificationsRoute;
