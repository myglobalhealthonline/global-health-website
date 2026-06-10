import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../utils/require-auth.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { getObject, isMediaStorageConfigured, putObject, streamToNodeReadable } from "../services/object-storage.js";
import { logAccess } from "../lib/access-log.js";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import {
  createMedicalDocument,
  getPatientAccessibleDocument,
  listMedicalDocumentsAdmin,
  listPatientMedicalDocuments,
  MEDICAL_DOC_ALLOWED_MIME,
  MEDICAL_DOC_MAX_BYTES,
  VALID_DOCUMENT_TYPES,
} from "../services/medical-document.service.js";

async function resolvePatientProfile(email: string) {
  return prisma.patientProfile.findUnique({
    where: { email },
    select: { id: true, globalHealthNumber: true },
  });
}

function serializeDoc(
  doc: Partial<{
    id: string;
    documentType: string;
    title: string;
    description: string | null;
    fileName: string;
    mimetype: string;
    byteSize: number;
    uploadedByRole: string;
    visibleToPatient: boolean;
    relatedAppointmentId: string | null;
    relatedConsultationId: string | null;
    createdAt: Date | string;
    fileKey?: string;
    globalHealthNumber?: string | null;
    patientProfileId?: string;
    uploadedByUserId?: string | null;
    updatedAt?: Date | string;
  }>,
) {
  return {
    id: doc.id,
    documentType: doc.documentType,
    title: doc.title,
    description: doc.description ?? null,
    fileName: doc.fileName,
    mimetype: doc.mimetype,
    byteSize: doc.byteSize,
    uploadedByRole: doc.uploadedByRole,
    visibleToPatient: doc.visibleToPatient,
    relatedAppointmentId: doc.relatedAppointmentId ?? null,
    relatedConsultationId: doc.relatedConsultationId ?? null,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
  };
}

