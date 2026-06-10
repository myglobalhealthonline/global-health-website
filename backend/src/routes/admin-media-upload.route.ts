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

/**
 * Sniff the real image type from the leading bytes. The client-supplied
 * Content-Type is not trusted — an attacker can label an HTML/SVG/script
 * payload as image/jpeg. Returns the detected MIME or null if the buffer
 * is not one of the allowed raster formats.
 */
function sniffImageMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
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

    const declaredMime = file.mimetype ?? "";
    if (!ALLOWED_MIME.has(declaredMime)) {
      return reply.status(415).send(errorResponse("Unsupported file type"));
    }

    const buffer = await file.toBuffer();
    const maxBytes = 5 * 1024 * 1024;
    if (buffer.length > maxBytes) {
      return reply.status(413).send(errorResponse("File too large (max 5MB)"));
    }

    // Verify the actual bytes are a real raster image and ignore the
    // client-declared Content-Type for storage — this stops an HTML/SVG/
    // script payload mislabelled as image/jpeg from being stored and later
    // served as that type (stored XSS).
    const sniffedMime = sniffImageMime(buffer);
    if (!sniffedMime || !ALLOWED_MIME.has(sniffedMime)) {
      return reply.status(415).send(errorResponse("File content is not a supported image"));
    }

    const safeName = sanitizeOriginalFilename(file.filename ?? "upload");
    const key = `media/${randomUUID()}-${safeName}`;

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
