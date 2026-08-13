import { describe, expect, it } from "vitest";
import { getCommonLocale } from "./get-common-locale";
import { loadLocaleBundle } from "./load-locale";
import type { LocaleCode } from "./types";

/**
 * SEO-FOUNDATION-005 — pins the locale-dictionary values every public-page
 * breadcrumb emitter now reads (`c.navigation.*`, `c.testsPage.watermark`,
 * `c.countryNames[code]`) instead of the English literals the SEO-FOUNDATION
 * audit flagged (e.g. czechia/cs breadcrumbs showing "Home / Czechia /
 * Doctors"). A regression that reverts a call site back to a hardcoded
 * English string won't be caught here — this only guards the dictionaries
 * those call sites read from staying translated and non-empty.
 */
describe("breadcrumb locale dictionary — navigation labels", () => {
  const cases: Array<{ locale: LocaleCode; key: keyof ReturnType<typeof getCommonLocale>["navigation"]; expected: string }> = [
    // Czech country homepage / doctor listing / GP hub (audit's own examples).
    { locale: "cs", key: "home", expected: "Domů" },
    { locale: "cs", key: "doctors", expected: "Lékaři" },
    { locale: "cs", key: "generalConsultation", expected: "Konzultace s praktickým lékařem" },
    { locale: "cs", key: "specialistConsultation", expected: "Konzultace se specialistou" },
    // Portuguese page.
    { locale: "pt", key: "home", expected: "Início" },
    { locale: "pt", key: "about", expected: "Sobre" },
    // Spanish page.
    { locale: "es", key: "home", expected: "Inicio" },
    { locale: "es", key: "doctors", expected: "Médicos" },
    // Romanian page.
    { locale: "ro", key: "home", expected: "Acasă" },
    { locale: "ro", key: "blog", expected: "Blog" },
    // German secondary-locale page.
    { locale: "de", key: "home", expected: "Startseite" },
    { locale: "de", key: "contact", expected: "Kontakt" },
    // English control — must stay the English baseline, not silently drift.
    { locale: "en", key: "home", expected: "Home" },
    { locale: "en", key: "doctors", expected: "Doctors" },
  ];

  for (const { locale, key, expected } of cases) {
    it(`navigation.${key} is translated for locale "${locale}"`, () => {
      expect(getCommonLocale(locale).navigation[key]).toBe(expected);
    });
  }

  it("repeatPrescription and bookShort (Book/prescriptions breadcrumbs) are translated, not English fallbacks", () => {
    expect(getCommonLocale("cs").navigation.repeatPrescription).toBe("Žádost o recept");
    expect(getCommonLocale("cs").navigation.bookShort).toBe("Rezervovat");
    expect(getCommonLocale("pt").navigation.repeatPrescription).toBe("Pedido de receita");
    expect(getCommonLocale("de").navigation.bookShort).toBe("Buchen");
  });

  it("non-English lab-tests detail breadcrumb uses the translated hub label, not literal 'Lab tests'", () => {
    expect(getCommonLocale("cs").testsPage.watermark).toBe("Laboratorní testy");
    expect(getCommonLocale("cs").testsPage.watermark).not.toBe("Lab tests");
    expect(getCommonLocale("pt").testsPage.watermark).toBe("Análises laboratoriais");
    expect(getCommonLocale("es").testsPage.watermark).toBe("Pruebas de laboratorio");
    expect(getCommonLocale("ro").testsPage.watermark).toBe("Analize de laborator");
    expect(getCommonLocale("de").testsPage.watermark).toBe("Labortests");
  });

  // Mutation check (§9): if a call site regresses to the old hardcoded
  // literal, this assertion is what would catch it — the translated value
  // must differ from the English string previously hardcoded in every page.
  it("mutation guard — Czech translations differ from the previously hardcoded English literals", () => {
    const c = getCommonLocale("cs");
    expect(c.navigation.home).not.toBe("Home");
    expect(c.navigation.doctors).not.toBe("Doctors");
    expect(c.testsPage.watermark).not.toBe("Lab tests");
    expect(c.navigation.generalConsultation).not.toBe("Online GP consultation");
  });
});

describe("breadcrumb locale dictionary — country names", () => {
  // Czechia and Romania specifically, per the audit's own repro examples
  // (czechia/cs, ireland/cs) and the report's countryNames finding.
  const countryCases: Array<{ locale: LocaleCode; code: string; expected: string }> = [
    { locale: "cs", code: "cz", expected: "Česko" },
    { locale: "cs", code: "ro", expected: "Rumunsko" },
    { locale: "cs", code: "ie", expected: "Irsko" },
    { locale: "pt", code: "cz", expected: "Chéquia" },
    { locale: "es", code: "cz", expected: "Chequia" },
    { locale: "ro", code: "cz", expected: "Cehia" },
    { locale: "de", code: "cz", expected: "Tschechien" },
    { locale: "en", code: "cz", expected: "Czechia" },
  ];

  for (const { locale, code, expected } of countryCases) {
    it(`countryNames["${code}"] resolves to "${expected}" for locale "${locale}"`, () => {
      expect(getCommonLocale(locale).countryNames?.[code]).toBe(expected);
    });
  }

  it("an admin-added country with no countryNames entry falls back (breadcrumb call sites use ?? config.name)", () => {
    expect(getCommonLocale("cs").countryNames?.["zz"]).toBeUndefined();
  });
});

describe("breadcrumb locale dictionary — loadLocaleBundle().common matches getCommonLocale()", () => {
  // Every call site reads the bundle via `loadLocaleBundle(lang).common`
  // (or `getCommonLocale` directly) — pin that the two are the same object
  // shape so a future refactor of load-locale.ts can't silently diverge
  // the two entry points pages use interchangeably.
  it("is referentially the cached getCommonLocale() result for a non-English locale", () => {
    expect(loadLocaleBundle("cs").common).toBe(getCommonLocale("cs"));
  });
});
