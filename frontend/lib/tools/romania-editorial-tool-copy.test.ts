import { expect, it } from "vitest";
import { applyMarketBands, applyMarketToolCopy, getMarketFaq } from "./market-copy";
import { getToolsCopy, TOOL_SLUGS } from "./registry";
import type { LocaleCode } from "@/lib/i18n/types";

const locales: LocaleCode[] = ["ro", "en", "cs", "de", "es", "pt"];

function preserveData(before: unknown, after: unknown): void {
  if (typeof before === "string") {
    expect(typeof after).toBe("string");
    const text = after as string;
    expect(text).not.toContain("—");
    expect(text.match(/\d+(?:[.,]\d+)*/g)).toEqual(before.match(/\d+(?:[.,]\d+)*/g));
    expect(text.match(/https?:\/\/[^\s"<>]+/g)).toEqual(before.match(/https?:\/\/[^\s"<>]+/g));
    expect(text.match(/\{[^}]+\}/g)).toEqual(before.match(/\{[^}]+\}/g));
    return;
  }
  if (Array.isArray(before)) {
    expect(after).toHaveLength(before.length);
    before.forEach((value, index) => preserveData(value, (after as unknown[])[index]));
    return;
  }
  if (before && typeof before === "object") {
    expect(Object.keys(after as object).sort()).toEqual(Object.keys(before).sort());
    Object.entries(before).forEach(([key, value]) =>
      preserveData(value, (after as Record<string, unknown>)[key]),
    );
    return;
  }
  expect(after).toEqual(before);
}

it("cleans every Romania tool locale while preserving data and other markets", () => {
  for (const locale of locales) {
    const bundle = getToolsCopy(locale);
    preserveData(bundle.bands, applyMarketBands("ro", locale, bundle.bands));
    expect(applyMarketBands("ie", locale, bundle.bands)).toBe(bundle.bands);
    for (const slug of TOOL_SLUGS) {
      const base = bundle.tools[slug];
      preserveData(base, applyMarketToolCopy("ro", locale, slug, base));
      expect(applyMarketToolCopy("ie", locale, slug, base)).toBe(base);
      expect(JSON.stringify(getMarketFaq("ro", locale, slug))).not.toContain("—");
    }
  }
});
