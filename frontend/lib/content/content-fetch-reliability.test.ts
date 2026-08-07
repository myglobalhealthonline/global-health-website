import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * P0 transient-404 reliability (SEO audit 2026-08-07).
 *
 * An 8-concurrent cold crawl of the sitemap made 216 of 1,724 valid URLs
 * return a hard 404; sequentially the same URLs were fine. Cause: every
 * unsuccessful backend read — timeout, 429, 5xx included — collapsed to `null`
 * in the content layer, and the route read `null` as "does not exist" and
 * called `notFound()`.
 *
 * These tests pin the contract the three single-resource getters now hold:
 *
 *   FOUND              → resolves to the record          → route renders 200
 *   NOT_FOUND          → resolves to `null`              → route calls notFound() → 404
 *   TEMPORARY_FAILURE  → throws PublicContentUnavailableError
 *                        → uncaught in the RSC           → 5xx, never 404
 *
 * The route side of that mapping is a single `if (!detail) notFound()` in each
 * of the three page files, with nothing catching the throw (no `error.tsx`
 * exists anywhere in the public route tree), so asserting the getter contract
 * is what actually needs guarding here.
 */

const API_URL = "http://backend.test";

type Getters = typeof import("@/lib/content/get-country-collections");
type Source = typeof import("@/lib/content/public-content-source");

let getters: Getters;
let PublicContentUnavailableError: Source["PublicContentUnavailableError"];

