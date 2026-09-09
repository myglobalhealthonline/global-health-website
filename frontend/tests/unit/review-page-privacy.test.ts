import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

describe("review capability page privacy", () => {
  it.each(["document", "empty"])("protects %s responses without requiring login", async (destination) => {
    const response = await proxy(new NextRequest("https://myglobalhealth.online/reviews/rate?token=synthetic", {
      headers: { "sec-fetch-dest": destination },
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(response.headers.get("content-security-policy")).toContain("'nonce-");
    expect(response.headers.get("content-security-policy")).not.toContain("googletagmanager.com");
  });
});
