const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

/**
 * True only inside `next build`, on the server. Next sets NEXT_PHASE for the
 * whole build process; the `window` guard is belt-and-braces so none of the
 * build-only behaviour below can be reached from a browser bundle.
 */
const IS_BUILD = typeof window === "undefined" && process.env.NEXT_PHASE === "phase-production-build";

/** Ceiling on build-phase backoff, so one bad endpoint can't stall a build. */
const BUILD_RETRY_MAX_WAIT_MS = 20_000;
// 5 attempts at 1/2/4/8/16s. The backend's pool connect timeout is 5s
// (backend/src/db/prisma.ts), so a 3-attempt ladder topping out around 6s
// total was barely one timeout window wide and gave a saturated pool no real
// chance to drain — it failed builds on contention that clears on its own.
const BUILD_RETRY_ATTEMPTS = 5;
const BUILD_RETRY_BASE_MS = 1_000;

/**
 * Statuses worth retrying during a build.
 *   429 — rate limited (see backend/src/app.ts).
 *   503 — the backend's `pg` pool (max 10, 5s connect timeout) is saturated
 *         by the build's own concurrency and returns "…data is unavailable".
 *   502/504 — transient upstream blips.
 * All of these bake wrong content into a static file if left unretried, and
 * all are transient, so waiting is strictly better than shipping the fallback.
 */
const BUILD_RETRY_STATUSES = new Set([429, 502, 503, 504]);

/**
 * Authenticates build-phase reads to the backend so they get the raised
 * rate-limit ceiling (backend/src/app.ts — `isTrustedBuildRead`). Without
 * this, a build's ~550 prerenders share the frontend egress IP's 300/min
 * bucket, get 429'd, and bake empty content into static files.
 *
 * PROXY_CLIENT_IP_SECRET is not NEXT_PUBLIC_*, so it is never inlined into a
 * client bundle; IS_BUILD additionally pins this to the server build.
 */
function buildAuthHeaders(): Record<string, string> {
  if (!IS_BUILD) return {};
  const secret = process.env.PROXY_CLIENT_IP_SECRET?.trim();
  if (!secret) return {};
  return { "x-gh-proxy-secret": secret, "x-gh-build": "1" };
}

/**
 * Build-phase in-flight request cap, per prerender worker process.
 *
 * The 429s this file's retry ladder was written for are gone (the backend now
 * raises the ceiling for authenticated build reads), which exposed the next
 * bottleneck: the backend's `pg` pool is `max: 10` with a 5s
 * `connectionTimeoutMillis` (backend/src/db/prisma.ts). A build's workers each
 * render pages that fire 5+ parallel content reads, so demand sits far above
 * 10 for the WHOLE build — queue waits blow past 5s and every read 503s
 * ("…data is unavailable"). Retrying doesn't help when the saturation is
 * continuous rather than bursty: all 5 attempts expire against the same wall.
 *
 * So bound the demand instead. `cpus` (frontend/next.config.ts) x this cap is
 * the build's total concurrent load on that pool; the defaults (4 x 2 = 8)
 * leave headroom under 10. Raising the pool was considered and rejected
 * separately (Postgres max_connections on the current plan).
 *
 * Build-only: a live visitor's SSR is never queued behind this.
 */
const BUILD_MAX_IN_FLIGHT = Number(process.env.NEXT_BUILD_API_CONCURRENCY) || 2;
let buildInFlight = 0;
const buildWaiting: Array<() => void> = [];

/**
 * Take one of the build's concurrency slots, resolving once one is free.
 * The returned function hands the slot straight to the next waiter rather
 * than decrementing, so the count can never drift above the cap.
 */
export async function acquireBuildSlot(): Promise<() => void> {
  if (!IS_BUILD) return () => {};
  if (buildInFlight >= BUILD_MAX_IN_FLIGHT) {
    await new Promise<void>((resolve) => buildWaiting.push(resolve));
  } else {
    buildInFlight += 1;
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const next = buildWaiting.shift();
    if (next) next();
    else buildInFlight -= 1;
  };
}

/**
 * How long to wait before a build-phase retry. 429s carry "Rate limit
 * exceeded, retry in N seconds" (or a Retry-After header) and are honoured
 * exactly; everything else backs off exponentially with jitter so a fleet of
 * prerender workers that all hit a saturated pool at once doesn't retry in
 * lockstep and saturate it again.
 */
function retryAfterMs(response: Response, message: string | undefined, attempt: number): number {
  const header = Number(response.headers.get("retry-after"));
  if (Number.isFinite(header) && header > 0) return Math.min(header * 1000, BUILD_RETRY_MAX_WAIT_MS);
  const parsed = message?.match(/retry in (\d+) second/i);
  if (parsed) return Math.min(Number(parsed[1]) * 1000, BUILD_RETRY_MAX_WAIT_MS);
  const backoff = BUILD_RETRY_BASE_MS * 2 ** attempt;
  return Math.min(backoff + Math.random() * backoff, BUILD_RETRY_MAX_WAIT_MS);
}

type ApiClientOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  cache?: RequestCache;
  credentials?: RequestCredentials;
  /** Abort the request after this many milliseconds (public content reads). */
  timeoutMs?: number;
  /** Call a Next.js Route Handler on the current origin (keeps httpOnly cookies on the site host). */
  sameOrigin?: boolean;
  /**
   * Next.js Data Cache hints. `revalidate` is seconds-to-stale; `tags` mark
   * the cache entry so `revalidateTag(tag)` can bust it from a server action
   * after an admin edit. Public reads should set this; admin reads should not.
   */
  revalidate?: number | false;
  tags?: string[];
};

