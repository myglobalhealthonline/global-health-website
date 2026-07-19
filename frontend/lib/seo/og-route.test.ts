import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/og/route";

describe("OG image route", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders a branded image when a doctor portrait cannot be decoded", async () => {
    const realFetch = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = input instanceof Request ? input.url : input.toString();
        if (url.startsWith("https://")) {
          return new Response(new Uint8Array([0, 1, 2, 3]), {
            status: 200,
            headers: { "content-type": "image/webp", "content-length": "4" },
          });
        }
        return realFetch(input, init);
      }),
    );

    const response = await GET(
      new Request(
        "https://myglobalhealth.online/api/og?kind=doctor&title=Dr%20Example&image=https%3A%2F%2Fimages.unsplash.com%2Fdoctor.webp",
      ),
    );
    const bytes = await response.arrayBuffer();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/jpeg");
    expect(bytes.byteLength).toBeGreaterThan(1_000);
  });

  it("never uses the incoming request host for server-side image fetches", async () => {
    const realFetch = globalThis.fetch;
    const fetchedUrls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = input instanceof Request ? input.url : input.toString();
        if (url.startsWith("https://")) {
          fetchedUrls.push(url);
          return new Response(null, { status: 404 });
        }
        return realFetch(input, init);
      }),
    );

    const response = await GET(
      new Request(
        "https://attacker.example/api/og?kind=doctor&title=Dr%20Example&image=%2Fimages%2Fdoctor.jpg",
      ),
    );
    await response.arrayBuffer();

    expect(response.status).toBe(200);
    expect(fetchedUrls.some((url) => url.startsWith("https://attacker.example/"))).toBe(false);
    expect(fetchedUrls.some((url) => url.startsWith("https://www.myglobalhealth.online/"))).toBe(true);
  });
});
