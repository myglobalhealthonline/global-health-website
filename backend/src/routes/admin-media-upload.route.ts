import type { FastifyPluginAsync } from "fastify";
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { putObject, isMediaStorageConfigured } from "../services/object-storage.js";
import { sanitizeOriginalFilename } from "../utils/media-key.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { errorResponse, okResponse } from "../utils/response.js";

// SVG is intentionally excluded. SVGs are XML and can carry inline
// <script> tags or onload attributes; serving them back from /api/media/*
// would execute that script in the patient's browser (stored XSS).
// If we ever want to ship SVG support, run files through a sanitizer
// (e.g. DOMPurify with the SVG profile) and serve them with a strict
// Content-Security-Policy that forbids inline script.
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

function buildPublicMediaUrl(request: { protocol: string; hostname: string }, key: string): string {
  const configured = env.PUBLIC_MEDIA_ORIGIN?.trim().replace(/\/+$/, "");
  const path = `/api/media/${key.split("/").map(encodeURIComponent).join("/")}`;
  if (configured) {
    return `${configured}${path}`;
  }
  const proto = request.protocol;
  const host = request.hostname;
  return `${proto}://${host}${path}`;
}

const adminMediaUploadRoute: FastifyPluginAsync = async (app) => {
  app.post("/api/admin/media/upload", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }

    if (!isMediaStorageConfigured()) {
      return reply.status(503).send(errorResponse("Object storage is not configured"));
    }

    const file = await request.file();
    if (!file) {
      return reply.status(400).send(errorResponse("Expected one file field named \"file\""));
    }

    const mimetype = file.mimetype ?? "";
    if (!ALLOWED_MIME.has(mimetype)) {
      return reply.status(415).send(errorResponse("Unsupported file type"));
    }

    const buffer = await file.toBuffer();
    const maxBytes = 5 * 1024 * 1024;
    if (buffer.length > maxBytes) {
      return reply.status(413).send(errorResponse("File too large (max 5MB)"));
    }

    const safeName = sanitizeOriginalFilename(file.filename ?? "upload");
    const key = `media/${randomUUID()}-${safeName}`;

    try {
      await putObject(key, buffer, mimetype);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send(errorResponse("Upload failed"));
    }

    const publicUrl = buildPublicMediaUrl(request, key);
    return okResponse({ key, publicUrl }, "Uploaded");
  });
};

export default adminMediaUploadRoute;
