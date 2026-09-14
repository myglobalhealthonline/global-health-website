import { describe, expect, it } from "vitest";
import { loadLocaleBundle } from "./load-locale";

describe("Spain sick-leave locale scope", () => {
  it("changes Spain only and caches the Spain variant separately", () => {
    const shared = loadLocaleBundle("en");
    const original = JSON.stringify(shared);
    const spain = loadLocaleBundle("en", "spain");
    expect(spain.about.country.offer_certificates_body).toContain("not a parte de baja");
    expect(loadLocaleBundle("en", "es")).toBe(spain);
    expect(loadLocaleBundle("en", "ireland")).toBe(shared);
    expect(loadLocaleBundle("en", "romania").about.country.offer_certificates_body).toBe(shared.about.country.offer_certificates_body);
    expect(JSON.stringify(shared)).toBe(original);
  });
  it.each(["en", "es", "cs", "de", "pt", "ro"] as const)("leaves other markets' about/contact templates unchanged for %s", locale => {
    const shared = loadLocaleBundle(locale);
    for (const country of ["ie", "ireland", "cz", "czechia", "pt", "portugal", "ro", "romania", "br", "brazil"]) {
      const bundle = loadLocaleBundle(locale, country);
      expect(bundle.about.country).toEqual(shared.about.country);
      expect(bundle.contact.country).toEqual(shared.contact.country);
    }
    expect(loadLocaleBundle(locale, "spain").about.country.offer_certificates_body).not.toBe(shared.about.country.offer_certificates_body);
  });
  it.each(["cs", "de", "pt", "ro"] as const)("rewrites Spain contact templates for %s and keeps placeholders", locale => {
    const shared = loadLocaleBundle(locale), spain = loadLocaleBundle(locale, "spain");
    for (const key of ["regulatoryBodyTemplate", "faq3A"] as const) {
      expect(spain.contact.country[key]).toContain("parte de baja");
      const tokens = (v: string) => (v.match(/\{[^}]+\}/g) ?? []).filter(t => t !== "{benefitBody}");
      expect(tokens(spain.contact.country[key])).toEqual(tokens(shared.contact.country[key]));
    }
    expect(spain.about.country.offer_certificates_body).toContain("{certificate}");
  });
});
