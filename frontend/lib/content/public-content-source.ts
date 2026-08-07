import { hasPublicApiBaseUrl, isTransientStatus, type ApiResult } from "@/lib/api/client";

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
 * A public content read that could not be COMPLETED: timeout, network error,
 * 429, backend 5xx, or a 200 whose payload is missing the record it promised.
 * None of those confirm that the content is absent.
 *
 * Single-resource pages throw this instead of falling through to
 * `notFound()`. An uncaught error in a server component is a 5xx, which tells
 * a crawler "come back" — a 404 tells it the URL is gone and gets it dropped
 * from the index. Before this, an 8-concurrent cold crawl of the sitemap hard
 * -404'd 216 of 1,724 valid URLs purely on backend timeouts (SEO audit
 * 2026-08-07); the same URLs returned 200 when requested sequentially.
 *
 * Next.js has no supported way to set a 503 from a page route, so this
 * surfaces as a 500. That is the point: temporary, retryable, not "gone".
 */
export class PublicContentUnavailableError extends Error {
  constructor(entity: string, detail: string) {
    super(`[public-content] ${entity}: ${detail} — upstream unavailable, refusing to render 404`);
    this.name = "PublicContentUnavailableError";
  }
}

/**
 * A deterministic 4xx from the backend that is NOT a 404: 400 "invalid slug",
 * 401, 403, 409, 422. Retrying cannot change it, but it is not an answer about
 * whether the content exists either — it almost always means the frontend and
 * the backend disagree about the request contract.
 *
 * So it must never become a 404. Rendering "this page does not exist" off a
 * contract bug both hides the defect and tells Google to drop a URL whose
 * content is sitting in the database, unharmed.
 */
export class PublicContentRequestError extends Error {
  constructor(entity: string, status: number, detail: string) {
    super(
      `[public-content] ${entity}: backend rejected the request with HTTP ${status} (${detail}) — ` +
        `not a 404, refusing to render one`,
    );
    this.name = "PublicContentRequestError";
  }
}

/**
 * Classifies a failed single-resource read.
 *
 *   404                        NOT_FOUND — returns normally, so the caller
 *                              returns null and the route may 404. This is the
 *                              ONLY status allowed to reach `notFound()`.
 *   429 / 5xx / no status      TEMPORARY_FAILURE — throws
 *                              `PublicContentUnavailableError`. (`apiRequest`
 *                              reports timeouts, aborts and socket errors with
 *                              no `status` at all.)
 *   any other 4xx              UPSTREAM_CLIENT_ERROR — throws
 *                              `PublicContentRequestError`. No retry (it is
 *                              deterministic), no null, no 404.
 *
 * Exception: with NO backend configured there is nothing to be unavailable —
 * that is the CI compile-smoke build and local dev without an API. Keep the
 * historical null/404 there rather than turning every page into a 500.
 */
export function assertAbsenceConfirmed(entity: string, res: ApiResult<unknown>): void {
  if (res.ok || !hasPublicApiBaseUrl()) return;
  if (res.status === 404) return;
  if (res.status !== undefined && !isTransientStatus(res.status)) {
    throw new PublicContentRequestError(entity, res.status, res.message);
  }
  throw new PublicContentUnavailableError(
    entity,
    res.status !== undefined ? `HTTP ${res.status}` : res.message,
  );
}

/**
 * The 200-with-no-record case: the backend answered, but the envelope has no
 * usable row. Absence is NOT confirmed (a real absence is a 404 from all three
 * detail routes — services.route.ts, health-tests.route.ts,
 * public-seo-landing.route.ts), so this is a truncated/garbled response, not a
 * missing page.
 */
export function missingRecordOn200(entity: string): never {
  throw new PublicContentUnavailableError(entity, "backend returned 200 with no usable record");
}

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
