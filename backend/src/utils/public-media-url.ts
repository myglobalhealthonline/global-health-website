import { env } from "../config/env.js";

/**
 * Absolute URL for a public (non-PHI) S3 object served through the
 * `/api/media/*` proxy. Prefers the configured PUBLIC_MEDIA_ORIGIN (CDN or
 * canonical API host) and falls back to the origin of the current request.
 */
export function buildPublicMediaUrl(
  request: { protocol: string; hostname: string },
  key: string,
): string {
  const configured = env.PUBLIC_MEDIA_ORIGIN?.trim().replace(/\/+$/, "");
  const path = `/api/media/${key.split("/").map(encodeURIComponent).join("/")}`;
  if (configured) {
    return `${configured}${path}`;
  }
  return `${request.protocol}://${request.hostname}${path}`;
}
