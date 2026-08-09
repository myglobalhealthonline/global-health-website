import { describe, expect, it } from "vitest";
import { countries } from "@/data/countries";

/**
 * International-locale batch (2026-08-09). Brazil is the one deliberately
 * 3-locale market (admin decision 2026-07-24, matches DB CountryLocale
 * rows) — every other seeded market carries the full 6-locale set. This is
 * a regression guard against either direction silently drifting: someone
 * "completing" Brazil's matrix to 6 (which next.config.ts's cs/ro/de
 * redirects would then orphan), or another market losing locales without
 * the redirects/sitemap/hreflang code that depends on `supportedLocales`
 * being updated to match.
 */
describe("country supportedLocales matrix", () => {
  const ALL_SIX = ["en", "pt", "es", "cs", "ro", "de"];

  it("Brazil supports exactly pt/en/es, nothing else", () => {
    const brazil = countries.find((c) => c.code === "br");
    expect(brazil).toBeTruthy();
    expect(new Set(brazil!.supportedLocales)).toEqual(new Set(["pt", "en", "es"]));
  });

  it("every non-Brazil seeded market supports all 6 site locales", () => {
    for (const country of countries) {
      if (country.code === "br") continue;
      expect(
        new Set(country.supportedLocales),
        `${country.code} should support all 6 locales`,
      ).toEqual(new Set(ALL_SIX));
    }
  });

  it("every country's defaultLocale is inside its own supportedLocales", () => {
    for (const country of countries) {
      expect(country.supportedLocales).toContain(country.defaultLocale);
    }
  });
});
