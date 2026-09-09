import { gunzipSync } from "node:zlib";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { acceptsGzip, jsonAvailabilityResponse } from "./json-availability-response";

describe("acceptsGzip", () => {
  it("honours gzip quality values", () => {
    expect(acceptsGzip("br, gzip;q=0.8")).toBe(true);
    expect(acceptsGzip("gzip;q=0, br")).toBe(false);
    expect(acceptsGzip("GZip")).toBe(true);
  });

  it("gzip-compresses the exact non-cacheable envelope only when accepted", async () => {
    const body = { ok: true, data: { slots: [{ startAt: "2026-09-09T09:00:00Z" }] } };
    const gzip = jsonAvailabilityResponse(
      new NextRequest("https://example.test/api/public/gp-availability", {
        headers: { "accept-encoding": "gzip" },
      }),
      body,
      { "cache-control": "no-store" },
    );
    expect(gzip.headers.get("content-encoding")).toBe("gzip");
    expect(gzip.headers.get("cache-control")).toBe("no-store");
    expect(JSON.parse(gunzipSync(Buffer.from(await gzip.arrayBuffer())).toString())).toEqual(body);

    const identity = jsonAvailabilityResponse(
      new NextRequest("https://example.test/api/public/gp-availability", {
        headers: { "accept-encoding": "gzip;q=0" },
      }),
      body,
      { "cache-control": "no-store" },
    );
    expect(identity.headers.get("content-encoding")).toBeNull();
    expect(await identity.json()).toEqual(body);
  });
});
