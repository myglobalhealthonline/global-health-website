import { describe, expect, it } from "vitest";
import { getCountryByCode } from "@/data/countries";
import { hreflangAlternates, hreflangRegion, ogLocales } from "./hreflang";

describe("hreflangRegion", () => {
  it("uppercases every seeded code to its ISO 3166-1 region", () => {
    expect(hreflangRegion("ie")).toBe("IE");
    expect(hreflangRegion("cz")).toBe("CZ");
    expect(hreflangRegion("pt")).toBe("PT");
    expect(hreflangRegion("es")).toBe("ES");
    expect(hreflangRegion("ro")).toBe("RO"); // was the old `rm` special case
    expect(hreflangRegion("br")).toBe("BR");
  });
});

describe("hreflangAlternates", () => {
  it("emits canonical lang-REGION BCP-47 tags + x-default (Google)", () => {
    const ie = getCountryByCode("ie")!;
    expect(hreflangAlternates(ie, "/doctors")).toEqual({
      "en-IE": "/ireland/en/doctors",
      "pt-IE": "/ireland/pt/doctors",
      "es-IE": "/ireland/es/doctors",
      "cs-IE": "/ireland/cs/doctors",
      "ro-IE": "/ireland/ro/doctors",
      "de-IE": "/ireland/de/doctors",
      "x-default": "/ireland/en/doctors",
    });
  });
});

describe("ogLocales", () => {
  it("emits underscore language_REGION for Meta og:locale + alternates", () => {
    const ie = getCountryByCode("ie")!;
    expect(ogLocales(ie, "pt")).toEqual({
      locale: "pt_IE",
      alternateLocale: ["en_IE", "es_IE", "cs_IE", "ro_IE", "de_IE"],
    });
  });

  it("uses the country's own region for a non-default-locale page", () => {
    const br = getCountryByCode("br")!; // Brazil, default pt
    expect(ogLocales(br, "en").locale).toBe("en_BR");
  });
});
