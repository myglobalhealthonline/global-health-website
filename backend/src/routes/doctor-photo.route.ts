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

function doctorProfileImageKey(doctorId: string): string {
  return `doctor-${doctorId}-profile`;
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
    const storageKey = `media/doctors/${auth.doctorId}/${randomUUID()}-${safeName}`;
    const assetKey = doctorProfileImageKey(auth.doctorId);
    const path = buildMediaPath(storageKey);

    const doctorMeta = await prisma.doctor.findUnique({
      where: { id: auth.doctorId },
      select: {
        fullName: true,
        countryId: true,
        slug: true,
        country: { select: { code: true } },
        additionalCountries: {
          select: { country: { select: { code: true } } },
        },
      },
    });
    if (!doctorMeta) {
      return reply.status(404).send(errorResponse("Doctor profile not found"));
    }

    try {
      await putObject(storageKey, buffer, mimetype);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send(errorResponse("Upload failed"));
    }

    try {
      // Keep one canonical profile-image Asset row per doctor. Public
      // selectors and admin edits already understand this key, so doctor
      // uploads must update it instead of creating a competing UUID asset.
      await prisma.$transaction([
        prisma.asset.updateMany({
          where: {
            doctorId: auth.doctorId,
            kind: "IMAGE",
            isActive: true,
            NOT: { key: assetKey },
          },
          data: { isActive: false },
        }),
        prisma.asset.upsert({
          where: {
            kind_key: { kind: "IMAGE", key: assetKey },
          },
          create: {
            doctorId: auth.doctorId,
            countryId: doctorMeta.countryId,
            kind: "IMAGE",
            key: assetKey,
            path,
            altText: doctorMeta.fullName,
            title: doctorMeta.fullName,
            isActive: true,
          },
          update: {
            doctorId: auth.doctorId,
            countryId: doctorMeta.countryId,
            path,
            altText: doctorMeta.fullName,
            title: doctorMeta.fullName,
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
      metadata: { key: assetKey, storageKey, byteSize: buffer.length },
      request,
    }).catch(() => {});

    const publicUrl = buildPublicMediaUrl(request, storageKey);
    return okResponse(
      {
        key: assetKey,
        storageKey,
        publicUrl,
        path,
        cache: {
          countryCode: doctorMeta.country.code,
          slug: doctorMeta.slug,
          additionalCountryCodes: doctorMeta.additionalCountries.map(
            (link) => link.country.code,
          ),
        },
      },
      "Profile photo updated",
    );
  });

  app.delete("/api/doctor/profile/photo", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
    try {
      const doctorMeta = await prisma.doctor.findUnique({
        where: { id: auth.doctorId },
        select: {
          slug: true,
          country: { select: { code: true } },
          additionalCountries: {
            select: { country: { select: { code: true } } },
          },
        },
      });
      if (!doctorMeta) {
        return reply.status(404).send(errorResponse("Doctor profile not found"));
      }
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
      return okResponse({
        removed: result.count,
        cache: {
          countryCode: doctorMeta.country.code,
          slug: doctorMeta.slug,
          additionalCountryCodes: doctorMeta.additionalCountries.map(
            (link) => link.country.code,
          ),
        },
      });
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
