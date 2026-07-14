import type { FastifyPluginAsync } from "fastify";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";
import { putObject, isMediaStorageConfigured } from "../services/object-storage.js";
import { sanitizeOriginalFilename } from "../utils/media-key.js";
import { verifySniffedMime } from "../utils/sniff-mime.js";
import { convertToWebpIfEligible, replaceExtension } from "../utils/image-webp.js";
import { DatabaseUnavailableError } from "../modules/shared/db-errors.js";
import { verifyDoctorAccess } from "../utils/doctor-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { recordAudit } from "../modules/audit/audit.service.js";
import { focalPointSchema, zoomSchema } from "../validations/admin-doctors.schema.js";

/**
 * Doctor self-upload profile photo.
 *
 *   POST   /api/doctor/profile/photo            — upload, replace existing
 *   DELETE /api/doctor/profile/photo             — remove
 *   PATCH  /api/doctor/profile/photo/position     — update crop focal point/zoom
 *
 * Mirrors the admin media-upload flow but scopes the resulting Asset
 * row to the calling doctor (`Asset.doctorId = self`). Any previous
 * active image asset is deactivated so the public profile picks the
 * new one without an admin intervening.
 */

const photoPositionBodySchema = z.object({
  focalX: focalPointSchema,
  focalY: focalPointSchema,
  zoom: zoomSchema,
});

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
    const declaredMime = file.mimetype ?? "";
    if (!ALLOWED_MIME.has(declaredMime)) {
      return reply.status(415).send(errorResponse("Unsupported file type"));
    }
    const buffer = await file.toBuffer();
    const maxBytes = 5 * 1024 * 1024;
    if (buffer.length > maxBytes) {
      return reply
        .status(413)
        .send(errorResponse("File too large (max 5MB)"));
    }
    const sniffedMime = verifySniffedMime(buffer, declaredMime, ALLOWED_MIME);
    if (!sniffedMime) {
      return reply.status(400).send(errorResponse("File content does not match an allowed type"));
    }

    const converted = await convertToWebpIfEligible(buffer, sniffedMime);
    const uploadBuffer = converted?.buffer ?? buffer;
    const mimetype = converted?.mimetype ?? sniffedMime;

    let safeName = sanitizeOriginalFilename(file.filename ?? "doctor.png");
    if (converted) safeName = replaceExtension(safeName, converted.extension);
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
      await putObject(storageKey, uploadBuffer, mimetype);
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
      metadata: { key: assetKey, storageKey, byteSize: uploadBuffer.length },
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

  app.patch("/api/doctor/profile/photo/position", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));

    const body = photoPositionBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply
        .status(400)
        .send(errorResponse("Invalid crop position", body.error.flatten()));
    }

    try {
      const result = await prisma.asset.updateMany({
        where: {
          doctorId: auth.doctorId,
          kind: "IMAGE",
          key: doctorProfileImageKey(auth.doctorId),
          isActive: true,
        },
        data: {
          focalX: body.data.focalX,
          focalY: body.data.focalY,
          zoom: body.data.zoom,
        },
      });
      if (result.count === 0) {
        return reply.status(404).send(errorResponse("No active profile photo to update"));
      }

      recordAudit({
        actorUserId: auth.userId,
        actorRole: "DOCTOR",
        action: "DOCTOR_PHOTO_UPDATED",
        entityType: "Doctor",
        entityId: auth.doctorId,
        metadata: { key: doctorProfileImageKey(auth.doctorId), ...body.data },
        request,
      }).catch(() => {});

      return okResponse(body.data, "Photo position updated");
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) {
        return reply.status(503).send(errorResponse(error.message));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not update photo position"));
    }
  });
};

export default doctorPhotoRoute;
