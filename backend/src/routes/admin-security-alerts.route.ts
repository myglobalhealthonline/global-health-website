import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { verifyGlobalAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { replyWithError } from "../utils/reply-error.js";
import {
  listSecurityAlerts,
  updateAlertStatus,
} from "../modules/security-alerts/security-alert.service.js";

const adminSecurityAlertsRoute: FastifyPluginAsync = async (app) => {
  // ─── List alerts ──────────────────────────────────────────────────────────

  app.get(
    "/api/admin/security-alerts",
    async (request, reply) => {
      const auth = await verifyGlobalAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const querySchema = z.object({
        status: z.enum(["OPEN", "INVESTIGATING", "RESOLVED", "DISMISSED"]).optional(),
        severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
        countryFolder: z.string().max(10).optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(25),
      });

      const q = querySchema.safeParse(request.query);
      if (!q.success) {
        return reply.status(400).send(errorResponse("Invalid query params", q.error.flatten()));
      }

      try {
        const result = await listSecurityAlerts({
          status: q.data.status,
          severity: q.data.severity,
          countryFolder: q.data.countryFolder,
          limit: q.data.limit,
          offset: (q.data.page - 1) * q.data.limit,
        });
        return okResponse(result);
      } catch (error) {
        return replyWithError(reply, app.log, error, "Could not list security alerts");
      }
    },
  );

  // ─── Update alert status ──────────────────────────────────────────────────

  const patchSchema = z.object({
    status: z.enum(["INVESTIGATING", "RESOLVED", "DISMISSED"]),
    notes: z.string().max(1000).optional(),
  });

  app.patch<{ Params: { id: string } }>(
    "/api/admin/security-alerts/:id",
    async (request, reply) => {
      const auth = await verifyGlobalAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const body = patchSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid payload", body.error.flatten()));
      }

      // Extract reviewer admin ID from session if available
      const { verifyAuthToken } = await import("../utils/auth-session.js");
      const { env } = await import("../config/env.js");
      const cookieToken = request.cookies[env.AUTH_COOKIE_NAME];
      const payload = cookieToken ? verifyAuthToken(cookieToken) : null;
      const resolvedByAdminId = payload?.sub;

      try {
        await updateAlertStatus(request.params.id, body.data.status, resolvedByAdminId);
        return okResponse({ updated: true }, "Alert status updated");
      } catch (error) {
        return replyWithError(reply, app.log, error, "Could not update alert");
      }
    },
  );
};

export default adminSecurityAlertsRoute;
