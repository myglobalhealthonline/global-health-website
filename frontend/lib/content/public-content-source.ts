import { hasPublicApiBaseUrl } from "@/lib/api/client";

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
  // A build with NO backend configured at all is not a degraded build — it is
  // a compile/export smoke build (CI runs `pnpm build` with no
  // NEXT_PUBLIC_API_URL, purely to catch what `tsc --noEmit` can't). There is
  // no content to be missing, so failing closed here just breaks CI on every
  // commit. The hard failure below is for the case that actually matters: a
  // backend IS configured and is returning nothing.
  if (IS_BUILD && !hasPublicApiBaseUrl()) {
    console.warn(`[public-content][BUILD] ${entity}: ${detail} — no API URL configured, using fallback`);
    return;
  }
  if (IS_BUILD) {
    console.warn(`[public-content][BUILD] ${entity}: ${detail} — using fallback`);
    // Fail the build rather than write a thin page to disk. Since P-001 these
    // pages are prerendered, so a fallback here is not a transient blip that
    // the next request repairs — it is an empty doctor list / plan grid baked
    // into a static file and served (and crawled) until ISR revalidates.
    // A build that dies loudly is strictly cheaper than a deploy that ships
    // thin content silently, which is exactly what happened before this
    // logger was made visible during builds at all.
    //
    // Escape hatch for a genuinely degraded backend you want to ship past:
    // ALLOW_DEGRADED_BUILD=1. It downgrades this to the warning above.
    if (process.env.ALLOW_DEGRADED_BUILD !== "1") {
      throw new Error(
        `[public-content][BUILD] ${entity}: ${detail}. Refusing to prerender a page with missing content — ` +
          `fix the backend read, or set ALLOW_DEGRADED_BUILD=1 to ship the fallback anyway.`,
      );
    }
    return;
  }
  if (process.env.NODE_ENV !== "development") return;
  console.warn(`[public-content] ${entity}: ${detail} — using fallback`);
}
