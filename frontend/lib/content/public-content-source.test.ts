import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The module reads env at import time, so each case re-imports it under a
 * stubbed environment. Guards the two knobs that decide whether a degraded
 * build ships silently.
 */
async function load(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  return import("./public-content-source");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("PUBLIC_CONTENT_FETCH_TIMEOUT_MS", () => {
  it("stays tight at runtime so a slow backend never blocks a visitor's SSR", async () => {
    const m = await load({ NEXT_PHASE: undefined, NODE_ENV: "production" });
    expect(m.PUBLIC_CONTENT_FETCH_TIMEOUT_MS).toBe(4000);
  });

  it("is long during `next build` — losing the race bakes a thin page to disk", async () => {
    const m = await load({ NEXT_PHASE: "phase-production-build" });
    expect(m.PUBLIC_CONTENT_FETCH_TIMEOUT_MS).toBe(30_000);
  });

  it("honours PUBLIC_CONTENT_BUILD_TIMEOUT_MS, ignoring junk values", async () => {
    const ok = await load({
      NEXT_PHASE: "phase-production-build",
      PUBLIC_CONTENT_BUILD_TIMEOUT_MS: "60000",
    });
    expect(ok.PUBLIC_CONTENT_FETCH_TIMEOUT_MS).toBe(60_000);

    const junk = await load({
      NEXT_PHASE: "phase-production-build",
      PUBLIC_CONTENT_BUILD_TIMEOUT_MS: "soon",
    });
    expect(junk.PUBLIC_CONTENT_FETCH_TIMEOUT_MS).toBe(30_000);
  });
});

describe("logPublicContentFallback", () => {
  it("THROWS during a production build — a baked thin page is worse than a failed build", async () => {
    const m = await load({
      NEXT_PHASE: "phase-production-build",
      NODE_ENV: "production",
      ALLOW_DEGRADED_BUILD: undefined,
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => m.logPublicContentFallback("country-plans", "timeout")).toThrow(/Refusing to prerender/);
    expect(warn.mock.calls[0][0]).toContain("[BUILD]");
  });

  it("downgrades to a warning when ALLOW_DEGRADED_BUILD=1", async () => {
    const m = await load({
      NEXT_PHASE: "phase-production-build",
      NODE_ENV: "production",
      ALLOW_DEGRADED_BUILD: "1",
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => m.logPublicContentFallback("country-plans", "timeout")).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("warns in development", async () => {
    const m = await load({ NEXT_PHASE: undefined, NODE_ENV: "development" });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    m.logPublicContentFallback("country-plans", "timeout");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("stays quiet at production runtime — transient blips would flood the logs", async () => {
    const m = await load({ NEXT_PHASE: undefined, NODE_ENV: "production" });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    m.logPublicContentFallback("country-plans", "timeout");
    expect(warn).not.toHaveBeenCalled();
  });
});
