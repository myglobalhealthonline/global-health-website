import { constantTimeEqual } from "./admin-access-evaluator.js";

/**
 * Constant-time check of a cron/webhook shared secret pulled from a request
 * header. Returns false unless `provided` is a single string that exactly
 * matches `expected`. Callers still handle the "secret unset" case themselves
 * (503) before calling — passing an undefined `expected` here simply denies.
 */
export function isValidCronSecret(
  provided: string | string[] | undefined,
  expected: string | undefined,
): boolean {
  if (typeof provided !== "string" || !expected) return false;
  return constantTimeEqual(provided, expected);
}
