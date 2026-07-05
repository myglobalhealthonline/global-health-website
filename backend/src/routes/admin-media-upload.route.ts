import type { FastifyPluginAsync } from "fastify";
import { randomUUID } from "node:crypto";
import { putObject, isMediaStorageConfigured } from "../services/object-storage.js";
import { sanitizeOriginalFilename } from "../utils/media-key.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { buildPublicMediaUrl } from "../utils/public-media-url.js";
import { errorResponse, okResponse } from "../utils/response.js";
import { verifySniffedMime } from "../utils/sniff-mime.js";

// SVG is intentionally excluded. SVGs are XML and can carry inline
// <script> tags or onload attributes; serving them back from /api/media/*
// would execute that script in the patient's browser (stored XSS).
// If we ever want to ship SVG support, run files through a sanitizer
// (e.g. DOMPurify with the SVG profile) and serve them with a strict
// Content-Security-Policy that forbids inline script.
const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const ALLOWED_MIME = new Set([...ALLOWED_IMAGE_MIME, "application/pdf"]);

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const PDF_MAX_BYTES = 10 * 1024 * 1024;

const adminMediaUploadRoute: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (request, reply) => {
    const auth = await verifyAdminAccess(request);
    if (!auth.ok) {
      return reply.status(auth.status).send(errorResponse(auth.message));
    }
  });

  app.post("/api/admin/media/upload", async (request, reply) => {
    if (!isMediaStorageConfigured()) {
      return reply.status(503).send(errorResponse("Object storage is not configured"));
    }

    const file = await request.file();
    if (!file) {
      return reply.status(400).send(errorResponse("Expected one file field named \"file\""));
    }

    const declaredMime = file.mimetype ?? "";
    if (!ALLOWED_MIME.has(declaredMime)) {
      return reply.status(415).send(errorResponse("Unsupported file type"));
    }

    const buffer = await file.toBuffer();
    const isPdf = declaredMime === "application/pdf";
    const maxBytes = isPdf ? PDF_MAX_BYTES : IMAGE_MAX_BYTES;
    if (buffer.length > maxBytes) {
      return reply
        .status(413)
        .send(errorResponse(`File too large (max ${isPdf ? "10" : "5"}MB)`));
    }

    // Verify the actual bytes match the declared type — stops a script/HTML
    // payload mislabelled as image/jpeg or application/pdf from being stored
    // and later served with a trusted Content-Type (stored XSS / phishing).
    const sniffedMime = verifySniffedMime(buffer, declaredMime, ALLOWED_MIME);
    if (!sniffedMime) {
      return reply.status(415).send(errorResponse("File content does not match declared type"));
    }

    const safeName = sanitizeOriginalFilename(file.filename ?? "upload");
    const prefix = isPdf ? "documents" : "media";
    const key = `${prefix}/${randomUUID()}-${safeName}`;

    try {
      await putObject(key, buffer, sniffedMime);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send(errorResponse("Upload failed"));
    }

    const publicUrl = buildPublicMediaUrl(request, key);
    return okResponse({ key, publicUrl }, "Uploaded");
  });
};

export default adminMediaUploadRoute;