export type ApiResult<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; message: string; status?: number };

export function hasPublicApiBaseUrl() {
  return Boolean(API_URL);
}

export async function apiRequest<T>(
  path: string,
  options: ApiClientOptions = {},
): Promise<ApiResult<T>> {
  const sameOrigin = Boolean(options.sameOrigin);
  let url: string;

  if (sameOrigin) {
    if (typeof window === "undefined") {
      return {
        ok: false,
        message: "Same-origin API calls must run in the browser",
      };
    }
    url = path.startsWith("/") ? path : `/${path}`;
  } else if (!API_URL) {
    return {
      ok: false,
      message: "Public API URL is not configured",
    };
  } else {
    url = `${API_URL}${path}`;
  }

  let controller: AbortController | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const startAttempt = () => {
    controller = options.timeoutMs ? new AbortController() : undefined;
    timeout =
      controller && options.timeoutMs
        ? setTimeout(() => controller?.abort(), options.timeoutMs)
        : undefined;
  };
  startAttempt();

  try {
    // Wire Next.js Data Cache when the caller passes revalidate/tags. Default
    // is still `no-store` so anything that doesn't opt in gets fresh data.
    const usesDataCache =
      options.revalidate !== undefined || (options.tags && options.tags.length > 0);
    const fetchInit: RequestInit & {
      next?: { revalidate?: number | false; tags?: string[] };
    } = {
      method: options.method ?? "GET",
      credentials: options.credentials,
      headers: {
        "Content-Type": "application/json",
        ...buildAuthHeaders(),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller?.signal,
    };
    if (usesDataCache) {
      fetchInit.next = {
        ...(options.revalidate !== undefined ? { revalidate: options.revalidate } : {}),
        ...(options.tags && options.tags.length > 0 ? { tags: options.tags } : {}),
      };
    } else {
      fetchInit.cache = options.cache ?? "no-store";
    }
    type ApiEnvelope = {
      ok?: boolean;
      data?: T;
      message?: string;
      details?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] };
    };

    const attemptOnce = async () => {
      const release = await acquireBuildSlot();
      // Start the abort timer only once a slot is actually held — otherwise
      // time spent queued behind other prerenders eats the request's own
      // budget and it aborts before it ever hits the network.
      if (timeout) clearTimeout(timeout);
      startAttempt();
      fetchInit.signal = controller?.signal;
      try {
        const res = await fetch(url, fetchInit);
        return { res, body: (await res.json()) as ApiEnvelope };
      } finally {
        release();
      }
    };

    let response: Response;
    let json: ApiEnvelope;

    // Build-phase only: a failed read here bakes missing content into a static
    // file, so it is worth waiting out. Never at runtime — a visitor's SSR must
    // not sit and wait on a struggling backend.
    //
    // Retries cover BOTH a retryable status AND a thrown attempt. The throw
    // case matters just as much: a saturated backend drops sockets and returns
    // truncated bodies, so `fetch`/`res.json()` reject outright and never
    // produce a status to inspect. Retrying only on status left that entire
    // failure class unhandled — it was the last thing failing builds.
    for (let attempt = 0; ; attempt++) {
      const isLast = attempt >= BUILD_RETRY_ATTEMPTS;
      try {
        const { res, body } = await attemptOnce();
        response = res;
        json = body;
        if (!IS_BUILD || isLast || !BUILD_RETRY_STATUSES.has(res.status)) break;
        const waitMs = retryAfterMs(res, body.message, attempt);
        console.warn(
          `[apiRequest][BUILD] ${res.status} on ${path} — retry ${attempt + 1}/${BUILD_RETRY_ATTEMPTS} in ${Math.round(waitMs / 1000)}s`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      } catch (err) {
        if (!IS_BUILD || isLast) throw err;
        const waitMs = Math.min(
          BUILD_RETRY_BASE_MS * 2 ** attempt * (1 + Math.random()),
          BUILD_RETRY_MAX_WAIT_MS,
        );
        console.warn(
          `[apiRequest][BUILD] threw on ${path} (${(err as Error)?.message ?? "unknown"}) — retry ${attempt + 1}/${BUILD_RETRY_ATTEMPTS} in ${Math.round(waitMs / 1000)}s`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
      if (timeout) clearTimeout(timeout);
      startAttempt();
      fetchInit.signal = controller?.signal;
    }

    if (!response.ok || !json.ok) {
      let message = json.message ?? "API request failed";
      const fieldErrors = json.details?.fieldErrors;
      if (fieldErrors && typeof fieldErrors === "object") {
        const firstFieldMessage = Object.values(fieldErrors)
          .flat()
          .find((entry): entry is string => typeof entry === "string" && entry.length > 0);
        if (firstFieldMessage) {
          message = firstFieldMessage;
        }
      }
      return {
        ok: false,
        status: response.status,
        message,
      };
    }

    return {
      ok: true,
      data: json.data as T,
      message: json.message,
    };
  } catch (err) {
    // Surface the real error in dev — silent `{ ok: false, message }`
    // makes "backend is unavailable" indistinguishable from a JSON
    // parse error or an AbortController timeout. The user-facing
    // message stays generic.
    if (process.env.NODE_ENV !== "production") {
      console.warn("[apiRequest] fetch failed", { path, err });
    }
    return {
      ok: false,
      message: "Backend is unavailable",
    };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
