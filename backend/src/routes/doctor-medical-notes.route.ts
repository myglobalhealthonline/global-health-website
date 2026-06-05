import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  createMedicalNote,
  listMedicalNotesForAppointment,
} from "../modules/medical-notes/medical-notes.service.js";
import { prisma } from "../db/prisma.js";

const createSchema = z.object({
  note: z.string().min(1).max(50000),
  consultationType: z.string().max(120).optional(),
});

const doctorMedicalNotesRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id/medical-notes",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const rows = await listMedicalNotesForAppointment(request.params.id, auth.doctorId);
        if (!rows) return reply.status(404).send(errorResponse("Appointment not found"));
        return okResponse({
          items: rows.map((r) => ({
            id: r.id,
            content: r.content,
            consultationType: r.consultationType,
            createdByName: r.createdByName,
            createdAt: r.createdAt.toISOString(),
          })),
        });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load medical notes"));
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id/medical-notes",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      const body = createSchema.safeParse(request.body ?? {});
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid payload", body.error.flatten()));
      }
      try {
        const doctor = await prisma.doctor.findUnique({
          where: { id: auth.doctorId },
          select: { fullName: true },
        });
        const doctorDisplayName = doctor?.fullName?.trim() || "Doctor";

        const row = await createMedicalNote({
          appointmentId: request.params.id,
          doctorId: auth.doctorId,
          doctorDisplayName,
          content: body.data.note,
          consultationType: body.data.consultationType,
        });
        if (!row) return reply.status(404).send(errorResponse("Appointment not found"));
        return reply.status(201).send(
          okResponse(
            {
              note: {
                id: row.id,
                content: row.content,
                createdAt: row.createdAt.toISOString(),
              },
            },
            "Medical note saved",
          ),
        );
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not save medical note"));
      }
    },
  );
};

export default doctorMedicalNotesRoute;
