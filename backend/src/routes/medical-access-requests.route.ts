import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireAuth } from "../utils/require-auth.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { replyWithError } from "../utils/reply-error.js";
import {
  createAccessRequest,
  respondToAccessRequest,
  listPendingRequestsForPatient,
  listRequestsByDoctor,
  listAllRequests,
} from "../modules/medical-access-requests/medical-access-request.service.js";
import { prisma } from "../db/prisma.js";

const medicalAccessRequestsRoute: FastifyPluginAsync = async (app) => {
  // ─── Doctor: submit a cross-country access request ────────────────────────

  const createSchema = z.object({
    patientProfileId: z.string().min(1),
    reason: z.string().trim().min(10).max(1000),
  });

  app.post(
    "/api/medical-access-requests",
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 20, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
      if (!request.authUser || request.authUser.role !== "DOCTOR") {
        return reply.status(403).send(errorResponse("Doctor access required"));
      }

      const body = createSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid payload", body.error.flatten()));
      }

      const doctorProfile = await (prisma as any).doctorProfile.findUnique({
        where: { userId: request.authUser.sub },
        select: { id: true, countryCode: true },
      });
      if (!doctorProfile) {
        return reply.status(404).send(errorResponse("Doctor profile not found"));
      }

      try {
        const result = await createAccessRequest({
          requestingDoctorId: doctorProfile.id,
          requestingUserId: request.authUser.sub,
          requestingDoctorCountry: doctorProfile.countryCode ?? "UNKNOWN",
          requestedAccessScope: "GLOBAL_NETWORK",
          patientProfileId: body.data.patientProfileId,
          reason: body.data.reason,
        });
        return reply.status(201).send(okResponse(result, "Access request submitted"));
      } catch (error) {
        return replyWithError(reply, app.log, error, "Could not submit access request");
      }
    },
  );

  // ─── Patient: list pending requests for own profile ───────────────────────

  app.get(
    "/api/medical-access-requests",
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
        const requests = await listPendingRequestsForPatient(profile.id);
        return okResponse({ requests });
      } catch (error) {
        return replyWithError(reply, app.log, error, "Could not load access requests");
      }
    },
  );

  // ─── Doctor: list own access requests ─────────────────────────────────────

  app.get(
    "/api/doctor/medical-access-requests",
    { preHandler: requireAuth },
    async (request, reply) => {
      if (!request.authUser || request.authUser.role !== "DOCTOR") {
        return reply.status(403).send(errorResponse("Doctor access required"));
      }

      const doctorProfile = await (prisma as any).doctorProfile.findUnique({
        where: { userId: request.authUser.sub },
        select: { id: true },
      });
      if (!doctorProfile) {
        return reply.status(404).send(errorResponse("Doctor profile not found"));
      }

      try {
        const requests = await listRequestsByDoctor(doctorProfile.id);
        return okResponse({ requests });
      } catch (error) {
        return replyWithError(reply, app.log, error, "Could not load access requests");
      }
    },
  );

  // ─── Patient: approve or deny a request ──────────────────────────────────

  const respondSchema = z.object({
    approved: z.boolean(),
  });

  app.post<{ Params: { id: string } }>(
    "/api/medical-access-requests/:id/respond",
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 30, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
      if (!request.authUser || request.authUser.role !== "PATIENT") {
        return reply.status(403).send(errorResponse("Patient access required"));
      }

      const body = respondSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid payload", body.error.flatten()));
      }

      const ipAddress = (request.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
        ?? request.ip
        ?? undefined;

      try {
        await respondToAccessRequest({
          requestId: request.params.id,
          approved: body.data.approved,
          patientResponseIp: ipAddress,
        });
        return okResponse(
          { responded: true },
          body.data.approved ? "Access granted" : "Access denied",
        );
      } catch (error) {
        return replyWithError(reply, app.log, error, "Could not respond to access request");
      }
    },
  );

  // ─── Admin: list all requests ─────────────────────────────────────────────

  app.get(
    "/api/admin/medical-access-requests",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const querySchema = z.object({
        status: z.enum(["PENDING", "APPROVED", "DENIED", "EXPIRED", "REVOKED"]).optional(),
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(25),
      });

      const q = querySchema.safeParse(request.query);
      if (!q.success) {
        return reply.status(400).send(errorResponse("Invalid query params", q.error.flatten()));
      }

      try {
        const result = await listAllRequests({
          status: q.data.status,
          limit: q.data.limit,
          offset: (q.data.page - 1) * q.data.limit,
        });
        return okResponse(result);
      } catch (error) {
        return replyWithError(reply, app.log, error, "Could not list access requests");
      }
    },
  );
};

export default medicalAccessRequestsRoute;
