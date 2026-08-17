const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

/**
 * True only inside `next build`, on the server. Next sets NEXT_PHASE for the
 * whole build process; the `window` guard is belt-and-braces so none of the
 * build-only behaviour below can be reached from a browser bundle.
 */
const IS_BUILD = typeof window === "undefined" && process.env.NEXT_PHASE === "phase-production-build";

/** Ceiling on build-phase backoff, so one bad endpoint can't stall a build. */
const BUILD_RETRY_MAX_WAIT_MS = 20_000;
// 5 attempts at 1/2/4/8/16s. A 3-attempt ladder topping out around 6s total
// was too short to ride out build-time contention that clears on its own, and
// failed builds on it. Build-phase only — see RUNTIME_RETRY_ATTEMPTS below for
// why the runtime ladder is one attempt and excludes 429.
const BUILD_RETRY_ATTEMPTS = 5;
const BUILD_RETRY_BASE_MS = 1_000;

/**
 * Runtime retry budget for PUBLIC READS (see `isPublicRead` below).
 *
 * Deliberately tiny — one extra attempt, sub-second wait — because a visitor
 * is waiting. The point is not to wait out a long outage; it is that a single
 * dropped socket or one 5xx must not be the reason a real content URL renders
 * `notFound()` and tells Google the page is gone (SEO audit 2026-08-07: 216 of
 * 1,724 sitemap URLs hard-404'd under an 8-concurrent cold crawl; the same
 * URLs were fine sequentially).
 *
 * This budget is why 429 is excluded from the retry at runtime — see
 * `shouldRetry429`. One second cannot outwait a 60-second quota window, so
 * spending the attempt measurably never helped and doubled backend load.
 */
const RUNTIME_RETRY_ATTEMPTS = 1;
const RUNTIME_RETRY_BASE_MS = 150;
const RUNTIME_RETRY_MAX_WAIT_MS = 1_000;

/**
 * A response status where the backend did NOT confirm an answer — the request
 * can succeed on a retry, and callers must never read absence into it.
 *   429     — rate limited (see backend/src/app.ts). Classified transient for
 *             the CALLER's benefit (never read as "gone"), but NOT retried at
 *             runtime — see `shouldRetry429`.
 *   5xx     — a 500 from an unexpected route error, or the 503 the backend
 *             returns when a Prisma call reports the database unavailable.
 * Everything else (404 "not found", 400 "invalid slug", 403) is a settled
 * answer that a retry would only repeat.
 */
export function isTransientStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * Anonymous public content GETs — the ONLY paths that may carry the shared
 * proxy secret from here. Must stay in lockstep with `PUBLIC_READ_PREFIXES`
 * in backend/src/utils/rate-limit-trust.ts; a path this list lets through but
 * the backend's does not simply falls back to the shared visitor bucket.
 *
 * Never a mutation, never /api/auth|me|account|admin|doctor|corporate|payments.
 * Matching is exact-or-`/`-delimited so `/api/doctors` cannot match the
 * private `/api/doctor/...` routes.
 */
const PUBLIC_READ_PREFIXES = [
  "/api/countries",
  "/api/public/countries",
  "/api/doctors",
  "/api/services",
  "/api/specialties",
  "/api/health-tests",
  "/api/assets",
  "/api/blog",
  "/api/blog-posts",
  "/api/pricing",
  // Read by the root layout of every public page — see the matching note in
  // backend/src/utils/rate-limit-trust.ts for why this one was added.
  "/api/public/reviews-config",
  // TRUST-METRIC-001 — same class as reviews-config above.
  "/api/public/consultation-count",
];

function isPublicReadPath(path: string): boolean {
  const bare = path.split("?")[0] ?? "";
  return PUBLIC_READ_PREFIXES.some((p) => bare === p || bare.startsWith(`${p}/`));
}

let warnedNoBuildSecret = false;
let warnedNoSsrSecret = false;

/**
 * Authenticates SERVER-SIDE public content reads to the backend so they get a
 * bucket of their own instead of sharing the frontend egress IP's 300/min one
 * (backend/src/app.ts + utils/rate-limit-trust.ts).
 *
 *   build phase  → `x-gh-build: 1` → `gh-build`, 20,000/min. Unchanged.
 *   runtime SSR  → `x-gh-ssr: 1`   → `gh-ssr`, RATE_LIMIT_SSR_MAX (3,000/min).
 *
 * Why runtime needs it at all (measured 2026-08-08): one cold service-page
 * render issues 12 backend GETs, and keeping 6 markets x 6 locales warm costs
 * ~288/min in layout reads alone — so the shared 300/min bucket was exhausted
 * before any content page was served. Every SSR read across the whole site
 * shared it, because these headers were previously build-only. The resulting
 * 429 reaches `assertAbsenceConfirmed` as TEMPORARY_FAILURE and renders a 5xx
 * on a real content URL. Reproduced end to end, then fixed by this split.
 *
 * Exported because several public content getters (country footer/trust, the
 * availability reads) call `fetch` directly against `getBackendOrigin()`
 * rather than going through `apiRequest`. They are the same class of read and
 * need the same bucket — without it they silently degrade to empty content
 * under crawl load instead of 5xx, which is harder to notice, not better.
 *
 * Three independent gates keep the secret off the wire everywhere else:
 * PROXY_CLIENT_IP_SECRET is not NEXT_PUBLIC_*, so it is never inlined into a
 * client bundle; the `window` check refuses to run in a browser at all; and
 * the method + path allowlist means even a server caller only ever sends it to
 * anonymous public content GETs.
 */
