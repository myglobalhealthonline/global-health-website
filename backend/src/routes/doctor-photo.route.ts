import type { FastifyPluginAsync } from "fastify";
import { randomUUID } from "node:crypto";
import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";
import { putObject, isMediaStorageConfigured } from "../services/object-storage.js";
import { sanitizeOriginalFilename } from "../utils/media-key.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { recordAudit } from "../modules/audit/audit.service.js";

/**
 * Doctor self-upload profile photo.
 *
 *   POST   /api/doctor/profile/photo   — upload, replace existing
 *   DELETE /api/doctor/profile/photo   — remove
 *
 * Mirrors the admin media-upload flow but scopes the resulting Asset
 * row to the calling doctor (`Asset.doctorId = self`). Any previous
 * active image asset is deactivated so the public profile picks the
 * new one without an admin intervening.
 */

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

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

const doctorPhotoRoute: FastifyPluginAsync = async (app) => {
  app.post("/api/doctor/profile/photo", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

    if (!isMediaStorageConfigured()) {
      return reply
        .status(503)
        .send(errorResponse("Object storage is not configured"));
    }

    const file = await request.file();
    if (!file) {
      return reply
        .status(400)
        .send(errorResponse('Expected one file field named "file"'));
    }
    const mimetype = file.mimetype ?? "";
    if (!ALLOWED_MIME.has(mimetype)) {
      return reply.status(415).send(errorResponse("Unsupported file type"));
    }
    const buffer = await file.toBuffer();
    const maxBytes = 5 * 1024 * 1024;
    if (buffer.length > maxBytes) {
      return reply
        .status(413)
        .send(errorResponse("File too large (max 5MB)"));
    }

    const safeName = sanitizeOriginalFilename(file.filename ?? "doctor.png");
    const key = `media/doctors/${auth.doctorId}/${randomUUID()}-${safeName}`;

    try {
      await putObject(key, buffer, mimetype);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send(errorResponse("Upload failed"));
    }

    try {
      // Replace any prior active asset so the public roster picks the
      // newest image without manual admin cleanup.
      await prisma.$transaction([
        prisma.asset.updateMany({
          where: {
            doctorId: auth.doctorId,
            kind: "IMAGE",
            isActive: true,
          },
          data: { isActive: false },
        }),
        prisma.asset.create({
          data: {
            doctorId: auth.doctorId,
            kind: "IMAGE",
            key,
            path: buildMediaPath(key),
            isActive: true,
          },
        }),
      ]);
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not save photo"));
    }

    recordAudit({
      actorUserId: auth.userId,
      actorRole: "DOCTOR",
      action: "DOCTOR_PHOTO_UPDATED",
      entityType: "Doctor",
      entityId: auth.doctorId,
      metadata: { key, byteSize: buffer.length },
      request,
    }).catch(() => {});

    const publicUrl = buildPublicMediaUrl(request, key);
    return okResponse(
      { key, publicUrl, path: buildMediaPath(key) },
      "Profile photo updated",
    );
  });

  app.delete("/api/doctor/profile/photo", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
    try {
      const result = await prisma.asset.updateMany({
        where: {
          doctorId: auth.doctorId,
          kind: "IMAGE",
          isActive: true,
        },
        data: { isActive: false },
      });
      if (result.count > 0) {
        recordAudit({
          actorUserId: auth.userId,
          actorRole: "DOCTOR",
          action: "DOCTOR_PHOTO_REMOVED",
          entityType: "Doctor",
          entityId: auth.doctorId,
          request,
        }).catch(() => {});
      }
      return okResponse({ removed: result.count });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not remove photo"));
    }
  });
};

export default doctorPhotoRoute;
