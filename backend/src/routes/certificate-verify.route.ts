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
        // nosemgrep: gh-phi-route-missing-guard -- deliberately public, token-scoped by an opaque certificateId; narrow select below (no clinical body content). Public certificate verification is the endpoint's whole purpose.
        const doc = await prisma.generatedDocument.findUnique({
          where: { certificateId: id.trim() },
          select: {
            certificateId: true,
            documentType: true,
            createdAt: true,
            metadata: true,
            idVerifiedAt: true,
            idVerifyEvent: { select: { referenceId: true } },
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

        const VERIFIED_TYPES = new Set([
          "CUSTOM_CERTIFICATE",
          "ABSENCE_CERTIFICATE",
          "PRESCRIPTION",
          "EXAMS_PRESCRIPTION",
        ]);
        if (!doc || !VERIFIED_TYPES.has(doc.documentType)) {
          return reply.status(404).send(errorResponse("Certificate not found"));
        }

        const meta = (doc.metadata ?? {}) as Record<string, string>;
        const TYPE_LABELS: Record<string, string> = {
          ABSENCE_CERTIFICATE: "Medical Absence Certificate",
          CUSTOM_CERTIFICATE: meta.certificateName?.trim() || "Medical Certificate",
          PRESCRIPTION: "Medical Prescription",
          EXAMS_PRESCRIPTION: "Examinations Prescription",
        };
        const certName = TYPE_LABELS[doc.documentType] ?? "Medical Document";
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

        // Ireland controlled medications. Reflects what the paper says, from
        // the pin taken at issuance — so a scan years later reports the check
        // that actually backed this prescription, not the patient's status
        // today. Omitted entirely when the document made no identity claim:
        // this endpoint is public, and "not verified" about a named patient is
        // not something an unauthenticated scanner should be told.
        const identityVerified =
          doc.idVerifiedAt && doc.idVerifyEvent
            ? {
                verified: true,
                label: "Patient Identity Verified",
                verifiedAt: formatDateDdMmYyyy(doc.idVerifiedAt),
                referenceId: doc.idVerifyEvent.referenceId,
              }
            : null;

        return okResponse({
          certificateId: doc.certificateId,
          certificateName: certName,
          doctorName,
          patientName,
          consultationDate,
          issuedAt,
          dateInfo,
          ...(identityVerified ? { identityVerified } : {}),
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
