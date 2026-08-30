import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

/**
 * The SSR/build public-read allowlist is duplicated on purpose: the frontend
 * decides whether to SEND the trusted-read header, the backend decides whether
 * to HONOUR it. A path present in only one list silently falls back to the
 * shared 300/min egress-IP visitor bucket — which is exactly how
 * `/api/public/gp-availability` and `/api/public/gp-languages` ended up
 * 429-exposed under crawl and deploy load. These tests pin the lockstep.
 *
 * Both lists are read as source text because neither is exported.
 */

const ROOT = join(__dirname, "../..", "..");

function extractPrefixes(file: string, marker: string): string[] {
  const source = readFileSync(join(ROOT, file), "utf8");
  const start = source.indexOf(marker);
  expect(start, `${marker} not found in ${file}`).toBeGreaterThan(-1);
  // The backend list closes with `] as const;`, the frontend one with `];`.
  const end = source.indexOf("\n]", start);
  expect(end, `unterminated array in ${file}`).toBeGreaterThan(start);
  return [...source.slice(start, end).matchAll(/"(\/api\/[^"]+)"/g)].map((m) => m[1]!);
}

describe("public read allowlist lockstep", () => {
  const frontend = extractPrefixes("frontend/lib/api/client.ts", "const PUBLIC_READ_PREFIXES = [");
  const backend = extractPrefixes(
    "backend/src/utils/rate-limit-trust.ts",
    "export const PUBLIC_READ_PREFIXES = [",
  );

  it("lists the same paths on both sides, in the same order", () => {
    expect(frontend).toEqual(backend);
  });

  it("covers both same-day GP endpoints", () => {
    for (const path of ["/api/public/gp-availability", "/api/public/gp-languages"]) {
      expect(frontend).toContain(path);
      expect(backend).toContain(path);
    }
  });

  it("never allowlists an authenticated or mutating surface", () => {
    for (const path of frontend) {
      expect(path).not.toMatch(/^\/api\/(auth|me|account|admin|doctor\/|corporate|payments)/);
    }
  });
});

describe("gp-availability route contract", () => {
  it("keeps the { ok, data } envelope and marks the response no-store", async () => {
    vi.doMock("@/lib/content/get-gp-availability", () => ({
      getGpAvailability: async () => ({
        service: { id: "svc-1" },
        clinicTimezone: "Europe/Dublin",
        slots: [{ startsAt: "2026-09-01T09:00:00.000Z" }],
        bookability: { state: "BOOKABLE", reasonCode: null, nextAvailableAt: null },
      }),
    }));
    const { GET } = await import("@/app/api/public/gp-availability/route");
    const { NextRequest } = await import("next/server");

    const res = await GET(
      new NextRequest("http://localhost/api/public/gp-availability?country=ie&language=English"),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(["data", "ok"]);
    expect(body.ok).toBe(true);
    expect(Object.keys(body.data).sort()).toEqual([
      "bookability",
      "clinicTimezone",
      "service",
      "slots",
    ]);
  });

  it("still 400s a request with no country or language", async () => {
    const { GET } = await import("@/app/api/public/gp-availability/route");
    const { NextRequest } = await import("next/server");
    const res = await GET(new NextRequest("http://localhost/api/public/gp-availability"));
    expect(res.status).toBe(400);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});
