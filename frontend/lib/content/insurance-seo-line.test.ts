import { describe, expect, it } from "vitest";
import { buildLocalizedInsuranceLine } from "./insurance-seo-line";

const PT = "Aceitamos também {list} para este serviço.";
const EN = "We also accept {list} for this service.";

describe("buildLocalizedInsuranceLine", () => {
  it("returns null when no insurer covers the service", () => {
    expect(buildLocalizedInsuranceLine([], "pt", PT)).toBeNull();
    expect(buildLocalizedInsuranceLine(["", "  "], "pt", PT)).toBeNull();
  });

  it("keeps the sentence in the page locale, not English", () => {
    const line = buildLocalizedInsuranceLine(["Medicare"], "pt", PT);
    expect(line).toBe("Aceitamos também Medicare para este serviço.");
    // The regression this file exists for: an English sentence on a PT page.
    expect(line).not.toContain("We also");
  });

  it("joins with the locale's own conjunction rather than a hardcoded 'and'", () => {
    const names = ["Medicare", "SafeHealth"];
    expect(buildLocalizedInsuranceLine(names, "en", EN)).toContain("Medicare and SafeHealth");
    // pt-PT uses "e"; the backend's hardcoded " and " produced this wrong.
    expect(buildLocalizedInsuranceLine(names, "pt", PT)).toContain("Medicare e SafeHealth");
  });

  it("handles three or more insurers", () => {
    const line = buildLocalizedInsuranceLine(["A", "B", "C"], "en", EN);
    expect(line).toBe("We also accept A, B, and C for this service.");
  });

  it("falls back to a comma join instead of throwing on a bad locale tag", () => {
    const line = buildLocalizedInsuranceLine(["A", "B"], "not a locale" as never, EN);
    expect(line).toBe("We also accept A, B for this service.");
  });
});