export function serverReadAuthHeaders(path: string, method: string): Record<string, string> {
  if (typeof window !== "undefined") return {};
  if (method !== "GET") return {};
  if (!isPublicReadPath(path)) return {};

  const secret = process.env.PROXY_CLIENT_IP_SECRET?.trim();
  if (!secret) {
    // Returning {} silently is the worst failure mode here: the caller just
    // falls back to the shared 300/min bucket and 429s, far from the cause.
    // Say it once, per phase, so the log names it.
    if (IS_BUILD && !warnedNoBuildSecret) {
      warnedNoBuildSecret = true;
      console.warn(
        "[apiRequest][BUILD] PROXY_CLIENT_IP_SECRET is not set for this build. " +
          "Build reads will NOT get the raised rate-limit ceiling and will likely 429. " +
          "Set it as a build-visible variable on the frontend service.",
      );
    } else if (!IS_BUILD && !warnedNoSsrSecret) {
      warnedNoSsrSecret = true;
      console.warn(
        "[apiRequest] PROXY_CLIENT_IP_SECRET is not set at runtime. Server-side " +
          "public content reads will share the egress IP's 300/min bucket and will " +
          "429 under crawl load, surfacing as 5xx on real content URLs. " +
          "Set it on the frontend service (same value as the backend).",
      );
    }
    return {};
  }
  return IS_BUILD
    ? { "x-gh-proxy-secret": secret, "x-gh-build": "1" }
    : { "x-gh-proxy-secret": secret, "x-gh-ssr": "1" };
}

/**
 * Build-phase in-flight request cap, per prerender worker process.
 *
 * Once the backend raised the ceiling for authenticated build reads, builds
 * still failed with "…data is unavailable" — attributed at the time to the
 * backend's `pg` pool (`max: 10`, 5s `connectionTimeoutMillis`) being
 * saturated by ~15 workers each firing 5+ parallel content reads. This cap
 * bounds that demand: `cpus` (frontend/next.config.ts) x this cap is the
 * build's total concurrent load, and the defaults (4 x 2 = 8) sit under 10.
 *
 * CAVEAT, so this comment doesn't misdirect the next investigation. The pool
 * attribution above was never measured; it was inferred. The 2026-08-08
 * capacity investigation measured the RUNTIME path directly and found the pool
 * was not the constraint there at all: with the rate limiter bypassed, the
 * backend sustained 110-120 req/s with ZERO 5xx up to 64 concurrent, `pg`
 * totalCount pinned at 10 with no acquisition failure, and every observed
 * error was a rate-limit 429. That measurement says nothing about the build
 * phase, which has a different concurrency shape — so this cap stays. Treat
 * "the pool is the bottleneck" as an open question, not an established fact,
 * and measure before acting on it.
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
 * Next's own "this route can't be static" signal, thrown by an uncached fetch
 * during prerender. Matched by digest/name rather than by importing Next's
 * internal error class, which is not part of its public surface.
 */
function isDynamicServerError(error: unknown): boolean {
  const candidate = error as { digest?: unknown; name?: string; message?: string } | null;
  if (!candidate) return false;
  if (typeof candidate.digest === "string" && candidate.digest.startsWith("DYNAMIC_SERVER_USAGE")) {
    return true;
  }
  if (candidate.name === "DynamicServerError") return true;
  return typeof candidate.message === "string" && candidate.message.includes("Dynamic server usage");
}

/**
 * How long to wait before a retry. 429s carry "Rate limit exceeded, retry in N
 * seconds" (or a Retry-After header) and are honoured exactly; everything else
 * backs off exponentially with jitter so a fleet of prerender workers that all
 * hit a saturated pool at once doesn't retry in lockstep and saturate it again.
 *
 * `capMs` is the whole difference between the two phases: a build can afford
 * to sit out 20s, a visitor's TTFB cannot, so the runtime cap is 1s.
 */
function retryAfterMs(
  response: Response,
  message: string | undefined,
  attempt: number,
  baseMs: number,
  capMs: number,
): number {
  const asked = serverRequestedWaitMs(response, message);
  if (asked !== null) return Math.min(asked, capMs);
  const backoff = baseMs * 2 ** attempt;
  return Math.min(backoff + Math.random() * backoff, capMs);
}

/**
 * The wait the server EXPLICITLY asked for, in ms, uncapped — or null when it
 * named none. Distinct from `retryAfterMs` above, which clamps to the phase's
 * budget: to decide whether a retry can succeed at all we need the number the
 * server actually stated, not the one we can afford.
 */
