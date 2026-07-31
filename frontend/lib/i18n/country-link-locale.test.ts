import { describe, expect, it } from "vitest";
import { countryLinkLocale } from "./country-link-locale";

const portugal = { supportedLocales: ["pt", "en", "es"], defaultLocale: "PT" };
const czechia = { supportedLocales: ["cs", "en"], defaultLocale: "CS" };

describe("countryLinkLocale", () => {
  it("keeps the selected language when the country serves it", () => {
    // The bug this exists for: an English-speaking patient sent to /portugal/pt.
    expect(countryLinkLocale("en", portugal)).toBe("en");
    expect(countryLinkLocale("pt", portugal)).toBe("pt");
  });

  it("falls back to the country default when the language isn't served", () => {
    expect(countryLinkLocale("ro", czechia)).toBe("cs");
  });

  it("falls back to the country default with no selection", () => {
    expect(countryLinkLocale(null, portugal)).toBe("pt");
    expect(countryLinkLocale(undefined, czechia)).toBe("cs");
  });

  it("is case-insensitive on both sides and always returns lowercase", () => {
    expect(countryLinkLocale("EN", portugal)).toBe("en");
    expect(countryLinkLocale("xx", { supportedLocales: ["EN"], defaultLocale: "EN" })).toBe("en");
  });

  it("defaults to en when the country carries no locale data", () => {
    expect(countryLinkLocale(null, {})).toBe("en");
  });
});
