import { describe, expect, it } from "vitest";
import { deepMergeLocale } from "./deep-merge-locale";
import { loadLocaleBundle } from "./load-locale";

describe("deepMergeLocale", () => {
  it("falls back to the en value for a key missing from the locale bundle", () => {
    const en = { a: "en-a", nested: { b: "en-b", c: "en-c" } };
    const locale = { nested: { b: "locale-b" } } as typeof en;
    const merged = deepMergeLocale(en, locale);
    expect(merged).toEqual({ a: "en-a", nested: { b: "locale-b", c: "en-c" } });
  });

  it("keeps an explicit empty string from the locale instead of falling back", () => {
    const en = { title: "English title" };
    const locale = { title: "" };
    expect(deepMergeLocale(en, locale)).toEqual({ title: "" });
  });

  it("takes arrays from the locale wholesale, never merges them element-wise", () => {
    const en = { steps: [{ title: "one" }, { title: "two" }] };
    const locale = { steps: [{ title: "un" }] };
    expect(deepMergeLocale(en, locale)).toEqual({ steps: [{ title: "un" }] });
  });

  it("returns en untouched when the locale value is undefined (whole namespace missing)", () => {
    const en = { a: 1 };
    expect(deepMergeLocale(en, undefined)).toBe(en);
  });
});

describe("loadLocaleBundle", () => {
  it("fills a real locale's missing subscription trust-card keys from en", () => {
    // Regression for issue #9: subscription.pricing.trust_card* was missing
    // in every non-en locale before the Task B backfill; the deep merge is
    // what makes ANY future missing key render English instead of empty.
    const en = loadLocaleBundle("en");
    const cs = loadLocaleBundle("cs");
    expect(cs.subscription.pricing.trust_card1_title).toBeTruthy();
    expect(typeof cs.subscription.pricing.trust_card1_title).toBe("string");
    expect(en.subscription.pricing.trust_card1_title).toBeTruthy();
  });
});
