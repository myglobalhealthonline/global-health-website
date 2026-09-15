import { describe, expect, it } from "vitest";
import { loadLocaleBundle } from "@/lib/i18n/load-locale";
import { overrideHomeBundle } from "./country-home-copy";

describe("Brazil homepage how-it-works step 1", () => {
  it.each(["pt", "en", "es"] as const)("drops specialist and home-test promises for br:%s only", (lang) => {
    const base = loadLocaleBundle(lang).home;
    const brazil = overrideHomeBundle(base, "br", lang);
    expect(brazil.howItWorks.step1Body).not.toMatch(/especialista|specialist|casa|home-test|home test/i);
    expect(overrideHomeBundle(base, "pt", lang).howItWorks.step1Body).toBe(base.howItWorks.step1Body);
  });
});
