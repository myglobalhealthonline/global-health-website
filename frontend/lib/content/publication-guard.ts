/**
 * Development/internal copy that must never reach a public page. Shared with
 * `lib/content/publication-validation.ts` so the "is this copy publishable?"
 * question has exactly one answer — this file is the leaf (no imports), so it
 * owns the list.
 *
 * `TODO` is deliberately the ONLY case-sensitive pattern here. Case-insensitive
 * `\btodo\b` also matched the ordinary Spanish/Portuguese word "todo" ("all"),
 * which silently noindexed fully published clinicians whose bios are written in
 * those languages (confirmed: dr-javier-villarte-betancor, dr-silvina-irale) and
 * made `sanitizePublicCopyString` swap their real bios for boilerplate. A real
 * development placeholder is written in caps — `TODO`, `TODO:`, `[TODO]`,
 * `TODO(name)` all still match, because `\b` only requires a non-word character
 * on each side.
 */
export const INTERNAL_COPY_PATTERNS = [
  /\bTODO\b/,
  /\bplaceholder\b/i,
  /\bmigration\b/i,
  /\badapter\b/i,
  /\btemplate-driven\b/i,
  /\badmin-managed\b/i,
  /\bfuture-managed\b/i,
  /\bseeded\b/i,
  /\bfallback\b/i,
  /\bmock\b/i,
  /\bpending\b/i,
  /\blegacy compatibility\b/i,
];

const SAFE_REPLACEMENT =
  "Information is reviewed before publication. Use the booking flow or contact the clinic team for current details.";

export function isPublicCopySafe(value: string) {
  return !INTERNAL_COPY_PATTERNS.some((pattern) => pattern.test(value));
}

export function sanitizePublicCopyString(value: string) {
  return isPublicCopySafe(value) ? value : SAFE_REPLACEMENT;
}

export function sanitizePublicContent<T>(input: T): T {
  if (typeof input === "string") {
    return sanitizePublicCopyString(input) as T;
  }
  if (Array.isArray(input)) {
    return input.map((item) => sanitizePublicContent(item)) as T;
  }
  if (input && typeof input === "object") {
    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => [key, sanitizePublicContent(value)]),
    ) as T;
  }
  return input;
}
