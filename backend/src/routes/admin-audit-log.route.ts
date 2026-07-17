import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { verifyGlobalAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 *   GET /api/admin/audit-log?page=1&pageSize=50&action=&entityType=&entityId=&actorUserId=&fromDate=&toDate=
 *
 * Read-only admin window onto the audit trail. Supports the common
 * filters needed to investigate a specific consult or to scan an
 * actor's history during a compliance review.
 */

const listQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(200).default(50),
    /**
     * Action filter — accepts a single action name OR a comma-separated
     * list (e.g. `LOGIN,LOGOUT,LOGIN_FAILED`) so the admin UI can offer
     * one-click filter chips for related action groups.
     */
    action: z.string().trim().min(1).max(256).optional(),
    entityType: z.string().trim().min(1).max(64).optional(),
    entityId: z.string().trim().min(1).max(64).optional(),
    actorUserId: z.string().trim().min(1).max(64).optional(),
    /** Inclusive date-range filter on `createdAt`, `YYYY-MM-DD`. */
    fromDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    toDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .refine((d) => !d.fromDate || !d.toDate || d.fromDate <= d.toDate, {
    message: "fromDate must be on or before toDate",
    path: ["fromDate"],
  });

/** Hard cap on rows returned by the CSV export — protects the DB and
 *  response size from an unbounded compliance pull. */
const EXPORT_ROW_LIMIT = 10_000;

function buildAuditWhere(q: z.infer<typeof listQuerySchema>) {
  const { action, entityType, entityId, actorUserId, fromDate, toDate } = q;
  const actionFilter = action
    ? action.includes(",")
      ? { in: action.split(",").map((s) => s.trim()).filter(Boolean) as never[] }
      : (action as never)
    : undefined;
  // toDate is a calendar day — extend to end-of-day so that day's events
  // are included in the inclusive range.
  const createdAtFilter =
    fromDate || toDate
      ? {
          ...(fromDate ? { gte: new Date(`${fromDate}T00:00:00.000Z`) } : {}),
          ...(toDate ? { lte: new Date(`${toDate}T23:59:59.999Z`) } : {}),
        }
      : undefined;
  return {
    ...(actionFilter !== undefined ? { action: actionFilter } : {}),
    ...(entityType ? { entityType } : {}),
    ...(entityId ? { entityId } : {}),
    ...(actorUserId ? { actorUserId } : {}),
    ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
  };
}

/** Escape a value for a CSV cell (RFC 4180: quote + double-up inner quotes)
 *  and neutralize formula injection: a cell beginning with = + - @ (or tab/CR)
 *  is evaluated as a formula by Excel/Sheets even when quoted, so prefix it
 *  with a single quote. actorUser.fullName / metadata are attacker-influenced. */
function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Flatten a JSON metadata blob into a single readable "key: value; …" cell. */
function flattenMetadata(metadata: unknown): string {
  if (!metadata || typeof metadata !== "object") return "";
  return Object.entries(metadata as Record<string, unknown>)
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join("; ");
}

const adminAuditLogRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyGlobalAdminAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
  });

  // Must be registered before the plain GET route below so Fastify's
  // static "/export" segment wins over any dynamic matching.
  app.get("/api/admin/audit-log/export", async (request, reply) => {
    const q = listQuerySchema.safeParse(request.query);
    if (!q.success) {
      return reply.status(400).send(errorResponse("Invalid query", q.error.flatten()));
    }
    try {
      const where = buildAuditWhere(q.data);
      const rows = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: EXPORT_ROW_LIMIT + 1,
        include: {
          actorUser: { select: { fullName: true, email: true } },
        },
      });
      const truncated = rows.length > EXPORT_ROW_LIMIT;
      const exportRows = truncated ? rows.slice(0, EXPORT_ROW_LIMIT) : rows;

      const header = ["timestamp", "action", "entityType", "entityId", "actorUserId", "actorName", "summary"];
      const lines = [header.map(csvCell).join(",")];
      if (truncated) {
        lines.push(
          [csvCell(""), csvCell("NOTE"), csvCell(""), csvCell(""), csvCell(""), csvCell(""), csvCell(
            `Result exceeded ${EXPORT_ROW_LIMIT} rows; truncated to the most recent ${EXPORT_ROW_LIMIT}. Narrow filters to see the rest.`,
          )].join(","),
        );
      }
      for (const r of exportRows) {
        lines.push(
          [
            csvCell(r.createdAt.toISOString()),
            csvCell(r.action),
            csvCell(r.entityType),
            csvCell(r.entityId),
            csvCell(r.actorUserId ?? ""),
            csvCell(r.actorUser?.fullName ?? r.actorUser?.email ?? ""),
            csvCell(flattenMetadata(r.metadata)),
          ].join(","),
        );
      }
      const csv = lines.join("\r\n") + "\r\n";
      const filename = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      return reply
        .header("Content-Type", "text/csv; charset=utf-8")
        .header("Content-Disposition", `attachment; filename="${filename}"`)
        .send(csv);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not export audit log"));
    }
  });

  app.get("/api/admin/audit-log", async (request, reply) => {
    const q = listQuerySchema.safeParse(request.query);
    if (!q.success) {
      return reply.status(400).send(errorResponse("Invalid query", q.error.flatten()));
    }
    const { page, pageSize } = q.data;
    try {
      const where = buildAuditWhere(q.data);
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
          hasPrev: page > 1,
          hasNext: page < (total === 0 ? 0 : Math.ceil(total / pageSize)),
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
