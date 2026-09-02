import { describe, expect, it } from "vitest";
import { sanitizePageContentForLocale, type PublicPageContentRecord } from "./get-page-content";

function record(overrides: Partial<PublicPageContentRecord> = {}): PublicPageContentRecord {
  return {
    heroTitle: "Localized title",
    heroSubtitle: null,
    heroTitleLead: null,
    heroTitleAccent: null,
    ctaLabel: null,
    ctaHref: null,
    heroImageSrc: null,
    ogImageSrc: null,
    intro: null,
    whoForTitle: null,
    whoForIntro: null,
    whoForItems: [],
    whyChooseTitle: null,
    whyChooseItems: [],
    faq: [],
    disclaimerParagraphs: [],
    disclaimerShort: null,
    body: null,
    seoTitle: null,
    seoDescription: null,
    sections: {
      intro: false,
      whoFor: false,
      whyChoose: false,
      faq: false,
      disclaimer: false,
      body: false,
    },
    introTheme: null,
    whoForTheme: null,
    whyChooseTheme: null,
    faqTheme: null,
    disclaimerTheme: null,
    resolvedLocale: "EN",
    mixedLocaleFields: [],
    ...overrides,
  };
}

describe("sanitizePageContentForLocale", () => {
  it("accepts content resolved entirely from the requested locale", () => {
    expect(sanitizePageContentForLocale(record(), "en")?.heroTitle).toBe("Localized title");
  });

  it.each([
    ["en", "CS"],
    ["pt", "EN"],
    ["es", "PT"],
    ["cs", "EN"],
    ["ro", "ES"],
    ["de", "CS"],
  ] as const)("rejects a %s route's whole-record fallback from %s", (locale, resolvedLocale) => {
    expect(sanitizePageContentForLocale(record({ resolvedLocale }), locale)).toBeNull();
  });

  it("removes only fields backfilled from another locale", () => {
    const localized = sanitizePageContentForLocale(
      record({
        heroSubtitle: "Default-locale subtitle",
        intro: "Default-locale intro",
        mixedLocaleFields: ["heroSubtitle", "intro"],
        sections: {
          intro: true,
          whoFor: false,
          whyChoose: false,
          faq: false,
          disclaimer: false,
          body: false,
        },
      }),
      "en",
    );

    expect(localized?.heroTitle).toBe("Localized title");
    expect(localized?.heroSubtitle).toBeNull();
    expect(localized?.intro).toBeNull();
    expect(localized?.sections.intro).toBe(false);
  });

  it("hides a disclaimer when its rendered paragraphs came from another locale", () => {
    const localized = sanitizePageContentForLocale(
      record({
        disclaimerParagraphs: ["Default-locale disclaimer"],
        disclaimerShort: "Localized short disclaimer",
        mixedLocaleFields: ["disclaimerParagraphs"],
        sections: {
          intro: false,
          whoFor: false,
          whyChoose: false,
          faq: false,
          disclaimer: true,
          body: false,
        },
      }),
      "en",
    );

    expect(localized?.disclaimerParagraphs).toEqual([]);
    expect(localized?.disclaimerShort).toBe("Localized short disclaimer");
    expect(localized?.sections.disclaimer).toBe(false);
  });
});
