import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeSectionVisibility,
  type MergedTranslation,
  type PageContentBase,
} from "./page-content.service.js";

const allOff: PageContentBase = {
  showIntro: false,
  showWhoFor: false,
  showWhyChoose: false,
  showFaq: false,
  showDisclaimer: false,
  showBody: false,
  introTheme: null,
  whoForTheme: null,
  whyChooseTheme: null,
  faqTheme: null,
  disclaimerTheme: null,
};

const allOn: PageContentBase = {
  showIntro: true,
  showWhoFor: true,
  showWhyChoose: true,
  showFaq: true,
  showDisclaimer: true,
  showBody: true,
  introTheme: null,
  whoForTheme: null,
  whyChooseTheme: null,
  faqTheme: null,
  disclaimerTheme: null,
};

const emptyTranslation: MergedTranslation = {
  heroTitle: null,
  heroSubtitle: null,
  heroTitleLead: null,
  heroTitleAccent: null,
  ctaLabel: null,
  intro: null,
  whoForTitle: null,
  whoForIntro: null,
  whoForItems: null,
  whyChooseTitle: null,
  whyChooseItems: null,
  faq: null,
  disclaimerParagraphs: null,
  disclaimerShort: null,
  body: null,
  seoTitle: null,
  seoDescription: null,
};

const fullTranslation: MergedTranslation = {
  ...emptyTranslation,
  intro: "An intro paragraph.",
  whoForItems: ["Cold", "Flu"],
  whyChooseItems: ["Fast", "Trusted"],
  faq: [{ question: "Q1", answer: "A1" }],
  disclaimerParagraphs: ["Paragraph one."],
  disclaimerShort: "Short disclaimer.",
  body: "<p>Body</p>",
};

describe("computeSectionVisibility — 12-case toggle x content matrix", () => {
  it("toggle OFF, content EMPTY -> all sections hidden", () => {
    const result = computeSectionVisibility(allOff, emptyTranslation);
    assert.deepEqual(result, {
      intro: false,
      whoFor: false,
      whyChoose: false,
      faq: false,
      disclaimer: false,
      body: false,
    });
  });

  it("toggle OFF, content PRESENT -> still hidden (toggle wins)", () => {
    const result = computeSectionVisibility(allOff, fullTranslation);
    assert.deepEqual(result, {
      intro: false,
      whoFor: false,
      whyChoose: false,
      faq: false,
      disclaimer: false,
      body: false,
    });
  });

  it("toggle ON, content EMPTY -> hidden (not configured)", () => {
    const result = computeSectionVisibility(allOn, emptyTranslation);
    assert.deepEqual(result, {
      intro: false,
      whoFor: false,
      whyChoose: false,
      faq: false,
      disclaimer: false,
      body: false,
    });
  });

  it("toggle ON, content PRESENT -> shown", () => {
    const result = computeSectionVisibility(allOn, fullTranslation);
    assert.deepEqual(result, {
      intro: true,
      whoFor: true,
      whyChoose: true,
      faq: true,
      disclaimer: true,
      body: true,
    });
  });

  it("intro: whitespace-only string counts as empty", () => {
    const result = computeSectionVisibility(allOn, { ...fullTranslation, intro: "   " });
    assert.equal(result.intro, false);
  });

  it("whoFor: items array present but all-blank counts as empty", () => {
    const result = computeSectionVisibility(allOn, { ...fullTranslation, whoForItems: ["", "  "] });
    assert.equal(result.whoFor, false);
  });

  it("whyChoose: non-array value counts as empty", () => {
    const result = computeSectionVisibility(allOn, { ...fullTranslation, whyChooseItems: "not-an-array" });
    assert.equal(result.whyChoose, false);
  });

  it("faq: empty array counts as empty", () => {
    const result = computeSectionVisibility(allOn, { ...fullTranslation, faq: [] });
    assert.equal(result.faq, false);
  });

  it("faq: non-array value counts as empty", () => {
    const result = computeSectionVisibility(allOn, { ...fullTranslation, faq: null });
    assert.equal(result.faq, false);
  });

  it("disclaimer: shown via paragraphs alone (short empty)", () => {
    const result = computeSectionVisibility(allOn, {
      ...fullTranslation,
      disclaimerShort: null,
      disclaimerParagraphs: ["One paragraph."],
    });
    assert.equal(result.disclaimer, true);
  });

  it("disclaimer: shown via short alone (paragraphs empty)", () => {
    const result = computeSectionVisibility(allOn, {
      ...fullTranslation,
      disclaimerParagraphs: [],
      disclaimerShort: "Short only.",
    });
    assert.equal(result.disclaimer, true);
  });

  it("body: html-looking string still requires non-whitespace content", () => {
    const result = computeSectionVisibility(allOn, { ...fullTranslation, body: "" });
    assert.equal(result.body, false);
  });
});

