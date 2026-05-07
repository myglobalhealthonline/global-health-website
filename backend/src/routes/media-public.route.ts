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
