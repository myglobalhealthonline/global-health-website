import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../utils/require-auth.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

const accountAccessLogRoute: FastifyPluginAsync = async (app) => {
  // ─── Patient: own log ────────────────────────────────────────────────────

  app.get(
    "/api/account/access-log",
    { preHandler: requireAuth },
    async (request, reply) => {
      if (!request.authUser || request.authUser.role !== "PATIENT") {
        return reply.status(403).send(errorResponse("Patient access required"));
      }

      // nosemgrep: gh-phi-route-missing-guard -- patient-self endpoint: gated above by role === "PATIENT" and scoped to the caller's own authUser.email; narrow { id: true } select feeds only the MedicalAccessLog audit-trail view below, not clinical content.
      const profile = await prisma.patientProfile.findUnique({
        where: { email: request.authUser.email },
        select: { id: true },
      });
      if (!profile) return reply.status(404).send(errorResponse("Profile not found"));

      const query = z
        .object({
          page: z.coerce.number().int().min(1).default(1),
          limit: z.coerce.number().int().min(1).max(100).default(20),
        })
        .safeParse(request.query);
      const { page, limit } = query.success ? query.data : { page: 1, limit: 20 };
      const skip = (page - 1) * limit;

      try {
        const [logs, total] = await Promise.all([
          prisma.medicalAccessLog.findMany({
            where: { patientProfileId: profile.id },
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
            select: {
              id: true,
              accessedByName: true,
              accessedByRole: true,
              accessedResourceType: true,
              accessedResourceId: true,
              accessAction: true,
              accessReason: true,
              relatedAppointmentId: true,
              createdAt: true,
            },
          }),
          prisma.medicalAccessLog.count({ where: { patientProfileId: profile.id } }),
        ]);

        return okResponse({
          logs: logs.map((l) => ({
            ...l,
            createdAt: l.createdAt.toISOString(),
          })),
          pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        });
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load access log"));
      }
    },
  );

  // ─── Admin: full log for any patient ─────────────────────────────────────

  app.get<{ Params: { email: string } }>(
    "/api/admin/patients/:email/access-log",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      let email: string;
      try {
        email = decodeURIComponent(request.params.email).trim().toLowerCase();
      } catch {
        return reply.status(400).send(errorResponse("Invalid email param"));
      }

      // nosemgrep: gh-phi-route-missing-guard -- admin-authenticated (verifyAdminAccess above); narrow { id: true } select feeds only the MedicalAccessLog audit-trail view, not clinical content. Viewing WHO accessed a record is not itself a PHI content read.
      const profile = await prisma.patientProfile.findUnique({
        where: { email },
        select: { id: true },
      });
      if (!profile) return reply.status(404).send(errorResponse("Patient not found"));

      const query = z
        .object({
          page: z.coerce.number().int().min(1).default(1),
          limit: z.coerce.number().int().min(1).max(100).default(50),
        })
        .safeParse(request.query);
      const { page, limit } = query.success ? query.data : { page: 1, limit: 50 };
      const skip = (page - 1) * limit;

      try {
        const [logs, total] = await Promise.all([
          prisma.medicalAccessLog.findMany({
            where: { patientProfileId: profile.id },
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
          }),
          prisma.medicalAccessLog.count({ where: { patientProfileId: profile.id } }),
        ]);

        return okResponse({
          logs: logs.map((l) => ({
            ...l,
            createdAt: l.createdAt.toISOString(),
          })),
          pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        });
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load access log"));
      }
    },
  );
};

export default accountAccessLogRoute;
