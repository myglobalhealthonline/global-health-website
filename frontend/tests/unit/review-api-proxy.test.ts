import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/public/[...path]/route";

vi.mock("@/lib/server/backend-origin", () => ({ getBackendOrigin: () => "https://backend.example.test" }));
vi.mock("@/lib/server/proxy-client-ip", () => ({ proxyClientIpHeaders: () => ({}) }));
afterEach(() => vi.unstubAllGlobals());
describe("review browser API", () => {
  it("forwards explicit actions and preserves token-response privacy", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, data: { stopped: true } }), { headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetch);
    const body = JSON.stringify({ token: "synthetic", action: "opted_out" });
    const response = await POST(new NextRequest("https://example.test/api/public/reviews/action", { method: "POST", headers: { "content-type": "application/json" }, body }), { params: Promise.resolve({ path: ["reviews", "action"] }) });
    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith("https://backend.example.test/api/public/reviews/action", expect.objectContaining({ method: "POST", body, cache: "no-store" }));
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });
  it("does not forward GET actions that email scanners may request", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const response = await GET(new NextRequest("https://example.test/api/public/reviews/action"), { params: Promise.resolve({ path: ["reviews", "action"] }) });
    expect(response.status).toBe(404); expect(fetch).not.toHaveBeenCalled();
  });
});