beforeAll(async () => {
  // client.ts reads NEXT_PUBLIC_API_URL at module scope, so it has to be set
  // before the first import — hence the dynamic imports.
  vi.stubEnv("NEXT_PUBLIC_API_URL", API_URL);
  getters = await import("@/lib/content/get-country-collections");
  ({ PublicContentUnavailableError } = await import("@/lib/content/public-content-source"));
});

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  // apiRequest logs the real error outside production; keep the run readable.
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** A JSON envelope in the backend's `okResponse`/`errorResponse` shape. */
function json(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

const ok = (data: unknown) => json(200, { ok: true, data });
const notFound = (message: string) => json(404, { ok: false, message });
const serverError = () => json(500, { ok: false, message: "Unexpected service error" });
const unavailable = () => json(503, { ok: false, message: "Service data is unavailable" });
/** No Retry-After: the ladder must fall back to its own bounded backoff. */
const rateLimited = () => json(429, { ok: false, message: "Rate limit exceeded" });

/** What `fetch` rejects with when the AbortController timeout fires. */
function abortError() {
  const err = new Error("The operation was aborted.");
  err.name = "AbortError";
  return err;
}

/**
 * The three affected route families, each with the envelope key its backend
 * detail route returns and a minimal valid record.
 */
const FAMILIES = [
  {
    name: "service detail (/{country}/{lang}/services/{serviceSlug})",
    call: (slug: string) => getters.getCountryServiceDetail("ie", slug, "en"),
    payload: { service: { id: "svc_1", slug: "seed", name: "General consultation" } },
    expectSlug: (v: unknown) => (v as { name: string }).name === "General consultation",
  },
  {
    name: "lab test detail (/{country}/{lang}/tests/{testSlug})",
    call: (slug: string) => getters.getCountryHealthTestDetail("ie", slug, "en"),
    payload: { healthTest: { id: "ht_1", slug: "seed", title: "Vitamin D" } },
    expectSlug: (v: unknown) => (v as { title: string }).title === "Vitamin D",
  },
  {
    name: "health landing page (/{country}/{lang}/health/{slug})",
    call: (slug: string) => getters.getCountryLandingPage("ie", slug, "en"),
    payload: { page: { slug: "seed", title: "Flu symptoms" } },
    expectSlug: (v: unknown) => (v as { title: string }).title === "Flu symptoms",
  },
] as const;

describe.each(FAMILIES)("$name", (family) => {
  // React `cache()` wraps each getter. It no-ops without a request-scoped
  // dispatcher, but a distinct slug per case keeps that from ever mattering.
  let n = 0;
  const slug = () => `slug-${(n += 1)}`;

  it("A. backend 200 → record (page renders 200)", async () => {
    fetchMock.mockResolvedValueOnce(ok(family.payload));
    const result = await family.call(slug());
    expect(result).not.toBeNull();
    expect(family.expectSlug(result)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("B. backend genuine 404 → null (page calls notFound() → 404)", async () => {
    fetchMock.mockResolvedValueOnce(notFound("Service not found"));
    await expect(family.call(slug())).resolves.toBeNull();
    // A settled answer: retrying it would only repeat it.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("C. backend 500 then 200 → retries, returns the record", async () => {
    fetchMock.mockResolvedValueOnce(serverError()).mockResolvedValueOnce(ok(family.payload));
    const result = await family.call(slug());
    expect(result).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("D. backend timeout then 200 → retries, returns the record", async () => {
    fetchMock.mockRejectedValueOnce(abortError()).mockResolvedValueOnce(ok(family.payload));
    const result = await family.call(slug());
    expect(result).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("E. repeated 500 → throws (temporary server error, NOT 404)", async () => {
    fetchMock.mockResolvedValue(serverError());
    await expect(family.call(slug())).rejects.toBeInstanceOf(PublicContentUnavailableError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("E2. repeated 503 → throws (temporary server error, NOT 404)", async () => {
    fetchMock.mockResolvedValue(unavailable());
    await expect(family.call(slug())).rejects.toBeInstanceOf(PublicContentUnavailableError);
  });

  it("F. repeated timeout → throws (temporary server error, NOT 404)", async () => {
    fetchMock.mockRejectedValue(abortError());
    await expect(family.call(slug())).rejects.toBeInstanceOf(PublicContentUnavailableError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("F2. repeated network failure → throws (NOT 404)", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    await expect(family.call(slug())).rejects.toBeInstanceOf(PublicContentUnavailableError);
  });

  it("G. backend 429 then 200 → retries, returns the record", async () => {
    fetchMock.mockResolvedValueOnce(rateLimited()).mockResolvedValueOnce(ok(family.payload));
    const result = await family.call(slug());
    expect(result).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("200 with no usable record → throws, never a silent 404", async () => {
    fetchMock.mockResolvedValue(ok({}));
    await expect(family.call(slug())).rejects.toBeInstanceOf(PublicContentUnavailableError);
  });
});

describe("retry mechanics", () => {
  it("bypasses the Next Data Cache on the retry", async () => {
    // Next stores the 503 body under this URL's cache entry for the whole
    // revalidate window, so a cache-honouring retry would replay it from disk
    // and never observe recovery.
    // apiRequest mutates ONE init object across attempts, so the flags have to
    // be snapshotted as each call happens rather than read back afterwards.
    const seen: Array<{ next: unknown; cache: unknown }> = [];
    const responses = [unavailable(), ok({ service: { id: "s", slug: "s", name: "S" } })];
    fetchMock.mockImplementation((_url: string, init: { next?: unknown; cache?: unknown }) => {
      seen.push({ next: init.next, cache: init.cache });
      return Promise.resolve(responses[seen.length - 1]);
    });
    await getters.getCountryServiceDetail("ie", "cache-bypass", "en");

    expect(seen).toHaveLength(2);
    expect(seen[0].next).toBeDefined();
    expect(seen[1].next).toBeUndefined();
    expect(seen[1].cache).toBe("no-store");
  });

  it("keeps the runtime retry wait sub-second even when told to wait 30s", async () => {
    fetchMock
      .mockResolvedValueOnce(json(429, { ok: false, message: "Rate limit exceeded" }, { "retry-after": "30" }))
      .mockResolvedValueOnce(ok({ service: { id: "s", slug: "s", name: "S" } }));
    const started = Date.now();
    await getters.getCountryServiceDetail("ie", "retry-after-cap", "en");
    // Runtime cap is 1s. A visitor's TTFB is the constraint the build phase
    // does not have.
    expect(Date.now() - started).toBeLessThan(1_500);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a mutation", async () => {
    const { apiRequest } = await import("@/lib/api/client");
    fetchMock.mockResolvedValue(serverError());
    const res = await apiRequest("/api/orders", { method: "POST", body: { a: 1 } });
    expect(res.ok).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry a deterministic 4xx", async () => {
    fetchMock.mockResolvedValue(json(400, { ok: false, message: "Invalid slug" }));
    await expect(getters.getCountryServiceDetail("ie", "bad-slug", "en")).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
