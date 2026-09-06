import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The module reads env at import time, so each case re-imports it under a
 * stubbed environment (same pattern as client.test.ts).
 */
const SECRET = "test-proxy-secret-0123456789abcdef";

async function load(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  return import("./client");
}

/** Captures the headers/urls apiRequest actually put on the wire. */
function stubFetch(
  responses: Array<{ status?: number; headers?: Record<string, string>; body?: unknown }>,
) {
  const calls: Array<{
    url: string;
    headers: Record<string, string>;
    cache?: string;
    next?: { revalidate?: number | false; tags?: string[] };
  }> = [];
  let i = 0;
  const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({
      url: String(url),
      headers: { ...((init.headers ?? {}) as Record<string, string>) },
      cache: init.cache as string | undefined,
      next: (init as RequestInit & { next?: { revalidate?: number | false; tags?: string[] } }).next,
    });
    const spec = responses[Math.min(i, responses.length - 1)];
    i += 1;
    return {
      status: spec.status ?? 200,
      ok: (spec.status ?? 200) < 400,
      headers: { get: (k: string) => spec.headers?.[k.toLowerCase()] ?? null },
      json: async () => spec.body ?? { ok: true, data: {} },
    } as unknown as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

const RUNTIME = {
  NEXT_PHASE: undefined,
  NEXT_PUBLIC_API_URL: "http://api.test",
  PROXY_CLIENT_IP_SECRET: SECRET,
};
const BUILD = { ...RUNTIME, NEXT_PHASE: "phase-production-build" };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("SSR auth headers — what is sent", () => {
  it("marks a runtime public content GET with x-gh-ssr and the shared secret", async () => {
    const m = await load(RUNTIME);
    const calls = stubFetch([{}]);
    await m.apiRequest("/api/countries/ie/services?kind=GENERAL", { revalidate: 60 });

    expect(calls[0].headers["x-gh-proxy-secret"]).toBe(SECRET);
    expect(calls[0].headers["x-gh-ssr"]).toBe("1");
    expect(calls[0].headers["x-gh-build"]).toBeUndefined();
  });

  it("covers every public read prefix", async () => {
    const m = await load(RUNTIME);
    const calls = stubFetch([{}]);
    for (const p of [
      "/api/countries",
      "/api/public/countries/ie/trust",
      "/api/doctors",
      "/api/services/some-slug?countryCode=ie",
      "/api/specialties",
      "/api/health-tests/full-blood-count",
      "/api/assets",
      "/api/blog?countryCode=ie",
    ]) {
      await m.apiRequest(p, { revalidate: 60 });
    }
    for (const c of calls) expect(c.headers["x-gh-ssr"]).toBe("1");
  });

  it("keeps build reads on x-gh-build, never x-gh-ssr", async () => {
    const m = await load(BUILD);
    const calls = stubFetch([{}]);
    await m.apiRequest("/api/countries", { revalidate: 60 });

    expect(calls[0].headers["x-gh-build"]).toBe("1");
    expect(calls[0].headers["x-gh-proxy-secret"]).toBe(SECRET);
    expect(calls[0].headers["x-gh-ssr"]).toBeUndefined();
  });
});

describe("SSR auth headers — what is NOT sent", () => {
  it("never sends the secret on a mutation, even to a public path", async () => {
    const m = await load(RUNTIME);
    const calls = stubFetch([{}]);
    for (const method of ["POST", "PATCH", "PUT", "DELETE"] as const) {
      await m.apiRequest("/api/services/x", { method, body: {}, revalidate: 60 });
    }
    for (const c of calls) {
      expect(c.headers["x-gh-proxy-secret"]).toBeUndefined();
      expect(c.headers["x-gh-ssr"]).toBeUndefined();
    }
  });

  it("never sends the secret to private / authenticated / money endpoints", async () => {
    const m = await load(RUNTIME);
    const calls = stubFetch([{}]);
    for (const p of [
      "/api/auth/session",
      "/api/me/subscription",
      "/api/account/profile",
      "/api/admin/users",
      "/api/doctor/consultations",
      "/api/corporate/invites",
      "/api/payments/webhook",
      "/api/cart",
      "/api/orders",
    ]) {
      await m.apiRequest(p, { revalidate: 60 });
    }
    for (const c of calls) {
      expect(c.headers["x-gh-proxy-secret"], c.url).toBeUndefined();
      expect(c.headers["x-gh-ssr"], c.url).toBeUndefined();
    }
  });

  it("does not let a prefix string open an adjacent private route", async () => {
    const m = await load(RUNTIME);
    const calls = stubFetch([{}]);
    // "/api/doctors" must not open "/api/doctor/…"; no partial-word matches.
    for (const p of ["/api/doctor/patients", "/api/countries-private", "/api/assetsx", "/api/blogger"]) {
      await m.apiRequest(p, { revalidate: 60 });
    }
    for (const c of calls) expect(c.headers["x-gh-proxy-secret"], c.url).toBeUndefined();
  });

  it("sends nothing when no secret is configured", async () => {
    const m = await load({ ...RUNTIME, PROXY_CLIENT_IP_SECRET: undefined });
    const calls = stubFetch([{}]);
    await m.apiRequest("/api/countries", { revalidate: 60 });
    expect(calls[0].headers["x-gh-proxy-secret"]).toBeUndefined();
    expect(calls[0].headers["x-gh-ssr"]).toBeUndefined();
  });

  it("refuses to emit the secret from a browser context", async () => {
    // Belt-and-braces on top of the real guarantee (PROXY_CLIENT_IP_SECRET is
    // not NEXT_PUBLIC_*, so Next never inlines it into a client bundle and the
    // value is `undefined` in the browser). This asserts the code ALSO refuses
    // on `typeof window !== "undefined"`, so a future bundling change cannot
    // silently start shipping it.
    const m = await load(RUNTIME);
    const calls = stubFetch([{}]);
    vi.stubGlobal("window", {} as unknown as Window);
    await m.apiRequest("/api/countries", { revalidate: 60 });
    expect(calls[0].headers["x-gh-proxy-secret"]).toBeUndefined();
    expect(calls[0].headers["x-gh-ssr"]).toBeUndefined();
  });
});

describe("runtime 429 handling", () => {
  const rateLimited = {
    status: 429,
    headers: { "retry-after": "47" },
    body: { ok: false, message: "Rate limit exceeded, retry in 47 seconds" },
  };

  it("does NOT retry a quota 429 whose wait exceeds the 1s runtime budget", async () => {
    const m = await load(RUNTIME);
    const calls = stubFetch([rateLimited]);
    const res = await m.apiRequest("/api/countries", { revalidate: 60 });

    expect(calls).toHaveLength(1); // was 2 before this fix
    expect(res.ok).toBe(false);
    expect((res as { status?: number }).status).toBe(429);
  });

  it("does NOT retry a 429 that names no wait at all", async () => {
    const m = await load(RUNTIME);
    const calls = stubFetch([{ status: 429, body: { ok: false, message: "Too many requests" } }]);
    await m.apiRequest("/api/countries", { revalidate: 60 });
    expect(calls).toHaveLength(1);
  });

  it("DOES retry a 429 whose stated wait fits the budget (tail of a rolling window)", async () => {
    const m = await load(RUNTIME);
    const calls = stubFetch([
      { status: 429, headers: { "retry-after": "1" }, body: { ok: false, message: "retry in 1 second" } },
      { status: 200, body: { ok: true, data: { hi: true } } },
    ]);
    const res = await m.apiRequest("/api/countries", { revalidate: 60 });

    expect(calls).toHaveLength(2);
    expect(calls[1].cache).toBe("no-store"); // retry must bypass the Data Cache
    expect(calls[1].headers["x-gh-build-retry"]).toBeUndefined();
    expect(res.ok).toBe(true);
  });

  it("still retries a 5xx — those clear on their own, unlike a quota", async () => {
    const m = await load(RUNTIME);
    const calls = stubFetch([
      { status: 503, body: { ok: false, message: "Service data is unavailable" } },
      { status: 200, body: { ok: true, data: {} } },
    ]);
    const res = await m.apiRequest("/api/countries", { revalidate: 60 });

    expect(calls).toHaveLength(2);
    expect(res.ok).toBe(true);
  });

  it("leaves build-phase 429 retry semantics untouched", async () => {
    // Same long Retry-After that makes the RUNTIME path give up immediately.
    // A build clamps it to its own 20s cap and still runs the full 5-attempt
    // ladder, so the new guard must be phase-gated, not global. Fake timers so
    // the assertion doesn't cost ~95s of real backoff.
    const m = await load(BUILD);
    const calls = stubFetch([rateLimited]);
    vi.useFakeTimers();
    try {
      const pending = m.apiRequest("/api/countries", { revalidate: 60 });
      await vi.advanceTimersByTimeAsync(200_000);
      await pending;
    } finally {
      vi.useRealTimers();
    }
    expect(calls).toHaveLength(6); // first attempt + BUILD_RETRY_ATTEMPTS (5)
  });

  it("keeps build retries static-compatible while bypassing a cached 503", async () => {
    const m = await load(BUILD);
    const calls = stubFetch([
      { status: 503, body: { ok: false, message: "Blog data is unavailable" } },
      { status: 200, body: { ok: true, data: { posts: [] } } },
    ]);
    vi.useFakeTimers();
    try {
      const pending = m.apiRequest("/api/blog?countryCode=ro&locale=DE", {
        revalidate: 60,
        tags: ["public-blog"],
      });
      await vi.advanceTimersByTimeAsync(10_000);
      await expect(pending).resolves.toMatchObject({ ok: true });
    } finally {
      vi.useRealTimers();
    }

    expect(calls).toHaveLength(2);
    expect(calls[0].headers["x-gh-build-retry"]).toBeUndefined();
    expect(calls[1].cache).toBeUndefined();
    expect(calls[1].next).toEqual({ revalidate: 60, tags: ["public-blog"] });
    expect(calls[1].headers["x-gh-build-retry"]).toBe("1");
  });

  it("does not retry a non-public read (no Data Cache opt-in)", async () => {
    const m = await load(RUNTIME);
    const calls = stubFetch([rateLimited]);
    await m.apiRequest("/api/admin/users", {});
    expect(calls).toHaveLength(1);
  });
});
