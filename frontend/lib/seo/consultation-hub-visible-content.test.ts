import { describe, expect, it } from "vitest";
import { resolveConsultationHubVisibleContent } from "./consultation-hub-visible-content";

const fallbackFaq = [{ question: "Fallback question", answer: "Fallback answer" }];
const authoredFaq = [{ question: "Visible question", answer: "Visible answer" }];

describe("resolveConsultationHubVisibleContent", () => {
  it("uses authored copy and FAQs only when those sections are visible", () => {
    const result = resolveConsultationHubVisibleContent({
      authoredTitle: "Authored title",
      fallbackTitle: "Fallback title",
      authoredDescription: "Authored description",
      fallbackDescription: "Fallback description",
      authoredFaq,
      authoredFaqVisible: true,
      fallbackFaq,
    });

    expect(result).toEqual({
      title: "Authored title",
      description: "Authored description",
      faq: authoredFaq,
    });
  });

  it("uses the same fallback FAQ that visitors see when authored FAQs are hidden", () => {
    const result = resolveConsultationHubVisibleContent({
      authoredTitle: null,
      fallbackTitle: "Fallback title",
      authoredDescription: null,
      fallbackDescription: "Fallback description",
      authoredFaq,
      authoredFaqVisible: false,
      fallbackFaq,
    });

    expect(result.faq).toBe(fallbackFaq);
    expect(result.faq).not.toContainEqual(authoredFaq[0]);
  });

  it("falls back when the authored FAQ section is enabled but contains no entries", () => {
    const result = resolveConsultationHubVisibleContent({
      authoredTitle: null,
      fallbackTitle: "Fallback title",
      authoredDescription: null,
      fallbackDescription: "Fallback description",
      authoredFaq: [],
      authoredFaqVisible: true,
      fallbackFaq,
    });

    expect(result.faq).toBe(fallbackFaq);
  });

  it("uses an authored hero description independently of optional intro content", () => {
    const result = resolveConsultationHubVisibleContent({
      authoredTitle: null,
      fallbackTitle: "Fallback title",
      authoredDescription: "Visible hero subtitle",
      fallbackDescription: "Fallback hero subtitle",
      authoredFaq: [],
      authoredFaqVisible: false,
      fallbackFaq,
    });

    expect(result.description).toBe("Visible hero subtitle");
  });

  it("does not mutate either FAQ collection", () => {
    const authoredSnapshot = structuredClone(authoredFaq);
    const fallbackSnapshot = structuredClone(fallbackFaq);

    resolveConsultationHubVisibleContent({
      authoredTitle: null,
      fallbackTitle: "Fallback title",
      authoredDescription: null,
      fallbackDescription: "Fallback description",
      authoredFaq,
      authoredFaqVisible: true,
      fallbackFaq,
    });

    expect(authoredFaq).toEqual(authoredSnapshot);
    expect(fallbackFaq).toEqual(fallbackSnapshot);
  });
});