describe("locale resolution semantics (safe hybrid used by getPublicPageContent)", () => {
  // Mirrors the `field()` resolver in getPublicPageContent: per-field
  // requested-locale value ?? default-locale value ?? null (kept so live
  // partially-translated rows don't render blank), PLUS `mixedLocaleFields`
  // recording every key backfilled from the other-locale row so the mixing
  // is observable instead of silent (§5B/#3 safe-hybrid policy).
  type Row = Record<string, string | null> & { locale: string };

  function resolve(requested: Row | null, fallback: Row | null, keys: string[]) {
    const mixedLocaleFields: string[] = [];
    const merged: Record<string, string | null> = {};
    for (const key of keys) {
      const req = requested?.[key];
      if (req !== null && req !== undefined) {
        merged[key] = req;
        continue;
      }
      const fb = fallback?.[key];
      if (fb !== null && fb !== undefined) {
        if (requested) mixedLocaleFields.push(key);
        merged[key] = fb;
        continue;
      }
      merged[key] = null;
    }
    const resolvedLocale = requested ? requested.locale : fallback ? fallback.locale : null;
    return { merged, mixedLocaleFields, resolvedLocale };
  }

  const keys = ["heroTitle", "intro", "seoTitle"];

  it("requested value present -> used, not counted as mixed", () => {
    const requested: Row = { locale: "CS", heroTitle: "CS hero", intro: "CS intro", seoTitle: "CS seo" };
    const fallback: Row = { locale: "EN", heroTitle: "EN hero", intro: "EN intro", seoTitle: "EN seo" };
    const { merged, mixedLocaleFields, resolvedLocale } = resolve(requested, fallback, keys);
    assert.deepEqual(merged, { heroTitle: "CS hero", intro: "CS intro", seoTitle: "CS seo" });
    assert.deepEqual(mixedLocaleFields, []);
    assert.equal(resolvedLocale, "CS");
  });

  it("requested row has null fields -> backfilled from fallback AND listed in mixedLocaleFields", () => {
    const requested: Row = { locale: "CS", heroTitle: "CS hero", intro: null, seoTitle: null };
    const fallback: Row = { locale: "EN", heroTitle: "EN hero", intro: "EN intro", seoTitle: "EN seo" };
    const { merged, mixedLocaleFields, resolvedLocale } = resolve(requested, fallback, keys);
    assert.deepEqual(merged, { heroTitle: "CS hero", intro: "EN intro", seoTitle: "EN seo" });
    assert.deepEqual(mixedLocaleFields, ["intro", "seoTitle"]);
    assert.equal(resolvedLocale, "CS");
  });

  it("no requested row -> whole fallback row, resolvedLocale = fallback locale, NOT mixed", () => {
    const fallback: Row = { locale: "EN", heroTitle: "EN hero", intro: "EN intro", seoTitle: null };
    const { merged, mixedLocaleFields, resolvedLocale } = resolve(null, fallback, keys);
    assert.deepEqual(merged, { heroTitle: "EN hero", intro: "EN intro", seoTitle: null });
    assert.deepEqual(mixedLocaleFields, []);
    assert.equal(resolvedLocale, "EN");
  });

  it("neither row -> all null, no mixing", () => {
    const { merged, mixedLocaleFields, resolvedLocale } = resolve(null, null, keys);
    assert.deepEqual(merged, { heroTitle: null, intro: null, seoTitle: null });
    assert.deepEqual(mixedLocaleFields, []);
    assert.equal(resolvedLocale, null);
  });

  it("field null in BOTH rows -> stays null, not counted as mixed", () => {
    const requested: Row = { locale: "CS", heroTitle: "CS hero", intro: null, seoTitle: null };
    const fallback: Row = { locale: "EN", heroTitle: "EN hero", intro: null, seoTitle: "EN seo" };
    const { merged, mixedLocaleFields } = resolve(requested, fallback, keys);
    assert.equal(merged.intro, null);
    assert.deepEqual(mixedLocaleFields, ["seoTitle"]);
  });
});
