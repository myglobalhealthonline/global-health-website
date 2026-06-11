import type { FastifyPluginAsync } from "fastify";
import { randomUUID } from "node:crypto";
import { putObject, isMediaStorageConfigured } from "../services/object-storage.js";
import { sanitizeOriginalFilename } from "../utils/media-key.js";
import { verifyAdminAccess } from "../utils/admin-auth.js";
import { buildPublicMediaUrl } from "../utils/public-media-url.js";
import { errorResponse, okResponse } from "../utils/response.js";

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

/**
 * Sniff the real file type from leading bytes. The client-supplied
 * Content-Type is not trusted — an attacker can label an HTML/SVG/script
 * payload as image/jpeg. Returns the detected MIME or null if the buffer
 * is not one of the allowed types.
 */
function sniffFileMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  // PDF: %PDF (25 50 44 46)
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
    return "application/pdf";
  }
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return "image/png";
  }
  // GIF: "GIF87a" / "GIF89a"
  if (buf.toString("ascii", 0, 6) === "GIF87a" || buf.toString("ascii", 0, 6) === "GIF89a") {
    return "image/gif";
  }
  // RIFF container: "RIFF" .... "WEBP"
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  // ISO-BMFF (AVIF): bytes 4-7 "ftyp", brand at 8-11 is "avif"/"avis"
  if (buf.toString("ascii", 4, 8) === "ftyp") {
    const brand = buf.toString("ascii", 8, 12);
    if (brand === "avif" || brand === "avis") return "image/avif";
  }
  return null;
}

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
    const sniffedMime = sniffFileMime(buffer);
    if (!sniffedMime || !ALLOWED_MIME.has(sniffedMime)) {
      return reply.status(415).send(errorResponse("File content does not match declared type"));
    }
    if (sniffedMime !== declaredMime) {
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
