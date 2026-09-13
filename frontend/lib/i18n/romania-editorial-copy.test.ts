import { describe, expect, it } from "vitest";
import { loadLocaleBundle } from "./load-locale";

describe("Romania editorial locale scope", () => {
  it("keeps other markets unchanged and caches the country variants separately", () => {
    const shared = loadLocaleBundle("en");
    const original = JSON.stringify(shared);
    const romania = loadLocaleBundle("en", "romania");
    expect(romania.company.press.titleTemplate).not.toContain("—");
    expect(romania.common.homeMeta.descriptionTemplate).toContain("Romanian");
    expect(loadLocaleBundle("en", "ro")).toBe(romania);
    expect(loadLocaleBundle("en", "ireland")).toBe(shared);
    expect(JSON.stringify(shared)).toBe(original);
    expect(romania.subscription.howItWorks.steps).toHaveLength(shared.subscription.howItWorks.steps.length);
    expect(romania.common.bookingForm).toEqual(shared.common.bookingForm);
  });
  it.each(["ro", "en", "cs", "de", "es", "pt"] as const)("keeps policy values and placeholders for %s", locale => {
    const shared = loadLocaleBundle(locale), revised = loadLocaleBundle(locale, "ro");
    for (const namespace of ["company", "legal", "subscription"] as const) {
      const tokens = (v: unknown): string[] => typeof v === "string"
        ? v.match(/\{[^}]+\}|\d+/g) ?? []
        : v && typeof v === "object" ? Object.values(v).flatMap(tokens) : [];
      expect(tokens(revised[namespace])).toEqual(tokens(shared[namespace]));
    }
  });
});
