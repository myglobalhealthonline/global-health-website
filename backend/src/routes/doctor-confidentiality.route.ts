import type { FastifyPluginAsync } from "fastify";
import { requireAuth } from "../utils/require-auth.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { replyWithError } from "../utils/reply-error.js";
import {
  getConfidentialityStatus,
  acceptConfidentialityAgreement,
  listDoctorAgreementStatuses,
} from "../modules/confidentiality/confidentiality.service.js";
import { prisma } from "../db/prisma.js";

const doctorConfidentialityRoute: FastifyPluginAsync = async (app) => {
  // ─── Doctor: read own status ──────────────────────────────────────────────

  app.get(
    "/api/doctor/confidentiality-agreement",
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
        const status = await getConfidentialityStatus(doctorProfile.id);
        return okResponse(status);
      } catch (error) {
        return replyWithError(reply, app.log, error, "Could not read confidentiality status");
      }
    },
  );

  // ─── Doctor: accept agreement ─────────────────────────────────────────────

  app.post(
    "/api/doctor/confidentiality-agreement",
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
        const ipAddress = (request.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
          ?? request.ip
          ?? null;
        const userAgent = request.headers["user-agent"] ?? null;
        await acceptConfidentialityAgreement(doctorProfile.id, ipAddress, userAgent);
        return okResponse({ accepted: true }, "Confidentiality agreement accepted");
      } catch (error) {
        return replyWithError(reply, app.log, error, "Could not record agreement");
      }
    },
  );

  // ─── Admin: list all doctor agreement statuses ────────────────────────────

  app.get(
    "/api/admin/doctors/confidentiality-status",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const statuses = await listDoctorAgreementStatuses();
        return okResponse({ statuses });
      } catch (error) {
        return replyWithError(reply, app.log, error, "Could not list confidentiality statuses");
      }
    },
  );
};

export default doctorConfidentialityRoute;
