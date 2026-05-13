/** Keys we write are always `media/<uuid>-<sanitized-filename>`. */
const MEDIA_KEY_RE = /^media\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-[a-zA-Z0-9._-]{1,200}$/;

export function sanitizeOriginalFilename(name: string): string {
  const trimmed = name.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return trimmed.slice(0, 180) || "file";
}

export function isSafeMediaKey(key: string): boolean {
  if (key.length > 280) return false;
  if (key.includes("..") || key.includes("\\")) return false;
  return MEDIA_KEY_RE.test(key);
}
