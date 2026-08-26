import assert from "node:assert/strict";
import test from "node:test";

import {
  IRELAND_DOCTOR_PROFILE_FAQ_VERSION,
  irelandDoctorProfileFaqAdditions,
} from "./ireland-doctor-profile-faqs.js";

const expectedLocales = ["CS", "DE", "EN", "ES", "PT", "RO"].sort();

test("fills only the verified eligible Ireland profile with missing FAQs", () => {
  assert.match(IRELAND_DOCTOR_PROFILE_FAQ_VERSION, /^IE-DOCTOR-FAQ-/);
  assert.deepEqual(irelandDoctorProfileFaqAdditions.map(({ slug }) => slug), ["roney-carli"]);

  const roney = irelandDoctorProfileFaqAdditions[0];
  assert.ok(roney);
  assert.deepEqual(
    [...new Set(roney.faqs.map(({ locale }) => locale))].sort(),
    expectedLocales,
  );
  for (const locale of expectedLocales) {
    const localized = roney.faqs.filter((faq) => faq.locale === locale);
    assert.equal(localized.length, 5, `${locale} needs five useful FAQs`);
    assert.equal(new Set(localized.map(({ question }) => question.toLowerCase())).size, 5);
  }
});

test("keeps the Roney Carli FAQs traceable to the existing public profile", () => {
  const copy = JSON.stringify(irelandDoctorProfileFaqAdditions);
  assert.match(copy, /Roney Carli/);
  assert.match(copy, /manual therap/i);
  assert.match(copy, /Portuguese/i);
  assert.match(copy, /Kinesiology/i);
  assert.match(copy, /Neuromuscular Therapy/i);
  assert.doesNotMatch(copy, /Ireland|Irlanda|Irsku|Irsko|Irland/i);
  assert.doesNotMatch(copy, /online (?:appointment|consultation|treatment)/i);
  assert.doesNotMatch(copy, /registered (?:chiropractor|physiotherapist)|CORU|Irish Medical Council/i);
});

test("avoids AI tells and unsupported marketing claims", () => {
  const copy = JSON.stringify(irelandDoctorProfileFaqAdditions);
  assert.doesNotMatch(copy, /—|&mdash;|\u2014/);
  assert.doesNotMatch(copy, /best|leading|exceptional|guaranteed|same[- ]day/i);
  assert.doesNotMatch(copy, /one-size-fits-all|delve|navigate the|holistic journey/i);
});
