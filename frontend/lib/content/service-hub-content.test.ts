import { describe, expect, it } from "vitest";
import { getServiceHubContent } from "./service-hub-content";

describe("getServiceHubContent", () => {
  it("builds neutral country-aware specialist content", () => {
    const content = getServiceHubContent("specialist", {
      countryName: "Portugal",
      locale: "pt",
      serviceNames: ["Dermatology", "Cardiology"],
    });

    expect(content.overview.body).toContain("Portugal");
    expect(content.commonReasons?.items).toEqual(["Dermatology", "Cardiology"]);
    expect(content.resolvedLocale).toBe("pt");
    expect(content.overview.title).toBe("Cuidados especializados associados a um serviço ativo");
  });

  it.each([
    ["en", "en"],
    ["pt", "pt"],
    ["cs", "cs"],
    ["es", "es"],
    ["ro", "ro"],
    ["de", "de"],
  ])("resolves the approved %s fallback", (locale, expected) => {
    const content = getServiceHubContent("tests", {
      countryName: "Testland",
      locale,
      serviceNames: [],
    });

    expect(content.resolvedLocale).toBe(expected);
    expect(content.faq).toHaveLength(6);
    if (locale !== "en") {
      expect(content.overview.title).not.toBe("Health tests with product-specific information");
    }
  });

  it("omits a service-derived section when the country has no active services", () => {
    const content = getServiceHubContent("specialist", {
      countryName: "Czechia",
      locale: "cs",
      serviceNames: [],
    });

    expect(content.commonReasons).toBeUndefined();
  });

  it("does not make global clinician-review, delivery, or turnaround claims for tests", () => {
    const content = getServiceHubContent("tests", {
      countryName: "Ireland",
      locale: "en",
      serviceNames: [],
    });
    const serialized = JSON.stringify(content).toLowerCase();

    expect(serialized).not.toContain("every result is reviewed");
    expect(serialized).not.toContain("24–48");
    expect(serialized).not.toContain("delivered to your home");
  });
});
