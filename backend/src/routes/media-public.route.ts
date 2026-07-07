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

// S3 key prefixes that contain patient health information. Objects under
// these prefixes are never served through the public media proxy.
const PHI_PREFIXES = ["clinical/", "patient-upload/"] as const;

const mediaPublicRoute: FastifyPluginAsync = async (app) => {
  app.get(
    "/api/media/*",
    { config: { rateLimit: { max: 300, timeWindow: "1 minute" } } },
    async (request, reply) => {
    if (!isMediaStorageConfigured()) {
      return reply.status(503).send(errorResponse("Media storage is not configured"));
    }

    const star = (request.params as { "*": string })["*"];
    const key = decodeURIComponent(star ?? "").replace(/^\/+/, "");
    if (!isSafeMediaKey(key)) {
      return reply.status(400).send(errorResponse("Invalid media key"));
    }

    // PHI-bearing prefixes MUST never be served through the public media
    // path. A leaked S3 key alone must not expose a patient record:
    //   - `clinical/`       — clinical document attachments, served via the
    //                         auth-gated `/api/doctor/documents/:id/download`
    //                         endpoint which verifies ownership/admin.
    //   - `patient-upload/`  — patient-uploaded medical documents; these must
    //                         be served through an auth-gated route.
    if (PHI_PREFIXES.some((prefix) => key.startsWith(prefix))) {
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
    },
  );
};

export default mediaPublicRoute;
