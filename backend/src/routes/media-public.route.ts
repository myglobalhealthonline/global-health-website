import { NoSuchKey } from "@aws-sdk/client-s3";
import type { FastifyPluginAsync } from "fastify";
import {
  getObject,
  isMediaStorageConfigured,
  MediaObjectNotFoundError,
  streamToNodeReadable,
} from "../services/object-storage.js";
import { isSafeMediaKey } from "../utils/media-key.js";
import { errorResponse } from "../utils/response.js";

const mediaPublicRoute: FastifyPluginAsync = async (app) => {
  app.get("/api/media/*", async (request, reply) => {
    if (!isMediaStorageConfigured()) {
      return reply.status(503).send(errorResponse("Media storage is not configured"));
    }

    const star = (request.params as { "*": string })["*"];
    const key = decodeURIComponent(star ?? "").replace(/^\/+/, "");
    if (!isSafeMediaKey(key)) {
      return reply.status(400).send(errorResponse("Invalid media key"));
    }

    // Clinical document attachments are stored under the `clinical/`
    // prefix and contain PHI. They MUST be served through the
    // auth-gated `/api/doctor/documents/:id/download` endpoint, which
    // resolves the AppointmentDocument row + verifies the caller
    // owns it or is an admin. Refuse the public media path so
    // a leaked S3 key alone never exposes a patient record.
    if (key.startsWith("clinical/")) {
      return reply.status(403).send(errorResponse("This document requires authentication"));
    }

    try {
      const obj = await getObject(key);
      const stream = streamToNodeReadable(obj.Body);
      if (!stream) {
        return reply.status(500).send(errorResponse("Unable to read media object"));
      }

      const contentType = obj.ContentType ?? "application/octet-stream";
      reply.header("Content-Type", contentType);
      reply.header("Cache-Control", "public, max-age=31536000, immutable");
      return reply.send(stream);
    } catch (error: unknown) {
      if (error instanceof NoSuchKey || error instanceof MediaObjectNotFoundError) {
        return reply.status(404).send(errorResponse("Not found"));
      }
      app.log.error(error);
      return reply.status(500).send(errorResponse("Unexpected media error"));
    }
  });
};

export default mediaPublicRoute;
