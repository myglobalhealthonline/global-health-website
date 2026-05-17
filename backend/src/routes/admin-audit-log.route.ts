import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 *   GET /api/admin/audit-log?page=1&pageSize=50&action=&entityType=&entityId=&actorUserId=
 *
 * Read-only admin window onto the audit trail. Supports the common
 * filters needed to investigate a specific consult or to scan an
 * actor's history during a compliance review.
 */

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  action: z.string().trim().min(1).max(64).optional(),
  entityType: z.string().trim().min(1).max(64).optional(),
  entityId: z.string().trim().min(1).max(64).optional(),
  actorUserId: z.string().trim().min(1).max(64).optional(),
});

const adminAuditLogRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/admin/audit-log", async (request, reply) => {
    const admin = await verifyAdminAccess(request);
    if (!admin.ok) return reply.status(admin.status).send(errorResponse(admin.message));
    const q = listQuerySchema.safeParse(request.query);
    if (!q.success) {
      return reply.status(400).send(errorResponse("Invalid query", q.error.flatten()));
    }
    const { page, pageSize, action, entityType, entityId, actorUserId } = q.data;
    try {
      const where = {
        ...(action ? { action: action as never } : {}),
        ...(entityType ? { entityType } : {}),
        ...(entityId ? { entityId } : {}),
        ...(actorUserId ? { actorUserId } : {}),
      };
      const [total, rows] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            actorUser: { select: { fullName: true, email: true, role: true } },
          },
        }),
      ]);
      return okResponse({
        items: rows.map((r) => ({
          id: r.id,
          action: r.action,
          entityType: r.entityType,
          entityId: r.entityId,
          metadata: r.metadata,
          ipAddress: r.ipAddress,
          actorUserId: r.actorUserId,
          actorRole: r.actorRole,
          actor: r.actorUser
            ? {
                fullName: r.actorUser.fullName,
                email: r.actorUser.email,
                role: r.actorUser.role,
              }
            : null,
          createdAt: r.createdAt.toISOString(),
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
        },
      });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load audit log"));
    }
  });
};

export default adminAuditLogRoute;
