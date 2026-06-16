import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { formatDateDdMmYyyy } from "../modules/generated-documents/document-template-utils.js";

const certificateVerifyRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { id: string } }>(
    "/api/public/certificates/:id",
    { config: { rateLimit: { max: 60, timeWindow: "10 minutes" } } },
    async (request, reply) => {
      const { id } = request.params;
      if (!id?.trim()) {
        return reply.status(400).send(errorResponse("Certificate ID is required"));
      }
      try {
        const doc = await prisma.generatedDocument.findUnique({
          where: { certificateId: id.trim() },
          select: {
            certificateId: true,
            documentType: true,
            createdAt: true,
            metadata: true,
            appointment: {
              select: {
                fullName: true,
                scheduledAt: true,
              },
            },
            doctor: {
              select: { fullName: true },
            },
          },
        });

        const VERIFIED_TYPES = new Set(["CUSTOM_CERTIFICATE", "ABSENCE_CERTIFICATE"]);
        if (!doc || !VERIFIED_TYPES.has(doc.documentType)) {
          return reply.status(404).send(errorResponse("Certificate not found"));
        }

        const meta = (doc.metadata ?? {}) as Record<string, string>;
        const certName =
          doc.documentType === "ABSENCE_CERTIFICATE"
            ? "Medical Absence Certificate"
            : meta.certificateName?.trim() || "Medical Certificate";
        const doctorName = doc.doctor?.fullName ?? "Doctor";
        const patientName = doc.appointment?.fullName ?? "Patient";
        const consultationDate = doc.appointment?.scheduledAt
          ? formatDateDdMmYyyy(doc.appointment.scheduledAt)
          : null;
        const issuedAt = formatDateDdMmYyyy(doc.createdAt);

        const dateInfo: Record<string, string> = {};
        if (meta.singleDate) dateInfo.date = formatDateDdMmYyyy(meta.singleDate);
        if (meta.startDate) dateInfo.from = formatDateDdMmYyyy(meta.startDate);
        if (meta.endDate) dateInfo.to = formatDateDdMmYyyy(meta.endDate);

        return okResponse({
          certificateId: doc.certificateId,
          certificateName: certName,
          doctorName,
          patientName,
          consultationDate,
          issuedAt,
          dateInfo,
        });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not verify certificate"));
      }
    },
  );
};

export default certificateVerifyRoute;
