import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  AUTOMATION_CATALOG,
  catalogEntryForKey,
  formatOrderDisplayId,
} from "../modules/automation/automation-catalog.js";
import { listAutomationRuns, listAutomationRunOrders } from "../modules/automation/automation-run.service.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { verifyGlobalAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  automationKey: z.string().trim().min(1).max(128).optional(),
  orderId: z.string().trim().min(1).max(64).optional(),
});

const adminAutomationRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyGlobalAdminAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
  });

  app.get("/api/admin/automation/catalog", async (_request, _reply) => {
    return okResponse({ items: AUTOMATION_CATALOG });
  });

  const ordersQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
  });

  app.get("/api/admin/automation/orders", async (request, reply) => {
    const q = ordersQuerySchema.safeParse(request.query);
    if (!q.success) {
      return reply.status(400).send(errorResponse("Invalid query", q.error.flatten()));
    }
    try {
      const result = await listAutomationRunOrders(q.data);
      return okResponse({
        ...result,
        page: q.data.page,
        pageSize: q.data.pageSize,
      });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load automation orders"));
    }
  });

  app.get("/api/admin/automation/runs", async (request, reply) => {
    const q = listQuerySchema.safeParse(request.query);
    if (!q.success) {
      return reply.status(400).send(errorResponse("Invalid query", q.error.flatten()));
    }
    try {
      const { total, items } = await listAutomationRuns(q.data);
      return okResponse({
        total,
        page: q.data.page,
        pageSize: q.data.pageSize,
        items: items.map((row) => {
          const catalog = catalogEntryForKey(row.automationKey);
          return {
            id: row.id,
            automationKey: row.automationKey,
            automationName: catalog?.name ?? row.automationKey,
            flow: catalog?.flow ?? "—",
            orderId: row.orderId,
            orderNumber: row.orderId
              ? formatOrderDisplayId({
                  id: row.orderId,
                  orderNumber: row.order?.orderNumber,
                })
              : null,
            orderEmail: row.order?.email ?? null,
            orderPaymentStatus: row.order?.paymentStatus ?? null,
            orderStatus: row.order?.status ?? null,
            appointmentId: row.appointmentId,
            status: row.status,
            channel: row.channel,
            recipient: row.recipient,
            summary: row.summary,
            error: row.error,
            scheduledFor: row.scheduledFor?.toISOString() ?? null,
            executedAt: row.executedAt?.toISOString() ?? null,
            createdAt: row.createdAt.toISOString(),
          };
        }),
      });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not load automation runs"));
    }
  });
};

export default adminAutomationRoute;
