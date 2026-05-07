const INTERNAL_COPY_PATTERNS = [
  /\bTODO\b/i,
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
