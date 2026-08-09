import { describe, expect, it } from "vitest";
import { eligibleLandingLocales } from "./landing-locale-eligibility";

/**
 * International-locale batch (2026-08-09). `eligibleLandingLocales` is the
 * single source of truth `app/sitemap.ts` (locale URLs to submit + hreflang)
 * and `/health/[slug]/page.tsx` (robots + its own hreflang cluster) both key
 * off — these tests lock its three required behaviors: a locale with a real
 * translation is included, one without is excluded (even though
 * `resolveTranslation` would silently fall back to it), and a partial
 * translation cluster (e.g. en/pt/es only) yields EXACTLY that set.
 */
describe("eligibleLandingLocales", () => {
  it("exact translation: a locale with a real row is eligible", () => {
    expect(eligibleLandingLocales(["en", "pt"], ["en", "pt", "es", "cs", "ro", "de"], "en")).toEqual([
      "en",
      "pt",
    ]);
  });

  it("missing translation: a locale with no row is excluded even though it's supported", () => {
    const result = eligibleLandingLocales(["en"], ["en", "pt", "es", "cs", "ro", "de"], "en");
    expect(result).toEqual(["en"]);
    expect(result).not.toContain("pt");
  });

  it("partial translation cluster: en/pt/es only, never cs/ro/de", () => {
    const result = eligibleLandingLocales(
      ["en", "pt", "es"],
      ["en", "pt", "es", "cs", "ro", "de"],
      "en",
    );
    expect(new Set(result)).toEqual(new Set(["en", "pt", "es"]));
    expect(result).not.toContain("cs");
    expect(result).not.toContain("ro");
    expect(result).not.toContain("de");
  });

  it("a translation row for a locale the country no longer supports is excluded", () => {
    // Guards the other half of the invariant: a stale translation row alone
    // must not resurrect a locale the country config has dropped.
    const result = eligibleLandingLocales(["en", "de"], ["en", "pt"], "en");
    expect(result).toEqual(["en"]);
  });

  it("orders the default locale first regardless of input order", () => {
    const result = eligibleLandingLocales(["cs", "en", "pt"], ["en", "pt", "cs"], "en");
    expect(result[0]).toBe("en");
  });

  it("no real translation anywhere resolves to an empty set", () => {
    expect(eligibleLandingLocales([], ["en", "pt"], "en")).toEqual([]);
  });

  it("is case-insensitive on every input", () => {
    expect(eligibleLandingLocales(["EN", "PT"], ["en", "PT"], "EN")).toEqual(["en", "pt"]);
  });

  it("falls back to [defaultLocale] when supportedLocales is empty", () => {
    expect(eligibleLandingLocales(["en"], [], "en")).toEqual(["en"]);
    expect(eligibleLandingLocales(["pt"], [], "en")).toEqual([]);
  });
});
