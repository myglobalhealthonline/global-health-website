import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { GeneratedDocumentType } from "@prisma/client";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  deleteGeneratedDocument,
  generateAppointmentDocument,
  listGeneratedDocuments,
  sendGeneratedDocuments,
} from "../modules/generated-documents/generated-documents.service.js";

const generateSchema = z
  .object({
    type: z.nativeEnum(GeneratedDocumentType),
    fields: z.record(z.string()).optional(),
  })
  .refine(
    (data) =>
      data.type !== GeneratedDocumentType.OTHER ||
      Boolean(data.fields?.customLabel?.trim()),
    {
      message: "Provide fields.customLabel when type=OTHER",
      path: ["fields", "customLabel"],
    },
  );

const sendSchema = z.object({
  documentIds: z.array(z.string().min(1)).min(1),
});

const doctorGeneratedDocumentsRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id/documents/generated",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const rows = await listGeneratedDocuments(request.params.id, auth.doctorId);
        if (!rows) return reply.status(404).send(errorResponse("Appointment not found"));
        return okResponse({
          items: rows.map((r) => ({
            id: r.id,
            documentType: r.documentType,
            fileName: r.fileName,
            sentToPatient: r.sentToPatient,
            createdAt: r.createdAt.toISOString(),
          })),
        });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load generated documents"));
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id/documents/generate",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      const body = generateSchema.safeParse(request.body ?? {});
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid payload", body.error.flatten()));
      }
      try {
        const row = await generateAppointmentDocument({
          appointmentId: request.params.id,
          doctorId: auth.doctorId,
          documentType: body.data.type,
          fields: body.data.fields,
        });
        if (!row) return reply.status(404).send(errorResponse("Appointment not found"));
        return reply.status(201).send(
          okResponse(
            {
              document: {
                id: row.id,
                documentType: row.documentType,
                fileName: row.fileName,
                sentToPatient: row.sentToPatient,
                createdAt: row.createdAt.toISOString(),
              },
            },
            "Document generated",
          ),
        );
      } catch (error) {
        if (error instanceof Error && error.message.includes("not configured")) {
          return reply.status(503).send(errorResponse(error.message));
        }
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not generate document"));
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id/documents/send",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      const body = sendSchema.safeParse(request.body ?? {});
      if (!body.success) {
        return reply.status(400).send(errorResponse("Invalid payload", body.error.flatten()));
      }
      try {
        const count = await sendGeneratedDocuments(
          auth.doctorId,
          request.params.id,
          body.data.documentIds,
        );
        if (count === null) {
          return reply.status(404).send(errorResponse("Appointment not found"));
        }
        return okResponse({ sentCount: count });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not send documents"));
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/api/doctor/documents/generated/:id",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const result = await deleteGeneratedDocument(auth.doctorId, request.params.id);
        if (!result.ok) {
          return reply
            .status(result.message?.includes("sent") ? 409 : 404)
            .send(errorResponse(result.message ?? "Not found"));
        }
        return okResponse({ deleted: true });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not delete document"));
      }
    },
  );
};

export default doctorGeneratedDocumentsRoute;
