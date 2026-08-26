import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireAuth } from "../utils/require-auth.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { replyWithError } from "../utils/reply-error.js";
import {
  createAccessRequest,
  MedicalAccessRequestNotFoundError,
  respondToAccessRequest,
  respondToAccessRequestByToken,
  verifyAccessRequestToken,
  listPendingRequestsForPatient,
  listRequestsByDoctor,
  listAllRequests,
} from "../modules/medical-access-requests/medical-access-request.service.js";
import { prisma } from "../db/prisma.js";
import { resolvePatientProfileIdForAppointment } from "../utils/guard-medical-read.js";

const medicalAccessRequestsRoute: FastifyPluginAsync = async (app) => {
  // ─── Doctor: submit a cross-country access request ────────────────────────

  // The doctor portal's "request access" flow is appointment-scoped — a
  // denied doctor knows the appointment they were looking at, not the
  // PatientProfile.id behind it. Accept either identifier: `appointmentId`
  // is resolved server-side via the same helper `guardMedicalReadForAppointment`
  // uses (never trust a client-supplied patientProfileId derived from an
  // appointment the doctor doesn't actually own/see). Direct
  // `patientProfileId` stays for the admin-console / future non-appointment
  // callers of this same endpoint.
  const createSchema = z
    .object({
      patientProfileId: z.string().min(1).optional(),
      appointmentId: z.string().min(1).optional(),
      reason: z.string().trim().min(10).max(1000),
    })
    .refine((d) => Boolean(d.patientProfileId) !== Boolean(d.appointmentId), {
      message: "Provide exactly one of patientProfileId or appointmentId",
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

      const user = await prisma.user.findUnique({
        where: { id: request.authUser.sub },
        select: {
          doctorProfile: {
            select: { id: true, country: { select: { code: true } } },
          },
        },
      });
      const doctorProfile = user?.doctorProfile;
      if (!doctorProfile) {
        return reply.status(404).send(errorResponse("Doctor profile not found"));
      }

      let patientProfileId = body.data.patientProfileId ?? null;
      if (!patientProfileId && body.data.appointmentId) {
        patientProfileId = await resolvePatientProfileIdForAppointment(body.data.appointmentId);
      }
      if (!patientProfileId) {
        return reply.status(404).send(errorResponse("Patient record not found"));
      }

      try {
        const result = await createAccessRequest({
          requestingDoctorId: doctorProfile.id,
          requestingUserId: request.authUser.sub,
          requestingDoctorCountry: doctorProfile.country?.code ?? "UNKNOWN",
          requestedAccessScope: "GLOBAL_NETWORK",
          patientProfileId,
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

      // nosemgrep: gh-phi-route-missing-guard -- patient-self endpoint: gated above by role === "PATIENT" and scoped to the caller's own authUser.email; this file manages the guard's own request/grant inputs, not clinical content.
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

      const user = await prisma.user.findUnique({
        where: { id: request.authUser.sub },
        select: { doctorProfile: { select: { id: true } } },
      });
      const doctorProfile = user?.doctorProfile;
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
        // Bind the response to the authenticated account relation, not to an
        // email string supplied by (or merely present on) the session.
        // nosemgrep: gh-phi-route-missing-guard -- patient-self authorization input; the service additionally enforces this profile id against the request row.
        const profile = await prisma.patientProfile.findUnique({
          where: { userId: request.authUser.sub },
          select: { id: true },
        });
        if (!profile) return reply.status(404).send(errorResponse("Access request not found"));

        await respondToAccessRequest({
          requestId: request.params.id,
          patientProfileId: profile.id,
          approved: body.data.approved,
          patientResponseIp: ipAddress,
        });
        return okResponse(
          { responded: true },
          body.data.approved ? "Access granted" : "Access denied",
        );
      } catch (error) {
        if (error instanceof MedicalAccessRequestNotFoundError) {
          return reply.status(404).send(errorResponse("Access request not found"));
        }
        return replyWithError(reply, app.log, error, "Could not respond to access request");
      }
    },
  );

  // ─── Public: patient approve/deny via emailed token link (no login) ──────

  app.get(
    "/api/public/medical-access-request",
    { config: { rateLimit: { max: 30, timeWindow: "10 minutes" } } },
    async (request, reply) => {
      const token = (request.query as { token?: string }).token?.trim();
      if (!token) return reply.status(400).send(errorResponse("token is required"));

      const verified = await verifyAccessRequestToken(token);
      if (!verified.ok) return reply.status(400).send(errorResponse(verified.message));

      return okResponse({
        doctorName: verified.doctorName,
        doctorCountry: verified.doctorCountry,
        requestedAccessScope: verified.requestedAccessScope,
        reason: verified.reason,
        createdAt: verified.createdAt,
      });
    },
  );

  const publicRespondSchema = z.object({
    token: z.string().min(1),
    decision: z.enum(["APPROVE", "DENY"]),
  });

  app.post(
    "/api/public/medical-access-request",
    { config: { rateLimit: { max: 20, timeWindow: "10 minutes" } } },
    async (request, reply) => {
      const body = publicRespondSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid payload", body.error.flatten()));
      }

      const ipAddress = (request.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
        ?? request.ip
        ?? undefined;

      const result = await respondToAccessRequestByToken({
        token: body.data.token,
        approved: body.data.decision === "APPROVE",
        patientResponseIp: ipAddress,
      });
      if (!result.ok) return reply.status(400).send(errorResponse(result.message));

      return okResponse(
        { responded: true },
        body.data.decision === "APPROVE" ? "Access granted" : "Access denied",
      );
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
