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
import {
  DoctorProfileChangeInvalidError,
  DoctorProfileChangeNoopError,
  DoctorProfileChangeNotFoundError,
  submitDoctorPhotoFocalChange,
  submitDoctorPhotoRemoval,
  submitDoctorPhotoUpload,
} from "../modules/doctor-profile-change-requests/doctor-profile-change-requests.service.js";

/**
 * Doctor self-upload profile photo.
 *
 *   POST   /api/doctor/profile/photo             — propose a new photo
 *   DELETE /api/doctor/profile/photo             — propose removing it
 *   PATCH  /api/doctor/profile/photo/position    — propose a new crop/zoom
 *
 * The profile photo is admin-locked, so none of these change what patients see.
 * Each one records a pending DoctorProfileChangeRequest instead; the live Asset
 * only moves when an admin approves. Uploaded bytes go to object storage
 * immediately (so the doctor can preview and crop) but land on an inactive
 * Asset row that no public or admin selector reads.
 *
 * Because nothing public changes here, these responses carry no `cache` block —
 * the revalidation happens on the admin approve path instead.
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

function buildPublicMediaUrl(
  request: { protocol: string; hostname: string },
  key: string,
): string {
  const configured = env.PUBLIC_MEDIA_ORIGIN?.trim().replace(/\/+$/, "");
  const path = buildMediaPath(key);
  if (configured) return `${configured}${path}`;
  return `${request.protocol}://${request.hostname}${path}`;
}

/** Maps the change-request service's errors onto HTTP without repeating this
 *  ladder in all three handlers. Returns null when it isn't one of ours. */
function changeRequestErrorReply(
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
  error: unknown,
): unknown | null {
  if (error instanceof DoctorProfileChangeNoopError) {
    return reply.status(400).send(errorResponse(error.message));
  }
  if (error instanceof DoctorProfileChangeInvalidError) {
    return reply.status(400).send(errorResponse(error.message));
  }
  if (error instanceof DoctorProfileChangeNotFoundError) {
    return reply.status(404).send(errorResponse(error.message));
  }
  if (error instanceof DatabaseUnavailableError) {
    return reply.status(503).send(errorResponse(error.message));
  }
  return null;
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
    const path = buildMediaPath(storageKey);

    const doctorMeta = await prisma.doctor.findUnique({
      where: { id: auth.doctorId },
      select: { id: true },
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

    let changeRequest;
    try {
      changeRequest = await submitDoctorPhotoUpload(auth.doctorId, { path, storageKey });
    } catch (error) {
      const handled = changeRequestErrorReply(reply, error);
      if (handled) return handled;
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not save photo"));
    }

    recordAudit({
      actorUserId: auth.userId,
      actorRole: "DOCTOR",
      action: "DOCTOR_PROFILE_CHANGE_REQUESTED",
      entityType: "Doctor",
      entityId: auth.doctorId,
      metadata: {
        field: "photo",
        requestId: changeRequest.id,
        storageKey,
        byteSize: uploadBuffer.length,
      },
      request,
    }).catch(() => {});

    return okResponse(
      {
        pending: true,
        path,
        storageKey,
        publicUrl: buildPublicMediaUrl(request, storageKey),
        request: changeRequest,
      },
      "Photo submitted for admin approval",
    );
  });

  app.delete("/api/doctor/profile/photo", async (request, reply) => {
    const auth = await verifyDoctorAccess(request);
    if (!auth.ok) return reply.status(auth.status).send(errorResponse(auth.message));
    try {
      const changeRequest = await submitDoctorPhotoRemoval(auth.doctorId);
      recordAudit({
        actorUserId: auth.userId,
        actorRole: "DOCTOR",
        action: "DOCTOR_PROFILE_CHANGE_REQUESTED",
        entityType: "Doctor",
        entityId: auth.doctorId,
        metadata: { field: "photo", removal: true, requestId: changeRequest.id },
        request,
      }).catch(() => {});
      return okResponse(
        { pending: true, request: changeRequest },
        "Photo removal submitted for admin approval",
      );
    } catch (error) {
      const handled = changeRequestErrorReply(reply, error);
      if (handled) return handled;
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
      const changeRequest = await submitDoctorPhotoFocalChange(auth.doctorId, body.data);
      recordAudit({
        actorUserId: auth.userId,
        actorRole: "DOCTOR",
        action: "DOCTOR_PROFILE_CHANGE_REQUESTED",
        entityType: "Doctor",
        entityId: auth.doctorId,
        metadata: { field: "photo", requestId: changeRequest.id, ...body.data },
        request,
      }).catch(() => {});
      return okResponse(
        { pending: true, request: changeRequest, ...body.data },
        "Photo position submitted for admin approval",
      );
    } catch (error) {
      const handled = changeRequestErrorReply(reply, error);
      if (handled) return handled;
      app.log.error(error);
      return reply.status(500).send(errorResponse("Could not update photo position"));
    }
  });
};

export default doctorPhotoRoute;
