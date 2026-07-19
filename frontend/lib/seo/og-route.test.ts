import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/og/route";

describe("OG image route", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("renders the selected background and real logo below the social image budget", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://myglobalhealth.online");
    const realFetch = globalThis.fetch;
    const [background, logo] = await Promise.all([
      readFile(new URL("../../public/social/og-background.webp", import.meta.url)),
      readFile(new URL("../../public/logos/global-health-light.png", import.meta.url)),
    ]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = new URL(input instanceof Request ? input.url : input.toString());
        if (url.pathname === "/social/og-background.webp") {
          return new Response(background, { headers: { "content-type": "image/webp" } });
        }
        if (url.pathname === "/logos/global-health-light.png") {
          return new Response(logo, { headers: { "content-type": "image/png" } });
        }
        if (url.protocol === "https:") return new Response(null, { status: 404 });
        return realFetch(input, init);
      }),
    );

    const response = await GET(new Request(
      "https://myglobalhealth.online/api/og?kind=service&title=Online%20GP%20Consultation&subtitle=Ireland&locale=en_IE",
    ));
    const bytes = await response.arrayBuffer();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/jpeg");
    expect(bytes.byteLength).toBeGreaterThan(10_000);
    expect(bytes.byteLength).toBeLessThan(300_000);
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
