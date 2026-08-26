import assert from "node:assert/strict";
import test from "node:test";

import {
  humanizeIrelandHtml,
  humanizeIrelandJson,
  humanizeIrelandLabel,
  humanizeIrelandProse,
  humanizeIrelandTitle,
} from "./ireland-public-copy-humanizer.js";

test("turns paired prose asides into ordinary commas", () => {
  assert.equal(
    humanizeIrelandProse(
      "Your doctor can contact your GP — with your consent — and share the care plan.",
    ),
    "Your doctor can contact your GP, with your consent, and share the care plan.",
  );
});

test("uses natural explanatory punctuation for a single prose interruption", () => {
  assert.equal(
    humanizeIrelandProse(
      "Book a consultation directly — the phone line is for account and billing questions.",
    ),
    "Book a consultation directly: the phone line is for account and billing questions.",
  );
  assert.equal(
    humanizeIrelandProse(
      "Not all hair loss is the same — and treating the wrong type can make matters worse.",
    ),
    "Not all hair loss is the same, and treating the wrong type can make matters worse.",
  );
  assert.equal(
    humanizeIrelandProse(
      "Your doctor will explain the next steps — including whether an in-person review is needed.",
    ),
    "Your doctor will explain the next steps, including whether an in-person review is needed.",
  );
});

test("uses familiar separators for labels and titles", () => {
  assert.equal(
    humanizeIrelandLabel("Stable angina — assessment and management"),
    "Stable angina: assessment and management",
  );
  assert.equal(
    humanizeIrelandLabel("What this service is — and what it is not"),
    "What this service is, and what it is not",
  );
  assert.equal(
    humanizeIrelandTitle("Dr Fahad Farooq — Neurology Registrar"),
    "Dr Fahad Farooq | Neurology Registrar",
  );
});

test("repairs explanatory fragments left by an interrupted earlier pass", () => {
  assert.equal(
    humanizeIrelandProse(
      "She consults in English and Portuguese. Making her accessible to more patients.",
    ),
    "She consults in English and Portuguese, making her accessible to more patients.",
  );
  assert.equal(
    humanizeIrelandProse(
      "Her work draws on CBT and DBT. Three of the best-supported approaches are used.",
    ),
    "Her work draws on CBT and DBT: three of the best-supported approaches are used.",
  );
  assert.equal(
    humanizeIrelandProse("Registered with PSI. Registration number 13655."),
    "Registered with PSI: registration number 13655.",
  );
  assert.equal(
    humanizeIrelandProse("Registered with the Irish Medical Council. IMC number 123456."),
    "Registered with the Irish Medical Council: IMC number 123456.",
  );
  assert.equal(
    humanizeIrelandProse("A graduate member of the society. PSI registration number 13655."),
    "A graduate member of the society: PSI registration number 13655.",
  );
});

test("humanizes rich HTML without changing its markup", () => {
  assert.equal(
    humanizeIrelandHtml(
      "<h2>Cardiology — What we cover</h2><p>Your history matters — bring recent results.</p><ul><li>Palpitations — symptom review</li><li>Assessment of symptoms — chest pain, palpitations — in context</li></ul>",
    ),
    "<h2>Cardiology: What we cover</h2><p>Your history matters: bring recent results.</p><ul><li>Palpitations: symptom review</li><li>Assessment of symptoms: chest pain, palpitations, in context</li></ul>",
  );
});

test("keeps multi-part headings and list items readable", () => {
  assert.equal(
    humanizeIrelandHtml(
      "<h2>What Remote Cardiology Covers — And What Requires In-Person Assessment</h2><ul><li>Review of existing results — ECG, echo, Holter</li></ul>",
    ),
    "<h2>What Remote Cardiology Covers And What Requires In-Person Assessment</h2><ul><li>Review of existing results: ECG, echo, Holter</li></ul>",
  );
});

test("removes every em dash and leaves null values unchanged", () => {
  assert.equal(humanizeIrelandProse(null), null);
  assert.equal(humanizeIrelandHtml(null), null);
  assert.doesNotMatch(humanizeIrelandProse("One — two — three") ?? "", /—/);
  assert.doesNotMatch(humanizeIrelandHtml("<p>One — two — three</p>") ?? "", /—/);
});

test("rewrites nested CMS JSON immutably", () => {
  const source = {
    title: "Why choose us — Ireland",
    items: ["Secure care — from registered doctors"],
    faq: [{ question: "Who can book — and when?", answer: "Book online — slots vary." }],
  };

  assert.deepEqual(humanizeIrelandJson(source), {
    title: "Why choose us: Ireland",
    items: ["Secure care, from registered doctors"],
    faq: [{ question: "Who can book, and when?", answer: "Book online: slots vary." }],
  });
  assert.equal(source.title, "Why choose us — Ireland");
});
