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

// S3 key prefixes that contain confidential PHI or recruitment PII. Objects
// under these prefixes are never served through the public media proxy.
const SENSITIVE_PREFIXES = ["clinical/", "patient-upload/", "recruitment/"] as const;

export function isSensitiveMediaKey(key: string): boolean {
  return SENSITIVE_PREFIXES.some((prefix) => key.startsWith(prefix));
}

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
    if (isSensitiveMediaKey(key)) {
      return reply.status(403).send(errorResponse("This document requires authentication"));
    }
    if (!isSafeMediaKey(key)) {
      return reply.status(400).send(errorResponse("Invalid media key"));
    }

    // PHI/PII-bearing prefixes MUST never be served through the public media
    // path. A leaked S3 key alone must not expose a patient record:
    //   - `clinical/`       — clinical document attachments, served via the
    //                         auth-gated `/api/doctor/documents/:id/download`
    //                         endpoint which verifies ownership/admin.
    //   - `patient-upload/`  — patient-uploaded medical documents; these must
    //                         be served through an auth-gated route.
    //   - `recruitment/`     — candidate CVs, served only through the audited
    //                         global-admin recruitment download route.
    try {
      const obj = await getObject(key);
      const stream = streamToNodeReadable(obj.Body);
      if (!stream) {
        return reply.status(500).send(errorResponse("Unable to read media object"));
      }

      const contentType = obj.ContentType ?? "application/octet-stream";
      reply.header("Content-Type", contentType);
      // NOT content-hashed — these keys are stable per doctor/blog-post and
      // get overwritten in place on re-upload (see doctors.service.ts
      // syncProfileImageAsset), so `immutable, max-age=1yr` would keep
      // serving a stale image for a year. Short + revalidatable instead.
      reply.header(
        "Cache-Control",
        "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
      );
      // nosemgrep: javascript.express.security.audit.xss.direct-response-write.direct-response-write -- streaming an S3 object's Node Readable via Fastify's typed reply.send(), not writing an HTML string built from user input; this rule is tuned for Express res.write(userInput).
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