const medicalDocumentsRoute: FastifyPluginAsync = async (app) => {
  // ─── Patient self-service ─────────────────────────────────────────────────

  app.get(
    "/api/account/medical-documents",
    { preHandler: requireAuth },
    async (request, reply) => {
      if (!request.authUser || request.authUser.role !== "PATIENT") {
        return reply.status(403).send(errorResponse("Patient access required"));
      }
      const profile = await resolvePatientProfile(request.authUser.email);
      if (!profile) return reply.status(404).send(errorResponse("Profile not found"));

      const query = z
        .object({ type: z.string().optional() })
        .safeParse(request.query);
      const documentTypes =
        query.success && query.data.type ? [query.data.type.toUpperCase()] : undefined;

      try {
        const docs = await listPatientMedicalDocuments(profile.id, documentTypes);
        await logAccess({
          patientProfileId: profile.id,
          globalHealthNumber: profile.globalHealthNumber,
          accessedByUserId: request.authUser.sub,
          accessedByRole: "PATIENT",
          accessedResourceType: "MedicalDocuments",
          accessAction: "VIEW",
        });
        return okResponse({ documents: docs.map(serializeDoc) });
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load documents"));
      }
    },
  );

  app.post(
    "/api/account/medical-documents",
    { preHandler: requireAuth },
    async (request, reply) => {
      if (!request.authUser || request.authUser.role !== "PATIENT") {
        return reply.status(403).send(errorResponse("Patient access required"));
      }
      if (!isMediaStorageConfigured()) {
        return reply.status(503).send(errorResponse("Upload storage not configured"));
      }

      const profile = await resolvePatientProfile(request.authUser.email);
      if (!profile) return reply.status(404).send(errorResponse("Profile not found"));

      let fileBuffer: Buffer | null = null;
      let mimetype = "application/octet-stream";
      let originalFileName = "upload";
      let title = "";
      let description: string | null = null;
      let documentType = "REPORT";

      for await (const part of request.parts()) {
        if (part.type === "field") {
          if (part.fieldname === "title") title = String(part.value);
          if (part.fieldname === "description") description = String(part.value) || null;
          if (part.fieldname === "documentType")
            documentType = String(part.value).toUpperCase();
        }
        if (part.type === "file" && part.fieldname === "file") {
          fileBuffer = await part.toBuffer();
          mimetype = part.mimetype;
          originalFileName = part.filename ?? "upload";
        }
      }

      if (!fileBuffer || fileBuffer.length === 0) {
        return reply.status(400).send(errorResponse("File is required"));
      }
      if (fileBuffer.length > MEDICAL_DOC_MAX_BYTES) {
        return reply.status(413).send(errorResponse("File too large (max 10 MB)"));
      }
      if (!MEDICAL_DOC_ALLOWED_MIME.has(mimetype)) {
        return reply.status(400).send(
          errorResponse("File type not allowed (PDF, JPG, PNG, WebP)"),
        );
      }
      if (!VALID_DOCUMENT_TYPES.has(documentType)) documentType = "REPORT";
      if (!title.trim()) {
        return reply.status(400).send(errorResponse("Title is required"));
      }

      const ext = mimetype === "application/pdf" ? "pdf" : mimetype.split("/")[1];
      const fileKey = `patient-docs/${profile.id}/medical/${randomUUID()}.${ext}`;

      try {
        await putObject(fileKey, fileBuffer, mimetype);
        const doc = await createMedicalDocument({
          patientProfileId: profile.id,
          globalHealthNumber: profile.globalHealthNumber ?? null,
          uploadedByUserId: request.authUser.sub,
          uploadedByRole: "PATIENT",
          documentType,
          title: title.trim(),
          description,
          fileKey,
          fileName: originalFileName,
          mimetype,
          byteSize: fileBuffer.length,
          visibleToPatient: true,
        });
        return okResponse({ document: serializeDoc(doc) }, "Document uploaded");
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send(errorResponse("Upload failed"));
      }
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/account/medical-documents/:id/download",
    { preHandler: requireAuth },
    async (request, reply) => {
      if (!request.authUser || request.authUser.role !== "PATIENT") {
        return reply.status(403).send(errorResponse("Patient access required"));
      }
      const profile = await resolvePatientProfile(request.authUser.email);
      if (!profile) return reply.status(404).send(errorResponse("Profile not found"));

      try {
        const doc = await getPatientAccessibleDocument(profile.id, request.params.id);
        if (!doc) return reply.status(404).send(errorResponse("Document not found"));

        await logAccess({
          patientProfileId: profile.id,
          globalHealthNumber: profile.globalHealthNumber,
          accessedByUserId: request.authUser.sub,
          accessedByRole: "PATIENT",
          accessedResourceType: "MedicalDocument",
          accessedResourceId: doc.id,
          accessAction: "DOWNLOAD",
        });

        const obj = await getObject(doc.fileKey);
        const stream = streamToNodeReadable(obj.Body);
        if (!stream) return reply.status(404).send(errorResponse("File not found in storage"));

        void reply.header("Content-Type", obj.ContentType ?? doc.mimetype);
        void reply.header(
          "Content-Disposition",
          `attachment; filename="${encodeURIComponent(doc.fileName)}"`,
        );
        void reply.header("Cache-Control", "private, no-store");
        return reply.send(stream);
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send(errorResponse("Download failed"));
      }
    },
  );

  // ─── Admin endpoints ──────────────────────────────────────────────────────

  app.get<{ Params: { email: string } }>(
    "/api/admin/patients/:email/medical-documents",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      let email: string;
      try {
        email = decodeURIComponent(request.params.email).trim().toLowerCase();
      } catch {
        return reply.status(400).send(errorResponse("Invalid email param"));
      }

      try {
        const profile = await prisma.patientProfile.findUnique({
          where: { email },
          select: { id: true },
        });
        if (!profile) return reply.status(404).send(errorResponse("Patient not found"));

        const docs = await listMedicalDocumentsAdmin(profile.id);
        return okResponse({ documents: docs.map(serializeDoc) });
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load documents"));
      }
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/admin/medical-documents/:id/download",
    async (request, reply) => {
      const auth = await verifyAdminAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      try {
        const doc = await prisma.medicalDocument.findUnique({
          where: { id: request.params.id },
        });
        if (!doc) return reply.status(404).send(errorResponse("Document not found"));

        const obj = await getObject(doc.fileKey);
        const stream = streamToNodeReadable(obj.Body);
        if (!stream) return reply.status(404).send(errorResponse("File not found in storage"));

        void reply.header("Content-Type", obj.ContentType ?? doc.mimetype);
        void reply.header(
          "Content-Disposition",
          `attachment; filename="${encodeURIComponent(doc.fileName)}"`,
        );
        void reply.header("Cache-Control", "private, no-store");
        return reply.send(stream);
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send(errorResponse("Download failed"));
      }
    },
  );

  // ─── Doctor endpoints ─────────────────────────────────────────────────────

  // Doctor uploads a medical document for a patient (result, exam request, etc.)
  app.post<{ Params: { patientEmail: string } }>(
    "/api/doctor/patients/:patientEmail/medical-documents",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      if (!isMediaStorageConfigured()) {
        return reply.status(503).send(errorResponse("Upload storage not configured"));
      }

      let email: string;
      try {
        email = decodeURIComponent(request.params.patientEmail).trim().toLowerCase();
      } catch {
        return reply.status(400).send(errorResponse("Invalid email param"));
      }

      const profile = await resolvePatientProfile(email);
      if (!profile) return reply.status(404).send(errorResponse("Patient not found"));

      const sharedAppt = await prisma.appointment.findFirst({
        where: { doctorId: auth.doctorId, email: { equals: email, mode: "insensitive" } },
        select: { id: true },
      });
      if (!sharedAppt) {
        return reply.status(403).send(errorResponse("No shared appointment with this patient"));
      }

      let fileBuffer: Buffer | null = null;
      let mimetype = "application/octet-stream";
      let originalFileName = "upload";
      let title = "";
      let description: string | null = null;
      let documentType = "EXAM_RESULT";
      let relatedAppointmentId: string | null = null;
      let visibleToPatient = false;

      for await (const part of request.parts()) {
        if (part.type === "field") {
          if (part.fieldname === "title") title = String(part.value);
          if (part.fieldname === "description") description = String(part.value) || null;
          if (part.fieldname === "documentType")
            documentType = String(part.value).toUpperCase();
          if (part.fieldname === "relatedAppointmentId")
            relatedAppointmentId = String(part.value) || null;
          if (part.fieldname === "visibleToPatient")
            visibleToPatient = String(part.value) === "true";
        }
        if (part.type === "file" && part.fieldname === "file") {
          fileBuffer = await part.toBuffer();
          mimetype = part.mimetype;
          originalFileName = part.filename ?? "upload";
        }
      }

      if (!fileBuffer || fileBuffer.length === 0) {
        return reply.status(400).send(errorResponse("File is required"));
      }
      if (fileBuffer.length > MEDICAL_DOC_MAX_BYTES) {
        return reply.status(413).send(errorResponse("File too large (max 10 MB)"));
      }
      if (!MEDICAL_DOC_ALLOWED_MIME.has(mimetype)) {
        return reply.status(400).send(errorResponse("File type not allowed"));
      }
      if (!VALID_DOCUMENT_TYPES.has(documentType)) documentType = "EXAM_RESULT";
      if (!title.trim()) {
        return reply.status(400).send(errorResponse("Title is required"));
      }

      const ext = mimetype === "application/pdf" ? "pdf" : mimetype.split("/")[1];
      const fileKey = `patient-docs/${profile.id}/medical/doctor-${randomUUID()}.${ext}`;

      try {
        await putObject(fileKey, fileBuffer, mimetype);
        const doc = await createMedicalDocument({
          patientProfileId: profile.id,
          globalHealthNumber: profile.globalHealthNumber ?? null,
          uploadedByUserId: auth.doctorId,
          uploadedByRole: "DOCTOR",
          documentType,
          title: title.trim(),
          description,
          fileKey,
          fileName: originalFileName,
          mimetype,
          byteSize: fileBuffer.length,
          relatedAppointmentId,
          visibleToPatient,
        });
        return okResponse({ document: serializeDoc(doc) }, "Document uploaded");
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send(errorResponse("Upload failed"));
      }
    },
  );

  // Doctor toggles visibility of a medical document
  app.patch<{ Params: { id: string } }>(
    "/api/doctor/medical-documents/:id/visibility",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      const body = z
        .object({ visibleToPatient: z.boolean() })
        .safeParse(request.body ?? {});
      if (!body.success) {
        return reply.status(400).send(errorResponse("Provide visibleToPatient: boolean"));
      }

      try {
        const doc = await prisma.medicalDocument.findUnique({
          where: { id: request.params.id },
          select: { id: true, uploadedByRole: true, uploadedByUserId: true },
        });
        if (!doc) return reply.status(404).send(errorResponse("Document not found"));
        if (doc.uploadedByRole !== "DOCTOR" || doc.uploadedByUserId !== auth.doctorId) {
          return reply.status(403).send(errorResponse("Cannot modify this document"));
        }
        const updated = await prisma.medicalDocument.update({
          where: { id: request.params.id },
          data: { visibleToPatient: body.data.visibleToPatient },
        });
        return okResponse({ document: serializeDoc(updated) });
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not update visibility"));
      }
    },
  );
};

export default medicalDocumentsRoute;
