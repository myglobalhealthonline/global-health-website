import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../utils/require-auth.js";
import { verifyAdminAccess, resolveAdminSessionActor } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { getObject, isMediaStorageConfigured, putObject, streamToNodeReadable } from "../services/object-storage.js";
import { guardMedicalRead, MedicalAccessDeniedError, medicalAccessDeniedResponse } from "../utils/guard-medical-read.js";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { verifySniffedMime } from "../utils/sniff-mime.js";
import {
  createMedicalDocument,
  getPatientAccessibleDocument,
  getPatientAccessibleGeneratedDocument,
  getPatientAccessibleAppointmentDocument,
  listMedicalDocumentsAdmin,
  listPatientUnifiedDocuments,
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

      try {
        // Unified view: MedicalDocument (minus hidden clinical types) +
        // sent GeneratedDocument PDFs + AppointmentDocument uploads, kept in
        // sync with the doctor portal Documents section.
        const docs = await listPatientUnifiedDocuments(profile.id, request.authUser.email);
        await guardMedicalRead(
          request,
          { userId: request.authUser.sub, role: "PATIENT" },
          { patientProfileId: profile.id, resourceType: "MEDICAL_DOC", accessAction: "VIEWED" },
        ).catch((e) => { if (!(e instanceof MedicalAccessDeniedError)) throw e; });
        return okResponse({ documents: docs });
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
      const sniffedMime = verifySniffedMime(fileBuffer, mimetype, MEDICAL_DOC_ALLOWED_MIME);
      if (!sniffedMime) {
        return reply.status(400).send(
          errorResponse("File content does not match an allowed type (PDF, JPG, PNG, WebP)"),
        );
      }
      mimetype = sniffedMime;
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

        await guardMedicalRead(
          request,
          { userId: request.authUser.sub, role: "PATIENT" },
          { patientProfileId: profile.id, resourceType: "MEDICAL_DOC", accessAction: "UPLOADED", resourceId: doc.id },
        ).catch((e) => { if (!(e instanceof MedicalAccessDeniedError)) throw e; });

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

      const sourceParsed = z
        .object({ source: z.enum(["MEDICAL_DOC", "GENERATED", "APPOINTMENT"]).optional() })
        .safeParse(request.query);
      const source = sourceParsed.success ? sourceParsed.data.source ?? "MEDICAL_DOC" : "MEDICAL_DOC";
      const email = request.authUser.email;

      try {
        // Resolve the storage key + filename from whichever table the row
        // lives in, always verifying it belongs to this patient first.
        let storageKey: string | null = null;
        let fileName = "document";
        let fallbackMime = "application/octet-stream";

        if (source === "GENERATED") {
          const doc = await getPatientAccessibleGeneratedDocument(email, request.params.id);
          if (doc) {
            storageKey = doc.storageKey;
            fileName = doc.fileName;
            fallbackMime = "application/pdf";
          }
        } else if (source === "APPOINTMENT") {
          const doc = await getPatientAccessibleAppointmentDocument(email, request.params.id);
          if (doc) {
            storageKey = doc.storageKey;
            fileName = doc.label || doc.storageKey.split("/").pop() || "document";
            fallbackMime = doc.mimetype;
          }
        } else {
          const doc = await getPatientAccessibleDocument(profile.id, request.params.id);
          if (doc) {
            storageKey = doc.fileKey;
            fileName = doc.fileName;
            fallbackMime = doc.mimetype;
          }
        }

        if (!storageKey) return reply.status(404).send(errorResponse("Document not found"));

        await guardMedicalRead(
          request,
          { userId: request.authUser.sub, role: "PATIENT" },
          { patientProfileId: profile.id, resourceType: "MEDICAL_DOC", accessAction: "DOWNLOADED", resourceId: request.params.id },
        ).catch((e) => { if (!(e instanceof MedicalAccessDeniedError)) throw e; });

        const obj = await getObject(storageKey);
        const stream = streamToNodeReadable(obj.Body);
        if (!stream) return reply.status(404).send(errorResponse("File not found in storage"));

        void reply.header("Content-Type", obj.ContentType ?? fallbackMime);
        void reply.header(
          "Content-Disposition",
          `attachment; filename="${encodeURIComponent(fileName)}"`,
        );
        void reply.header("Cache-Control", "private, no-store");
        // nosemgrep: javascript.express.security.audit.xss.direct-response-write.direct-response-write -- streaming an S3 object's Node Readable via Fastify's typed reply.send(), not writing an HTML string built from user input; this rule is tuned for Express res.write(userInput).
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

        const actor = resolveAdminSessionActor(request);
        try {
          await guardMedicalRead(
            request,
            { userId: actor?.userId ?? "", role: actor?.role ?? "ADMIN" },
            { patientProfileId: profile.id, resourceType: "MEDICAL_DOC", accessAction: "VIEWED" },
          );
        } catch (guardError) {
          if (guardError instanceof MedicalAccessDeniedError) {
            return reply.status(403).send(medicalAccessDeniedResponse(guardError));
          }
          throw guardError;
        }

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

      const doc = await prisma.medicalDocument.findUnique({
        where: { id: request.params.id },
      });
      if (!doc) return reply.status(404).send(errorResponse("Document not found"));

      const actor = resolveAdminSessionActor(request);
      try {
        await guardMedicalRead(
          request,
          { userId: actor?.userId ?? "", role: actor?.role ?? "ADMIN" },
          { patientProfileId: doc.patientProfileId, resourceType: "MEDICAL_DOC", accessAction: "DOWNLOADED", resourceId: doc.id },
        );
      } catch (guardError) {
        if (guardError instanceof MedicalAccessDeniedError) {
          return reply.status(403).send(medicalAccessDeniedResponse(guardError));
        }
        throw guardError;
      }

      try {
        const obj = await getObject(doc.fileKey);
        const stream = streamToNodeReadable(obj.Body);
        if (!stream) return reply.status(404).send(errorResponse("File not found in storage"));

        void reply.header("Content-Type", obj.ContentType ?? doc.mimetype);
        void reply.header(
          "Content-Disposition",
          `attachment; filename="${encodeURIComponent(doc.fileName)}"`,
        );
        void reply.header("Cache-Control", "private, no-store");
        // nosemgrep: javascript.express.security.audit.xss.direct-response-write.direct-response-write -- streaming an S3 object's Node Readable via Fastify's typed reply.send(), not writing an HTML string built from user input; this rule is tuned for Express res.write(userInput).
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

      // Central guard: authorize before writing into the patient's record;
      // logs the upload (MedicalAccessLog) as a side effect. Enforce mode
      // blocks the write with 403; shadow mode only logs.
      try {
        await guardMedicalRead(
          request,
          { userId: auth.userId, role: auth.role, doctorId: auth.doctorId },
          {
            patientProfileId: profile.id,
            resourceType: "MEDICAL_DOC",
            accessAction: "UPLOADED",
            relatedAppointmentId: sharedAppt.id,
          },
        );
      } catch (guardError) {
        if (guardError instanceof MedicalAccessDeniedError) {
          return reply.status(403).send(medicalAccessDeniedResponse(guardError));
        }
        throw guardError;
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
      const sniffedMime = verifySniffedMime(fileBuffer, mimetype, MEDICAL_DOC_ALLOWED_MIME);
      if (!sniffedMime) {
        return reply.status(400).send(errorResponse("File content does not match an allowed type"));
      }
      mimetype = sniffedMime;
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
