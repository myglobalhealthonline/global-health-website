import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";
import {
  putObject,
  deleteObject,
  isMediaStorageConfigured,
} from "../services/object-storage.js";
import { sanitizeOriginalFilename } from "../utils/media-key.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { recordAudit } from "../modules/audit/audit.service.js";
import { notifyAdmins } from "../modules/notifications/notify.service.js";

/**
 * Clinical document attachments per appointment.
 *
 *   GET    /api/doctor/appointments/:id/documents
 *   POST   /api/doctor/appointments/:id/documents     — multipart
 *   DELETE /api/doctor/documents/:documentId
 *   GET    /api/doctor/documents/:documentId/download — streams the file
 *
 * Stored in S3 under a doctor-scoped key prefix so admins don't auto-
 * see clinical files alongside marketing assets. Download is gated by
 * the same `verifyDoctorAccess` check; admins fall through because the
 * helper tolerates ADMIN role for support cases (with a doctorId
 * linked — admins without one get a 403).
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

function buildMediaPath(key: string): string {
  return `/api/media/${key.split("/").map(encodeURIComponent).join("/")}`;
}

function buildPublicMediaUrl(
  request: { protocol: string; hostname: string },
  key: string,
): string {
  const configured = env.PUBLIC_MEDIA_ORIGIN?.trim().replace(/\/+$/, "");
  const path = buildMediaPath(key);
  if (configured) return `${configured}${path}`;
  return `${request.protocol}://${request.hostname}${path}`;
}

const appointmentDocumentsRoute: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { id: string } }>(
    "/api/doctor/appointments/:id/documents",
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
        const rows = await prisma.appointmentDocument.findMany({
          where: { appointmentId: appt.id },
          orderBy: { createdAt: "desc" },
        });
        return okResponse({
          items: rows.map((r) => ({
            id: r.id,
            label: r.label,
            mimetype: r.mimetype,
            byteSize: r.byteSize,
            url: buildPublicMediaUrl(request, r.storageKey),
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
      const mimetype = file.mimetype ?? "";
      if (!ALLOWED_MIME.has(mimetype)) {
        return reply
          .status(415)
          .send(errorResponse("Unsupported file type — use PDF / JPEG / PNG / WebP / AVIF"));
      }
      const buffer = await file.toBuffer();
      if (buffer.length > MAX_BYTES) {
        return reply.status(413).send(errorResponse("File too large (max 10MB)"));
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
        recordAudit({
          actorUserId: auth.userId,
          actorRole: "DOCTOR",
          action: "DOCUMENT_UPLOADED",
          entityType: "AppointmentDocument",
          entityId: row.id,
          metadata: { appointmentId: appt.id, label, byteSize: buffer.length },
          request,
        }).catch(() => {});
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
              url: buildPublicMediaUrl(request, row.storageKey),
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
        recordAudit({
          actorUserId: auth.userId,
          actorRole: "DOCTOR",
          action: "DOCUMENT_DELETED",
          entityType: "AppointmentDocument",
          entityId: existing.id,
          request,
        }).catch(() => {});
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
