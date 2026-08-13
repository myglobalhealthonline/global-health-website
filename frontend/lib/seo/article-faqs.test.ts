import { describe, expect, it } from "vitest";
import { extractArticleFaqs } from "./article-faqs";

/** The exact shape the live sick-cert article ships. */
const item = (q: string, a: string) =>
  `<details class="faq-item"><summary class="faq-q">${q}</summary><div class="faq-a"><p>${a}</p></div></details>`;

describe("extractArticleFaqs", () => {
  it("pulls question and answer text out of the editor's faq markup", () => {
    const html = `<section><div class="faq-section">${item(
      "How many statutory sick days am I entitled to in 2026?",
      "5 days per calendar year.",
    )}${item("Is a “medical chit” the same as a sick cert?", "Yes — informal names for the same document.")}</div></section>`;

    expect(extractArticleFaqs(html)).toEqual([
      {
        question: "How many statutory sick days am I entitled to in 2026?",
        answer: "5 days per calendar year.",
      },
      {
        question: "Is a “medical chit” the same as a sick cert?",
        answer: "Yes — informal names for the same document.",
      },
    ]);
  });

  it("strips inline markup and entities from the answer", () => {
    const html = item(
      "Can I get a sick cert online?",
      'Yes &amp; same day &mdash; see <a href="/x">the service</a>.<br/>Book anytime.',
    );
    expect(extractArticleFaqs(html)[0].answer).toBe(
      "Yes & same day — see the service. Book anytime.",
    );
  });

  it("drops duplicates, which would make the whole FAQPage ineligible", () => {
    const html = item("Same question?", "First answer.") + item("same QUESTION?", "Second answer.");
    expect(extractArticleFaqs(html)).toHaveLength(1);
  });

  it("skips entries missing a question or an answer", () => {
    const html = item("", "Orphan answer.") + item("Orphan question?", "");
    expect(extractArticleFaqs(html)).toEqual([]);
  });

  it("returns nothing for bodies with no faq markup", () => {
    expect(extractArticleFaqs("<p>Just prose.</p>")).toEqual([]);
    expect(extractArticleFaqs(null)).toEqual([]);
  });
});
