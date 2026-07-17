import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { replyWithError } from "../utils/reply-error.js";
import {
  listDeletionRequests,
  updateDeletionRequest,
  anonymizePatient,
} from "../modules/data-policy/country-data-policy.service.js";
import { env } from "../config/env.js";
import { verifyAuthToken } from "../utils/auth-session.js";

const adminDataDeletionRoute: FastifyPluginAsync = async (app) => {
  // ─── List all deletion requests ───────────────────────────────────────────

  app.get(
    "/api/admin/data-deletion-requests",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const querySchema = z.object({
        status: z
          .enum(["SUBMITTED", "UNDER_REVIEW", "PARTIALLY_COMPLETED", "COMPLETED", "REJECTED"])
          .optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(25),
      });

      const q = querySchema.safeParse(request.query);
      if (!q.success) {
        return reply.status(400).send(errorResponse("Invalid query params", q.error.flatten()));
      }

      try {
        const result = await listDeletionRequests({
          status: q.data.status,
          limit: q.data.limit,
          offset: (q.data.page - 1) * q.data.limit,
        });
        return okResponse(result);
      } catch (error) {
        return replyWithError(reply, app.log, error, "Could not list deletion requests");
      }
    },
  );

  // ─── Update deletion request status ──────────────────────────────────────

  const patchSchema = z.object({
    status: z.enum(["UNDER_REVIEW", "PARTIALLY_COMPLETED", "COMPLETED", "REJECTED"]),
    adminNotes: z.string().max(2000).optional(),
    executeAnonymize: z.boolean().optional(),
  });

  app.patch<{ Params: { id: string } }>(
    "/api/admin/data-deletion-requests/:id",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const body = patchSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid payload", body.error.flatten()));
      }

      const cookieToken = request.cookies[env.AUTH_COOKIE_NAME];
      const payload = cookieToken ? verifyAuthToken(cookieToken) : null;
      const adminId = payload?.sub ?? "token-fallback-admin";

      try {
        await updateDeletionRequest({
          requestId: request.params.id,
          requestStatus: body.data.status,
          reviewedByAdminId: adminId,
          notes: body.data.adminNotes,
        });

        // Optionally execute anonymization immediately when marking done.
        // (PARTIALLY_COMPLETED = anonymize ran but storage purge is queued;
        // COMPLETED = fully done — either may carry executeAnonymize.)
        if (
          body.data.executeAnonymize &&
          (body.data.status === "PARTIALLY_COMPLETED" || body.data.status === "COMPLETED")
        ) {
          const { prisma } = await import("../db/prisma.js");
          const req = await prisma.dataDeletionRequest.findUnique({
            where: { id: request.params.id },
            select: { patientProfileId: true },
          });
          if (req?.patientProfileId) {
            await anonymizePatient({ patientProfileId: req.patientProfileId, adminId });
          }
        }

        return okResponse({ updated: true }, "Deletion request updated");
      } catch (error) {
        return replyWithError(reply, app.log, error, "Could not update deletion request");
      }
    },
  );

  // ─── Directly anonymize a patient (separate from deletion workflow) ───────

  const anonymizeSchema = z.object({
    patientProfileId: z.string().min(1),
    reason: z.string().trim().min(10).max(500),
  });

  app.post(
    "/api/admin/patient-anonymize",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const body = anonymizeSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid payload", body.error.flatten()));
      }

      const cookieToken = request.cookies[env.AUTH_COOKIE_NAME];
      const payload = cookieToken ? verifyAuthToken(cookieToken) : null;
      const adminId = payload?.sub ?? "token-fallback-admin";

      try {
        await anonymizePatient({ patientProfileId: body.data.patientProfileId, adminId });
        return okResponse({ anonymized: true }, "Patient data anonymized");
      } catch (error) {
        return replyWithError(reply, app.log, error, "Could not anonymize patient");
      }
    },
  );
};

export default adminDataDeletionRoute;
