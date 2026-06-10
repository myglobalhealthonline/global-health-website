import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { replyWithError } from "../utils/reply-error.js";
import {
  findPotentialDuplicates,
  mergePatients,
  getMergeStatus,
} from "../modules/patient-merge/patient-merge.service.js";
import { env } from "../config/env.js";
import { verifyAuthToken } from "../utils/auth-session.js";

const adminPatientMergeRoute: FastifyPluginAsync = async (app) => {
  // ─── Find potential duplicates for a given patient ────────────────────────

  app.get<{ Params: { patientId: string } }>(
    "/api/admin/patient-merge/duplicates/:patientId",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      try {
        const duplicates = await findPotentialDuplicates(request.params.patientId);
        return okResponse({ duplicates });
      } catch (error) {
        return replyWithError(reply, app.log, error, "Could not search for duplicates");
      }
    },
  );

  // ─── Get merge status for a given patient ─────────────────────────────────

  app.get<{ Params: { patientId: string } }>(
    "/api/admin/patient-merge/status/:patientId",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      try {
        const status = await getMergeStatus(request.params.patientId);
        return okResponse(status);
      } catch (error) {
        return replyWithError(reply, app.log, error, "Could not get merge status");
      }
    },
  );

  // ─── Perform merge ────────────────────────────────────────────────────────

  const mergeSchema = z.object({
    primaryPatientId: z.string().min(1),
    duplicatePatientId: z.string().min(1),
    reason: z.string().trim().min(10).max(500),
  });

  app.post(
    "/api/admin/patient-merge",
    {
      // Hard rate-limit: merges are irreversible and should never be automated.
      config: { rateLimit: { max: 20, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const body = mergeSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid merge payload", body.error.flatten()));
      }

      if (body.data.primaryPatientId === body.data.duplicatePatientId) {
        return reply.status(400).send(errorResponse("Primary and duplicate cannot be the same patient"));
      }

      const cookieToken = request.cookies[env.AUTH_COOKIE_NAME];
      const payload = cookieToken ? verifyAuthToken(cookieToken) : null;
      const adminId = payload?.sub ?? "token-fallback-admin";

      try {
        await mergePatients({
          primaryPatientId: body.data.primaryPatientId,
          duplicatePatientId: body.data.duplicatePatientId,
          adminId,
          reason: body.data.reason,
        });
        return okResponse({ merged: true }, "Patients merged successfully");
      } catch (error) {
        return replyWithError(reply, app.log, error, "Could not merge patients");
      }
    },
  );
};

export default adminPatientMergeRoute;
