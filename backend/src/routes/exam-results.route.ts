import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { recordAudit } from "../modules/audit/audit.service.js";
import { notifyAdmins } from "../modules/notifications/notify.service.js";

/**
 * Exam-result endpoints, doctor-only (MVP).
 *
 *   GET    /api/doctor/appointments/:id/exams
 *   POST   /api/doctor/appointments/:id/exams
 *   DELETE /api/doctor/exams/:examId
 *
 * MVP scope: text + optional `externalUrl` linking out to a partner-lab
 * portal. First-party file upload (PDF result through the Asset model)
 * is on the roadmap but not in this slice.
 */

const createBodySchema = z
  .object({
    testName: z.string().trim().min(1).max(200),
    performedAt: z.string().datetime().nullable().optional(),
    notes: z.string().trim().max(8000).nullable().optional(),
    externalUrl: z
      .string()
      .trim()
      .url("External link must be a valid URL")
      .max(2000)
      .nullable()
      .optional(),
  })
  .strict();

const examResultsRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id/exams",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const appt = await prisma.appointment.findFirst({
          where: { id: request.params.id, doctorId: auth.doctorId },
          select: { id: true },
        });
        if (!appt) {
          return reply.status(404).send(errorResponse("Appointment not found"));
        }
        const items = await prisma.examResult.findMany({
          where: { appointmentId: appt.id },
          orderBy: { createdAt: "desc" },
        });
        return okResponse({
          items: items.map((r) => ({
            ...r,
            performedAt: r.performedAt?.toISOString() ?? null,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(),
          })),
        });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load exam results"));
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id/exams",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      const body = createBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid exam result", body.error.flatten()));
      }
      try {
        const appt = await prisma.appointment.findFirst({
          where: { id: request.params.id, doctorId: auth.doctorId },
          select: { id: true },
        });
        if (!appt) {
          return reply.status(404).send(errorResponse("Appointment not found"));
        }
        const row = await prisma.examResult.create({
          data: {
            appointmentId: appt.id,
            doctorId: auth.doctorId,
            testName: body.data.testName,
            performedAt: body.data.performedAt
              ? new Date(body.data.performedAt)
              : null,
            notes: body.data.notes ?? null,
            externalUrl: body.data.externalUrl ?? null,
          },
        });
        recordAudit({
          actorUserId: auth.userId,
          actorRole: "DOCTOR",
          action: "EXAM_LOGGED",
          entityType: "ExamResult",
          entityId: row.id,
          metadata: { appointmentId: appt.id, testName: row.testName },
          request,
        }).catch(() => {});
        notifyAdmins("EXAM_LOGGED", {
          appointmentId: appt.id,
          snippet: row.testName,
        }).catch(() => {});
        return reply.status(201).send(
          okResponse({
            exam: {
              ...row,
              performedAt: row.performedAt?.toISOString() ?? null,
              createdAt: row.createdAt.toISOString(),
              updatedAt: row.updatedAt.toISOString(),
            },
          }),
        );
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not save exam result"));
      }
    },
  );

  app.delete<{ Params: { examId: string } }>(
    "/api/doctor/exams/:examId",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const existing = await prisma.examResult.findUnique({
          where: { id: request.params.examId },
          select: { id: true, doctorId: true },
        });
        if (!existing || existing.doctorId !== auth.doctorId) {
          return reply.status(404).send(errorResponse("Exam result not found"));
        }
        await prisma.examResult.delete({ where: { id: existing.id } });
        recordAudit({
          actorUserId: auth.userId,
          actorRole: "DOCTOR",
          action: "EXAM_DELETED",
          entityType: "ExamResult",
          entityId: existing.id,
          request,
        }).catch(() => {});
        return okResponse({ deleted: true });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not delete exam result"));
      }
    },
  );
};

export default examResultsRoute;
