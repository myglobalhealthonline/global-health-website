/**
 * Next sets `NEXT_PHASE=phase-production-build` for the whole `next build`
 * process, which is how the two knobs below tell "prerendering at build time"
 * apart from "serving a live request".
 */
const IS_BUILD = process.env.NEXT_PHASE === "phase-production-build";

/**
 * Timeout for optional public marketing API reads.
 *
 * Runtime keeps a tight 4s so a slow backend never blocks SSR behind a
 * visitor. Build time gets far longer: `next build` prerenders ~550 pages
 * across 15 parallel workers, all hammering the same backend at once, and a
 * fetch that loses that race doesn't just delay a page — it BAKES the empty
 * fallback into a static file that is then served (and crawled) until the
 * next revalidate. Nobody is waiting on a prerender, so waiting is free;
 * shipping a thin page is not. Override with PUBLIC_CONTENT_BUILD_TIMEOUT_MS.
 */
export const PUBLIC_CONTENT_FETCH_TIMEOUT_MS = IS_BUILD
  ? Number(process.env.PUBLIC_CONTENT_BUILD_TIMEOUT_MS) || 30_000
  : 4000;

/**
 * Surfaces a degraded content read.
 *
 * Fires in development AND during `next build`. The build case is the one that
 * matters: a prerender that silently falls back writes a thin page to disk,
 * and before this it produced no output at all — a whole deploy could ship
 * with empty doctor/plan lists and look completely clean in the build log.
 *
 * Deliberately stays quiet during production *runtime*: there a fallback is a
 * transient per-request blip that self-heals on the next revalidate, and
 * logging it would flood the platform logs whenever the backend hiccups.
 */
export function logPublicContentFallback(entity: string, detail: string): void {
  if (process.env.NODE_ENV !== "development" && !IS_BUILD) return;
  const prefix = IS_BUILD ? "[public-content][BUILD]" : "[public-content]";
  console.warn(`${prefix} ${entity}: ${detail} — using fallback`);
}
