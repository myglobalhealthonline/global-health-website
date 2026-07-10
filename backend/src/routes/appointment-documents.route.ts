import { randomUUID } from "node:crypto";
import { NoSuchKey } from "@aws-sdk/client-s3";
import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import {
  putObject,
  getObject,
  streamToNodeReadable,
  deleteObject,
  isMediaStorageConfigured,
  MediaObjectNotFoundError,
} from "../services/object-storage.js";
import { sanitizeOriginalFilename } from "../utils/media-key.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import {
  verifyClinicalReadAccess,
  verifyDoctorAccess,
} from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { recordCriticalAudit } from "../modules/audit/audit.service.js";
import { notifyAdmins } from "../modules/notifications/notify.service.js";
import { verifySniffedMime } from "../utils/sniff-mime.js";
import { guardMedicalReadForAppointment, MedicalAccessDeniedError } from "../utils/guard-medical-read.js";

/**
 * Clinical document attachments per appointment.
 *
 *   GET    /api/doctor/appointments/:id/documents
 *   POST   /api/doctor/appointments/:id/documents     — multipart
 *   DELETE /api/doctor/documents/:documentId
 *   GET    /api/doctor/documents/:documentId/download — auth-gated stream
 *
 * Documents are stored in S3 under a `clinical/<doctorId>/<appointmentId>/`
 * prefix. The public `/api/media/*` route refuses any key starting with
 * `clinical/` so the S3 key alone is not enough to fetch the file — the
 * caller MUST hit the auth-gated download endpoint below, which
 * resolves the AppointmentDocument row and verifies the caller's
 * doctorId matches or that an admin is acting on behalf of the doctor.
 *
 * MIME allowlist intentionally narrower than the marketing upload
 * (which accepts SVG / GIF) — clinical attachments are docs, scans,
 * photos.
 */

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "application/pdf",
]);

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// ponytail: hard cap on the per-appointment document list — bounds worst
// case, no "load older" UI exists for this yet.
const LIST_CAP = 200;

function buildDownloadPath(documentId: string): string {
  return `/api/doctor/documents/${encodeURIComponent(documentId)}/download`;
}

const appointmentDocumentsRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id/documents",
    async (request, reply) => {
      const auth = await verifyClinicalReadAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const appt = await prisma.appointment.findFirst({
          where: {
            id: request.params.id,
            ...(auth.role === "DOCTOR" && auth.doctorId
              ? { doctorId: auth.doctorId }
              : {}),
          },
          select: { id: true },
        });
        if (!appt) {
          return reply.status(404).send(errorResponse("Appointment not found"));
        }
        try {
          await guardMedicalReadForAppointment(
            request,
            { userId: auth.userId, role: auth.role, doctorId: auth.doctorId },
            appt.id,
            { resourceType: "MEDICAL_DOC", accessAction: "VIEWED" },
          );
        } catch (guardError) {
          if (guardError instanceof MedicalAccessDeniedError) {
            return reply.status(403).send(errorResponse("Access to this medical record is not permitted"));
          }
          throw guardError;
        }
        const rows = await prisma.appointmentDocument.findMany({
          where: { appointmentId: appt.id },
          orderBy: { createdAt: "desc" },
          take: LIST_CAP,
        });
        return okResponse({
          items: rows.map((r) => ({
            id: r.id,
            label: r.label,
            mimetype: r.mimetype,
            byteSize: r.byteSize,
            url: buildDownloadPath(r.id),
            createdAt: r.createdAt.toISOString(),
          })),
        });
      } catch (error) {
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not load documents"));
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id/documents",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

      if (!isMediaStorageConfigured()) {
        return reply
          .status(503)
          .send(errorResponse("Object storage is not configured"));
      }

      const appt = await prisma.appointment.findFirst({
        where: { id: request.params.id, doctorId: auth.doctorId },
        select: { id: true, fullName: true },
      });
      if (!appt) {
        return reply.status(404).send(errorResponse("Appointment not found"));
      }

      const file = await request.file();
      if (!file) {
        return reply
          .status(400)
          .send(errorResponse('Expected one file field named "file"'));
      }
      const declaredMime = file.mimetype ?? "";
      if (!ALLOWED_MIME.has(declaredMime)) {
        return reply
          .status(415)
          .send(errorResponse("Unsupported file type — use PDF / JPEG / PNG / WebP / AVIF"));
      }
      const buffer = await file.toBuffer();
      if (buffer.length > MAX_BYTES) {
        return reply.status(413).send(errorResponse("File too large (max 10MB)"));
      }
      const mimetype = verifySniffedMime(buffer, declaredMime, ALLOWED_MIME);
      if (!mimetype) {
        return reply
          .status(415)
          .send(errorResponse("File content does not match declared type"));
      }
      // The multipart field is named `file` but the form can also send
      // a sibling `label` field that we pick up off the parts iterator.
      const labelField = file.fields?.["label"];
      let label = "";
      if (labelField && !Array.isArray(labelField) && "value" in labelField) {
        label = String(labelField.value ?? "").trim().slice(0, 200);
      }
      if (!label) {
        label = sanitizeOriginalFilename(file.filename ?? "document");
      }

      const safeName = sanitizeOriginalFilename(file.filename ?? "document");
      const storageKey = `clinical/${auth.doctorId}/${appt.id}/${randomUUID()}-${safeName}`;

      try {
        await putObject(storageKey, buffer, mimetype);
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send(errorResponse("Upload failed"));
      }

      try {
        const row = await prisma.appointmentDocument.create({
          data: {
            appointmentId: appt.id,
            doctorId: auth.doctorId,
            label,
            storageKey,
            mimetype,
            byteSize: buffer.length,
          },
        });
        // S-008: PHI document upload — audit failure must be loud, but the
        // enclosing catch below treats any thrown error here as "the DB
        // write failed" and deletes the just-uploaded S3 object to avoid a
        // leak. The upload + DB row already succeeded at this point, so an
        // audit-write failure must NOT trigger that cleanup (it would
        // delete a real file while its DB row stays behind). Log loudly at
        // error level (alertable) instead of throwing into that catch.
        try {
          await recordCriticalAudit({
            actorUserId: auth.userId,
            actorRole: "DOCTOR",
            action: "DOCUMENT_UPLOADED",
            entityType: "AppointmentDocument",
            entityId: row.id,
            metadata: { appointmentId: appt.id, label, byteSize: buffer.length },
            request,
          });
        } catch (auditError) {
          app.log.error(
            { err: auditError, documentId: row.id },
            "CRITICAL: DOCUMENT_UPLOADED audit write failed",
          );
        }
        notifyAdmins("DOCUMENT_UPLOADED", {
          appointmentId: appt.id,
          snippet: `${appt.fullName} · ${label}`,
        }).catch(() => {});
        return reply.status(201).send(
          okResponse({
            document: {
              id: row.id,
              label: row.label,
              mimetype: row.mimetype,
              byteSize: row.byteSize,
              url: buildDownloadPath(row.id),
              createdAt: row.createdAt.toISOString(),
            },
          }),
        );
      } catch (error) {
        // Cleanup the S3 object if the DB write failed so we don't leak.
        try {
          await deleteObject(storageKey);
        } catch {
          /* best-effort */
        }
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not save document"));
      }
    },
  );

  /**
   * Auth-gated streaming download. The public `/api/media/*` route
   * refuses any `clinical/*` key, so this is the ONLY path that hands
   * out clinical attachments. Doctors can fetch their own files;
   * admins can fetch any (support workflows).
   */
  app.get<{ Params: { documentId: string } }>(
    "/api/doctor/documents/:documentId/download",
    async (request, reply) => {
      const auth = await verifyClinicalReadAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      if (!isMediaStorageConfigured()) {
        return reply
          .status(503)
          .send(errorResponse("Object storage is not configured"));
      }
      try {
        const doc = await prisma.appointmentDocument.findUnique({
          where: { id: request.params.documentId },
          select: {
            id: true,
            doctorId: true,
            mimetype: true,
            label: true,
            storageKey: true,
            appointmentId: true,
          },
        });
        if (!doc) {
          return reply.status(404).send(errorResponse("Document not found"));
        }
        // Doctors can only read their own attachments; admins (no
        // doctorId on the session) get a free pass for support
        // workflows.
        if (auth.role === "DOCTOR" && doc.doctorId !== auth.doctorId) {
          return reply.status(403).send(errorResponse("Forbidden"));
        }
        try {
          await guardMedicalReadForAppointment(
            request,
            { userId: auth.userId, role: auth.role, doctorId: auth.doctorId },
            doc.appointmentId,
            { resourceType: "MEDICAL_DOC", accessAction: "DOWNLOADED", resourceId: doc.id },
          );
        } catch (guardError) {
          if (guardError instanceof MedicalAccessDeniedError) {
            return reply.status(403).send(errorResponse("Access to this medical record is not permitted"));
          }
          throw guardError;
        }
        const obj = await getObject(doc.storageKey);
        const stream = streamToNodeReadable(obj.Body);
        if (!stream) {
          return reply
            .status(500)
            .send(errorResponse("Unable to read document"));
        }
        reply.header("Content-Type", obj.ContentType ?? doc.mimetype);
        // Force download rather than inline rendering — the stored MIME
        // type is client-declared at upload time (not byte-sniffed), so
        // inline rendering of a mislabeled file is a content-execution risk.
        reply.header(
          "Content-Disposition",
          `attachment; filename="${doc.label.replace(/"/g, "")}"`,
        );
        reply.header("Cache-Control", "private, no-store");
        return reply.send(stream);
      } catch (error) {
        if (error instanceof NoSuchKey || error instanceof MediaObjectNotFoundError) {
          return reply.status(404).send(errorResponse("Document not found"));
        }
        if (error instanceof DatabaseUnavailableError) {
          return reply.status(503).send(errorResponse(error.message));
        }
        app.log.error(error);
        return reply.status(500).send(errorResponse("Could not stream document"));
      }
    },
  );

  app.delete<{ Params: { documentId: string } }>(
    "/api/doctor/documents/:documentId",
    async (request, reply) => {
      const auth = await verifyDoctorAccess(request);
      if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
      try {
        const existing = await prisma.appointmentDocument.findUnique({
          where: { id: request.params.documentId },
        });
        if (!existing || existing.doctorId !== auth.doctorId) {
          return reply.status(404).send(errorResponse("Document not found"));
        }
        await prisma.appointmentDocument.delete({ where: { id: existing.id } });
        try {
          await deleteObject(existing.storageKey);
        } catch (err) {
          // Don't fail the delete on storage cleanup — the DB row is
          // gone, and a stray S3 blob is recoverable by ops if needed.
          app.log.warn({ err }, "Failed to delete object from storage");
        }
        // S-008: PHI document delete — audit write must not be silently
        // swallowed. Safe to throw here: the storage-cleanup step above
        // already ran in its own try/catch (best-effort), so a thrown
        // audit failure only surfaces as a 500 on an already-completed
        // delete, not a spurious cleanup action.
        await recordCriticalAudit({
          actorUserId: auth.userId,
          actorRole: "DOCTOR",
          action: "DOCUMENT_DELETED",
          entityType: "AppointmentDocument",
          entityId: existing.id,
          request,
        });
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

export default appointmentDocumentsRoute;
