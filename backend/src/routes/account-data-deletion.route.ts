import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireAuth } from "../utils/require-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { replyWithError } from "../utils/reply-error.js";
import { prisma } from "../db/prisma.js";
import {
  createDeletionRequest,
} from "../modules/data-policy/country-data-policy.service.js";

const accountDataDeletionRoute: FastifyPluginAsync = async (app) => {
  // ─── Patient: submit GDPR deletion request ────────────────────────────────

  const createSchema = z.object({
    reason: z.string().trim().max(1000).optional(),
    requestType: z.enum(["FULL_DELETION", "ANONYMIZE_ONLY", "DATA_EXPORT_THEN_DELETE"]).default("FULL_DELETION"),
  });

  app.post(
    "/api/account/data-deletion",
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 3, timeWindow: "24 hours" } },
    },
    async (request, reply) => {
      if (!request.authUser || request.authUser.role !== "PATIENT") {
        return reply.status(403).send(errorResponse("Patient access required"));
      }

      const body = createSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid payload", body.error.flatten()));
      }

      const profile = await prisma.patientProfile.findUnique({
        where: { email: request.authUser.email },
        select: { id: true },
      });
      if (!profile) return reply.status(404).send(errorResponse("Profile not found"));

      const ghnRow = await prisma.patientProfile.findUnique({
        where: { id: profile.id },
        select: { globalHealthNumber: true },
      });

      try {
        const result = await createDeletionRequest({
          patientProfileId: profile.id,
          globalHealthNumber: ghnRow?.globalHealthNumber ?? null,
          reason: body.data.reason ?? null,
          requestType: body.data.requestType,
        });
        return reply.status(201).send(
          okResponse(result, "Deletion request submitted. Our team will process it within 30 days."),
        );
      } catch (error) {
        return replyWithError(reply, app.log, error, "Could not submit deletion request");
      }
    },
  );

  // ─── Patient: list own deletion requests ─────────────────────────────────

  app.get(
    "/api/account/data-deletion",
    { preHandler: requireAuth },
    async (request, reply) => {
      if (!request.authUser || request.authUser.role !== "PATIENT") {
        return reply.status(403).send(errorResponse("Patient access required"));
      }

      const profile = await prisma.patientProfile.findUnique({
        where: { email: request.authUser.email },
        select: { id: true },
      });
      if (!profile) return reply.status(404).send(errorResponse("Profile not found"));

      try {
        const requests = await prisma.dataDeletionRequest.findMany({
          where: { patientProfileId: profile.id },
          orderBy: { createdAt: "desc" },
          take: 20,
        });
        return okResponse({ requests });
      } catch (error) {
        return replyWithError(reply, app.log, error, "Could not load deletion requests");
      }
    },
  );
};

export default accountDataDeletionRoute;
