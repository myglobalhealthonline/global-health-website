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

describe("locale resolution semantics (field-level precedence used by getPublicPageContent)", () => {
  // Mirrors the `field()` resolver in getPublicPageContent: requested-locale
  // value ?? defaultLocale value ?? null. Exercised directly here since the
  // resolver itself is a small closure inside a DB-backed function.
  function resolveField(requested: string | null | undefined, fallback: string | null | undefined) {
    return requested ?? fallback ?? null;
  }

  it("requested locale has a value -> use it, ignore fallback", () => {
    assert.equal(resolveField("CS copy", "EN copy"), "CS copy");
  });

  it("requested locale missing/null -> use default-locale fallback", () => {
    assert.equal(resolveField(null, "EN copy"), "EN copy");
  });

  it("neither requested nor fallback has a value -> null", () => {
    assert.equal(resolveField(null, null), null);
    assert.equal(resolveField(undefined, undefined), null);
  });
});
