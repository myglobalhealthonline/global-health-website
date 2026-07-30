/**
 * Two key shapes are accepted:
 *   - flat: `media/<uuid>-<file>` (admin uploads via /api/admin/media/upload)
 *   - scoped: `media/<scope>/<actorId>/<uuid>-<file>` — doctor self-upload
 *     (/api/doctor/profile/photo) writes `media/doctors/<doctorId>/...` so
 *     each doctor's files stay organized in S3.
 *
 * Scope = lowercase letters only (`doctors`, future: `patients`, …).
 * ActorId = cuid-shaped (lowercase alphanumeric, 20-30 chars).
 */
const MEDIA_KEY_RE = /^media\/(?:[a-z]+\/[a-z0-9]{20,30}\/)?[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-[a-zA-Z0-9._-]{1,200}$/;

/**
 * `documents/legal-<slug>.pdf` — CountryLegalDocument PDFs written by
 * applied/seed-legal-documents.ts (`putObject(\`documents/legal-${slug}.pdf\`, ...)`).
 * Not UUID-named like media uploads, so it needs its own shape.
 */
const DOCUMENTS_KEY_RE = /^documents\/[a-zA-Z0-9._-]{1,200}\.pdf$/;

export function sanitizeOriginalFilename(name: string): string {
  const trimmed = name.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return trimmed.slice(0, 180) || "file";
}

export function isSafeMediaKey(key: string): boolean {
  if (key.length > 280) return false;
  if (key.includes("..") || key.includes("\\")) return false;
  return MEDIA_KEY_RE.test(key) || DOCUMENTS_KEY_RE.test(key);
}
