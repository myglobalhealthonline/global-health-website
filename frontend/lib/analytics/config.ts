/**
 * Analytics configuration, resolved once at module load.
 *
 * `NEXT_PUBLIC_*` is INLINED AT BUILD TIME by Next, so these must be written
 * as full static member expressions — no destructuring, no computed keys, or
 * the substitution silently doesn't happen. They must also be present in the
 * BUILD environment, not just at container start: a Docker build that injects
 * env only at runtime would ship empty ids and no analytics, with nothing
 * surfaced anywhere. Railway service variables cover both.
 */

const rawGa = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";
const rawClarity = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim() ?? "";

/**
 * Both ids are interpolated into an inline `<script>` body, so a malformed env
 * var would be script injection with a deploy as the delivery mechanism.
 * Validate the shape here and treat anything unexpected as "not configured" —
 * the tags then simply don't render.
 */
export const GA_MEASUREMENT_ID = /^G-[A-Z0-9]{4,20}$/i.test(rawGa) ? rawGa : "";
export const CLARITY_PROJECT_ID = /^[a-z0-9]{5,20}$/i.test(rawClarity) ? rawClarity : "";

/**
 * Production only, with a local escape hatch for verifying the tags against a
 * production build (`NEXT_PUBLIC_ANALYTICS_DEBUG=true`).
 *
 * Both operands are build-time constants, so in a normal development build the
 * whole expression folds to `false` and the tag components tree-shake out of
 * the client bundle entirely — dev sessions cannot pollute the property even
 * by accident.
 */
export const ANALYTICS_ENABLED =
  process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === "true";
