import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { GeneratedDocumentType } from "@prisma/client";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  deleteGeneratedDocument,
  finalizeGeneratedDocument,
  generateAppointmentDocument,
  getAppointmentDocumentContext,
  getGeneratedDocumentFile,
  listGeneratedDocuments,
  sendGeneratedDocuments,
  sendGeneratedDocumentUploadLink,
} from "../modules/generated-documents/generated-documents.service.js";
import { prisma } from "../db/prisma.js";
import { guardMedicalReadForAppointment, MedicalAccessDeniedError } from "../utils/guard-medical-read.js";
import { contentDisposition } from "../utils/content-disposition.js";

const baseFields = z.record(z.string()).optional();

const generateSchema = z
  .object({
    type: z.nativeEnum(GeneratedDocumentType),
    fields: baseFields,
    editDocumentId: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === GeneratedDocumentType.OTHER && !data.fields?.customLabel?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide fields.customLabel when type=OTHER",
        path: ["fields", "customLabel"],
      });
    }
    if (data.type === GeneratedDocumentType.PRESCRIPTION && !data.fields?.medication1?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "medication1 is required for prescriptions",
        path: ["fields", "medication1"],
      });
    }
    if (data.type === GeneratedDocumentType.ABSENCE_CERTIFICATE && !data.fields?.endDate?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "endDate is required for absence certificates",
        path: ["fields", "endDate"],
      });
    }
    if (data.type === GeneratedDocumentType.EXAMS_PRESCRIPTION && !data.fields?.exams?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "exams is required for examinations prescription",
        path: ["fields", "exams"],
      });
    }
    if (data.type === GeneratedDocumentType.CUSTOM_CERTIFICATE) {
      if (!data.fields?.certificateName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "certificateName is required for custom certificates",
          path: ["fields", "certificateName"],
        });
      }
      // Date is optional — certificates may be issued without a date ("no date" mode).
    }
  });

const sendSchema = z.object({
  documentIds: z.array(z.string().min(1)).min(1),
});

function mapDocRow(r: {
  id: string;
  documentType: GeneratedDocumentType;
  fileName: string;
  sentToPatient: boolean;
  createdAt: Date;
  metadata: unknown;
  prescriptionNumber?: number | null;
  uploadTokenHash?: string | null;
  certificateId?: string | null;
}) {
  const metadata =
    r.metadata && typeof r.metadata === "object" && !Array.isArray(r.metadata)
      ? (r.metadata as Record<string, string>)
      : null;
  return {
    id: r.id,
    documentType: r.documentType,
    fileName: r.fileName,
    sentToPatient: r.sentToPatient,
    createdAt: r.createdAt.toISOString(),
    metadata,
    prescriptionNumber: r.prescriptionNumber ?? null,
    hasUploadLink: Boolean(r.uploadTokenHash),
    certificateId: r.certificateId ?? null,
  };
}

const doctorGeneratedDocumentsRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id/documents/context",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const context = await getAppointmentDocumentContext(
          request.params.id,
          auth.doctorId,
        );
        if (!context) return reply.status(404).send(errorResponse("Appointment not found"));
        return okResponse(context);
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load document context"));
      }
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id/documents/generated",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        try {
          await guardMedicalReadForAppointment(
            request,
            { userId: auth.userId, role: auth.role, doctorId: auth.doctorId },
            request.params.id,
            { resourceType: "MEDICAL_DOC", accessAction: "VIEWED" },
          );
        } catch (guardError) {
          if (guardError instanceof MedicalAccessDeniedError) {
            return reply.status(403).send(errorResponse("Access to this medical record is not permitted"));
          }
          throw guardError;
        }
        const result = await listGeneratedDocuments(request.params.id, auth.doctorId);
        if (!result) return reply.status(404).send(errorResponse("Appointment not found"));
        return okResponse({
          items: result.items.map(mapDocRow),
          queue: result.queue.map(mapDocRow),
          history: result.history.map(mapDocRow),
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
        const result = await generateAppointmentDocument({
          appointmentId: request.params.id,
          doctorId: auth.doctorId,
          documentType: body.data.type,
          fields: body.data.fields,
          editDocumentId: body.data.editDocumentId,
        });
        if (!result) return reply.status(404).send(errorResponse("Appointment not found"));
        const { row, pdfUrl, healthPortalUrl, healthPortalLabel } = result;
        return reply.status(201).send(
          okResponse(
            {
              document: {
                id: row.id,
                documentType: row.documentType,
                fileName: row.fileName,
                sentToPatient: row.sentToPatient,
                createdAt: row.createdAt.toISOString(),
                prescriptionNumber: row.prescriptionNumber ?? null,
                hasUploadLink: Boolean(row.uploadTokenHash),
                certificateId: row.certificateId ?? null,
              },
              pdfUrl,
              healthPortalUrl,
              healthPortalLabel,
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
        const result = await sendGeneratedDocuments(
          auth.doctorId,
          request.params.id,
          body.data.documentIds,
        );
        if (result === null) {
          return reply.status(404).send(errorResponse("Appointment not found"));
        }
        const { sentCount, errors, attempted } = result;
        if (sentCount === 0 && attempted > 0) {
          return reply.status(502).send(
            errorResponse(
              errors[0] ??
                "Could not send email. Configure GMAIL_SEND_FROM and Google OAuth (gmail.send scope) in backend .env.",
              { sentCount, errors },
            ),
          );
        }
        return okResponse({
          sentCount,
          ...(errors.length > 0 ? { errors } : {}),
        });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not send documents"));
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    "/api/doctor/documents/generated/:id/send-upload-link",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const result = await sendGeneratedDocumentUploadLink(auth.doctorId, request.params.id);
        if (!result.ok) {
          return reply.status(result.status).send(errorResponse(result.message));
        }
        return okResponse(
          {
            link: result.link,
            expiresAt: result.expiresAt.toISOString(),
            deliveryWarnings: result.deliveryWarnings.length
              ? result.deliveryWarnings
              : undefined,
          },
          "Upload link sent",
        );
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not send upload link"));
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    "/api/doctor/documents/generated/:id/finalize",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const result = await finalizeGeneratedDocument(auth.doctorId, request.params.id);
        if (!result.ok) {
          return reply.status(result.status).send(errorResponse(result.message));
        }
        return okResponse({ finalized: true });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not finalize document"));
      }
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/doctor/documents/generated/:id/pdf",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        // Resolve the appointment behind this document to scope the guard.
        // Missing doc → let getGeneratedDocumentFile return the 404 below.
        const doc = await prisma.generatedDocument.findUnique({
          where: { id: request.params.id },
          select: { appointmentId: true },
        });
        if (doc) {
          try {
            await guardMedicalReadForAppointment(
              request,
              { userId: auth.userId, role: auth.role, doctorId: auth.doctorId },
              doc.appointmentId,
              { resourceType: "MEDICAL_DOC", accessAction: "DOWNLOADED" },
            );
          } catch (guardError) {
            if (guardError instanceof MedicalAccessDeniedError) {
              return reply.status(403).send(errorResponse("Access to this medical record is not permitted"));
            }
            throw guardError;
          }
        }
        const result = await getGeneratedDocumentFile(auth.doctorId, request.params.id);
        if (result === "not_found") return reply.status(404).send(errorResponse("Document not found"));
        if (!result) {
          return reply
            .status(404)
            .send(errorResponse("PDF file missing — please generate the document again"));
        }
        reply.header("Content-Type", "application/pdf");
        reply.header("Content-Disposition", contentDisposition(result.fileName, "inline"));
        return reply.send(result.buffer);
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not retrieve document"));
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
