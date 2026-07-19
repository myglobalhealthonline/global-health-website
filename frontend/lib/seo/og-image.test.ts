import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildOgImageUrl } from "./og-image";

describe("buildOgImageUrl", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://myglobalhealth.online/");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a public absolute HTTPS URL for the OG image endpoint", () => {
    const result = new URL(
      buildOgImageUrl({
        kind: "service",
        title: "Online GP Consultation",
        subtitle: "Ireland",
        locale: "en-IE",
      }),
    );

    expect(result.origin).toBe("https://myglobalhealth.online");
    expect(result.pathname).toBe("/api/og");
    expect(result.protocol).toBe("https:");
    expect(result.searchParams.get("kind")).toBe("service");
    expect(result.searchParams.get("title")).toBe("Online GP Consultation");
    expect(result.searchParams.get("subtitle")).toBe("Ireland");
    expect(result.searchParams.get("locale")).toBe("en-IE");
  });

  it("safely encodes user-authored text and optional source images", () => {
    const image = "https://cdn.example.com/doctors/dr-o'connor.webp?size=large&crop=face";
    const result = new URL(
      buildOgImageUrl({
        kind: "doctor",
        title: "Dr. Ana O'Connor & Team / Cardiology",
        subtitle: "Cora\u00e7\u00e3o, sa\u00fade e preven\u00e7\u00e3o",
        locale: "pt-PT",
        image,
      }),
    );

    expect(result.searchParams.get("title")).toBe("Dr. Ana O'Connor & Team / Cardiology");
    expect(result.searchParams.get("subtitle")).toBe("Cora\u00e7\u00e3o, sa\u00fade e preven\u00e7\u00e3o");
    expect(result.searchParams.get("image")).toBe(image);
  });

  it("is deterministic while giving distinct content and locales distinct cache identities", () => {
    const base = {
      kind: "article" as const,
      title: "How to prepare for your consultation",
      locale: "en-IE",
    };

    const first = buildOgImageUrl(base);
    expect(buildOgImageUrl({ ...base })).toBe(first);
    expect(buildOgImageUrl({ ...base, title: "Understanding blood test results" })).not.toBe(first);
    expect(buildOgImageUrl({ ...base, locale: "pt-PT" })).not.toBe(first);
    expect(buildOgImageUrl({ ...base, image: "https://cdn.example.com/article.webp" })).not.toBe(first);
  });

  it("bounds excessively long query text without producing invalid Unicode", () => {
    const result = new URL(
      buildOgImageUrl({
        kind: "article",
        title: `${"A".repeat(400)} \ud83e\ude7a`,
        subtitle: "B".repeat(600),
        locale: "en-IE",
      }),
    );

    expect(result.searchParams.get("title")?.length).toBeLessThanOrEqual(160);
    expect(result.searchParams.get("subtitle")?.length).toBeLessThanOrEqual(200);
    expect(() => decodeURIComponent(result.search)).not.toThrow();
  });
});