function serverRequestedWaitMs(response: Response, message: string | undefined): number | null {
  const header = Number(response.headers.get("retry-after"));
  if (Number.isFinite(header) && header > 0) return header * 1000;
  const parsed = message?.match(/retry in (\d+) second/i);
  if (parsed) return Number(parsed[1]) * 1000;
  return null;
}

/**
 * Should a runtime 429 be retried at all?
 *
 * A 429 from the backend is a QUOTA rejection on a fixed 60s window, not a
 * transient blip. The runtime retry budget is one attempt capped at 1s
 * (`RUNTIME_RETRY_MAX_WAIT_MS`), so a retry lands inside the SAME exhausted
 * window it was rejected by. Measured 2026-08-08: successful retries after a
 * quota 429 = 0%, while the retry itself turned one failing resource into 4
 * upstream calls (2 logical reads x 2 attempts) — load added to the backend
 * during precisely the event that saturated it.
 *
 * So only retry when the server named a wait the budget can actually cover
 * (e.g. "retry in 1 second", the tail of a rolling window). No stated wait
 * means no evidence the retry can land, so don't spend it. Non-429 transients
 * (5xx, timeout, dropped socket) are unaffected — those DO clear on their own
 * and keep their retry.
 */
function shouldRetry429(response: Response, message: string | undefined, capMs: number): boolean {
  const asked = serverRequestedWaitMs(response, message);
  return asked !== null && asked <= capMs;
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
        ...serverReadAuthHeaders(path, options.method ?? "GET"),
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

    /**
     * Public content reads: GET + an explicit Data Cache opt-in. That pairing
     * is already this file's documented public/admin split (see the
     * `revalidate`/`tags` option docs) — public reads set it, admin reads and
     * every mutation do not. So gating the runtime retry on it retries exactly
     * the reads whose failure would otherwise render a false 404, and changes
     * no write/mutation semantics at all.
     */
    const isPublicRead = (options.method ?? "GET") === "GET" && usesDataCache;
    const maxRetries = IS_BUILD
      ? BUILD_RETRY_ATTEMPTS
      : isPublicRead
        ? RUNTIME_RETRY_ATTEMPTS
        : 0;
    const retryBaseMs = IS_BUILD ? BUILD_RETRY_BASE_MS : RUNTIME_RETRY_BASE_MS;
    const retryCapMs = IS_BUILD ? BUILD_RETRY_MAX_WAIT_MS : RUNTIME_RETRY_MAX_WAIT_MS;

    // A failed read bakes missing content into a static file during a build,
    // and renders a false "not found" at runtime. Both are worth one more go.
    //
    // Retries cover BOTH a retryable status AND a thrown attempt. The throw
    // case matters just as much: a saturated backend drops sockets and returns
    // truncated bodies, so `fetch`/`res.json()` reject outright and never
    // produce a status to inspect. Retrying only on status left that entire
    // failure class unhandled — it was the last thing failing builds.
    for (let attempt = 0; ; attempt++) {
      const isLast = attempt >= maxRetries;
      try {
        const { res, body } = await attemptOnce();
        response = res;
        json = body;
        if (isLast || !isTransientStatus(res.status)) break;
        // A runtime quota 429 the budget cannot outwait: stop now and let the
        // caller surface TEMPORARY_FAILURE, rather than spending an attempt
        // that measurably never succeeds and doubles load on a saturated
        // backend. Build phase keeps its existing 5-attempt/20s ladder — it
        // has a budget wide enough for a real window and nobody is waiting.
        if (!IS_BUILD && res.status === 429 && !shouldRetry429(res, body.message, retryCapMs)) {
          break;
        }
        const waitMs = retryAfterMs(res, body.message, attempt, retryBaseMs, retryCapMs);
        if (IS_BUILD) {
          console.warn(
            `[apiRequest][BUILD] ${res.status} on ${path} — retry ${attempt + 1}/${maxRetries} in ${Math.round(waitMs / 1000)}s`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      } catch (err) {
        if (isLast) throw err;
        // A DynamicServerError is not a transient blip — it is Next refusing an
        // uncached fetch inside a static render, which is exactly what the
        // `no-store` retry below turns every subsequent attempt into. Retrying
        // it can never succeed, and it REPLACES the real first error (a
        // truncated response, a 429) with itself in every later log line, so
        // the build reports the symptom and buries the cause. Rethrow at once.
        if (isDynamicServerError(err)) throw err;
        const waitMs = Math.min(retryBaseMs * 2 ** attempt * (1 + Math.random()), retryCapMs);
        if (IS_BUILD) {
          console.warn(
            `[apiRequest][BUILD] threw on ${path} (${(err as Error)?.message ?? "unknown"}) — retry ${attempt + 1}/${maxRetries} in ${Math.round(waitMs / 1000)}s`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
      // A retry MUST bypass the Next.js Data Cache. Next stores whatever the
      // upstream returned — a 503 body included — under this URL's cache entry
      // for the full `revalidate` window, so a cache-honouring retry would
      // replay the same 503 from disk without ever touching the network and
      // the retry would be pure latency. Dropping to `no-store` for the retry
      // is what makes it able to observe recovery at all.
      delete fetchInit.next;
      fetchInit.cache = "no-store";
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
