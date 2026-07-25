const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

/**
 * True only inside `next build`, on the server. Next sets NEXT_PHASE for the
 * whole build process; the `window` guard is belt-and-braces so none of the
 * build-only behaviour below can be reached from a browser bundle.
 */
const IS_BUILD = typeof window === "undefined" && process.env.NEXT_PHASE === "phase-production-build";

/** Ceiling on build-phase 429 backoff, so one throttled endpoint can't stall a build. */
const BUILD_RETRY_MAX_WAIT_MS = 20_000;
const BUILD_RETRY_ATTEMPTS = 2;

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

/** Backend 429s carry "Rate limit exceeded, retry in N seconds"; Retry-After is the standard header. */
function retryAfterMs(response: Response, message: string | undefined): number {
  const header = Number(response.headers.get("retry-after"));
  if (Number.isFinite(header) && header > 0) return Math.min(header * 1000, BUILD_RETRY_MAX_WAIT_MS);
  const parsed = message?.match(/retry in (\d+) second/i);
  if (parsed) return Math.min(Number(parsed[1]) * 1000, BUILD_RETRY_MAX_WAIT_MS);
  return 1000;
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

    let response = await fetch(url, fetchInit);
    let json = (await response.json()) as ApiEnvelope;

    // Build-phase only: a 429 here would bake missing content into a static
    // file, so it is worth waiting out. Never at runtime — a visitor's SSR
    // must not sit and wait on a throttled backend.
    for (let attempt = 0; IS_BUILD && response.status === 429 && attempt < BUILD_RETRY_ATTEMPTS; attempt++) {
      const waitMs = retryAfterMs(response, json.message);
      console.warn(`[apiRequest][BUILD] 429 on ${path} — retrying in ${Math.round(waitMs / 1000)}s`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      if (timeout) clearTimeout(timeout);
      startAttempt();
      fetchInit.signal = controller?.signal;
      response = await fetch(url, fetchInit);
      json = (await response.json()) as ApiEnvelope;
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
