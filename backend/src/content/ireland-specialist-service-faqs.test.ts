import assert from "node:assert/strict";
import test from "node:test";

import {
  IRELAND_SPECIALIST_SERVICE_FAQ_VERSION,
  irelandSpecialistServiceFaqAdditions,
} from "./ireland-specialist-service-faqs.js";

const expectedSlugs = [
  "cardiology-specialist-consultation",
  "neurology-specialist-consultation",
  "nutrition-specialist-consultation",
  "paediatric-specialist-consultation",
  "physiotherapy-specialist-consultation",
  "psychiatry-specialist-consultation",
  "psychology-specialist-consultation",
].sort();

const expectedLocales = ["CS", "DE", "ES", "PT", "RO"].sort();

test("adds one focused FAQ to each Ireland specialist service", () => {
  assert.match(IRELAND_SPECIALIST_SERVICE_FAQ_VERSION, /^IE-SPECIALIST-FAQ-/);
  assert.deepEqual(
    irelandSpecialistServiceFaqAdditions.map(({ slug }) => slug).sort(),
    expectedSlugs,
  );

  for (const entry of irelandSpecialistServiceFaqAdditions) {
    assert.deepEqual(
      entry.translations.map(({ locale }) => locale).sort(),
      expectedLocales,
      `${entry.slug} must cover every non-English Ireland locale`,
    );
    assert.ok(entry.question.length >= 35, `${entry.slug} question is too thin`);
    assert.ok(entry.answer.length >= 100, `${entry.slug} answer is too thin`);
  }
});

test("uses page-specific search language without keyword stuffing", () => {
  const expectedEnglishIntent = new Map([
    ["cardiology-specialist-consultation", /online cardiology consultation in Ireland/i],
    ["neurology-specialist-consultation", /online neurology consultation in Ireland/i],
    ["nutrition-specialist-consultation", /online nutrition consultation in Ireland/i],
    ["paediatric-specialist-consultation", /online paediatric consultation in Ireland/i],
    ["physiotherapy-specialist-consultation", /online physiotherapy consultation in Ireland/i],
    ["psychiatry-specialist-consultation", /online psychiatry consultation in Ireland/i],
    ["psychology-specialist-consultation", /online psychology consultation in Ireland/i],
  ]);

  for (const entry of irelandSpecialistServiceFaqAdditions) {
    assert.match(`${entry.question} ${entry.answer}`, expectedEnglishIntent.get(entry.slug)!);
    const words = entry.question.toLowerCase().match(/[a-z]+/g) ?? [];
    assert.ok(new Set(words).size / words.length > 0.7, `${entry.slug} repeats too many words`);
  }
});

test("keeps the FAQ copy natural and medically cautious", () => {
  const copy = JSON.stringify(irelandSpecialistServiceFaqAdditions);
  assert.doesNotMatch(copy, /—|&mdash;|\u2014/);
  assert.doesNotMatch(copy, /best (?:doctor|specialist)|guaranteed|same[- ]day/i);
  assert.doesNotMatch(copy, /no (?:GP )?referral (?:is )?(?:needed|required)/i);
  assert.doesNotMatch(copy, /emergency (?:diagnosis|treatment) online/i);
});
