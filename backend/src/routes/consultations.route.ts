import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

/**
 * Clinical consultation endpoints, doctor-only.
 *
 * The row is created lazily — the first PATCH from the portal upserts
 * the Consultation. Once `signed`, further PATCHes 409 to keep notes
 * immutable. Admin can read but not edit (a future audit-log row should
 * capture the read; out of scope today).
 *
 *   GET    /api/doctor/appointments/:id/consultation
 *   PATCH  /api/doctor/appointments/:id/consultation
 *   POST   /api/doctor/appointments/:id/consultation/sign
 *
 * Every handler scopes by `doctorId = self`. The appointment must
 * already be assigned to the calling doctor (admin sets `doctorId` on
 * the scheduling form) — otherwise 404.
 */

const patchBodySchema = z
  .object({
    chiefComplaint: z.string().trim().max(500).nullable().optional(),
    subjective: z.string().trim().max(20000).nullable().optional(),
    objective: z.string().trim().max(20000).nullable().optional(),
    assessment: z.string().trim().max(20000).nullable().optional(),
    plan: z.string().trim().max(20000).nullable().optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, {
    message: "Provide at least one field to update",
  });

async function findOwnedAppointment(doctorId: string, appointmentId: string) {
  return prisma.appointment.findFirst({
    where: { id: appointmentId, doctorId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      consultationType: true,
      countryCode: true,
      status: true,
      scheduledAt: true,
      meetingUrl: true,
      notes: true,
      dateOfBirth: true,
      createdAt: true,
    },
  });
}

const consultationsRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id/consultation",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const appt = await findOwnedAppointment(auth.doctorId, request.params.id);
        if (!appt) {
          return reply.status(404).send(errorResponse("Appointment not found"));
        }
        const consultation = await prisma.consultation.findUnique({
          where: { appointmentId: appt.id },
        });
        return okResponse({
          appointment: {
            ...appt,
            scheduledAt: appt.scheduledAt?.toISOString() ?? null,
            dateOfBirth: appt.dateOfBirth?.toISOString() ?? null,
            createdAt: appt.createdAt.toISOString(),
          },
          consultation: consultation
            ? {
                ...consultation,
                signedAt: consultation.signedAt?.toISOString() ?? null,
                createdAt: consultation.createdAt.toISOString(),
                updatedAt: consultation.updatedAt.toISOString(),
              }
            : null,
        });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load consultation"));
      }
    },
  );

  app.patch<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id/consultation",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      const body = patchBodySchema.safeParse(request.body);
      if (!body.success) {
        return reply
          .status(400)
          .send(errorResponse("Invalid consultation update", body.error.flatten()));
      }
      try {
        const appt = await findOwnedAppointment(auth.doctorId, request.params.id);
        if (!appt) {
          return reply.status(404).send(errorResponse("Appointment not found"));
        }

        const existing = await prisma.consultation.findUnique({
          where: { appointmentId: appt.id },
          select: { id: true, status: true },
        });
        if (existing && existing.status === "SIGNED") {
          return reply
            .status(409)
            .send(errorResponse("Consultation is signed and cannot be edited"));
        }

        const data = {
          ...(body.data.chiefComplaint !== undefined && {
            chiefComplaint: body.data.chiefComplaint,
          }),
          ...(body.data.subjective !== undefined && {
            subjective: body.data.subjective,
          }),
          ...(body.data.objective !== undefined && {
            objective: body.data.objective,
          }),
          ...(body.data.assessment !== undefined && {
            assessment: body.data.assessment,
          }),
          ...(body.data.plan !== undefined && { plan: body.data.plan }),
        };

        const consultation = await prisma.consultation.upsert({
          where: { appointmentId: appt.id },
          create: {
            appointmentId: appt.id,
            doctorId: auth.doctorId,
            ...data,
          },
          update: data,
        });

        return okResponse(
          {
            consultation: {
              ...consultation,
              signedAt: consultation.signedAt?.toISOString() ?? null,
              createdAt: consultation.createdAt.toISOString(),
              updatedAt: consultation.updatedAt.toISOString(),
            },
          },
          "Consultation saved",
        );
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not save consultation"));
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id/consultation/sign",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const appt = await findOwnedAppointment(auth.doctorId, request.params.id);
        if (!appt) {
          return reply.status(404).send(errorResponse("Appointment not found"));
        }
        const existing = await prisma.consultation.findUnique({
          where: { appointmentId: appt.id },
        });
        if (!existing) {
          return reply
            .status(400)
            .send(errorResponse("Add notes before signing"));
        }
        if (existing.status === "SIGNED") {
          return okResponse(
            {
              consultation: {
                ...existing,
                signedAt: existing.signedAt?.toISOString() ?? null,
                createdAt: existing.createdAt.toISOString(),
                updatedAt: existing.updatedAt.toISOString(),
              },
            },
            "Already signed",
          );
        }
        const consultation = await prisma.consultation.update({
          where: { id: existing.id },
          data: { status: "SIGNED", signedAt: new Date() },
        });
        return okResponse(
          {
            consultation: {
              ...consultation,
              signedAt: consultation.signedAt?.toISOString() ?? null,
              createdAt: consultation.createdAt.toISOString(),
              updatedAt: consultation.updatedAt.toISOString(),
            },
          },
          "Consultation signed",
        );
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not sign consultation"));
      }
    },
  );
};

export default consultationsRoute;
