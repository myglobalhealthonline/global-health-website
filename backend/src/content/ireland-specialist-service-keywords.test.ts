import assert from "node:assert/strict";
import test from "node:test";

import {
  IRELAND_SPECIALIST_SERVICE_KEYWORD_VERSION,
  irelandSpecialistServiceKeywordMap,
  irelandSpecialistServiceLocalizedSeoUpdates,
  irelandSpecialistServiceSeoUpdates,
} from "./ireland-specialist-service-keywords.js";

const expectedSlugs = [
  "cardiology-specialist-consultation",
  "neurology-specialist-consultation",
  "nutrition-specialist-consultation",
  "paediatric-specialist-consultation",
  "physiotherapy-specialist-consultation",
  "psychiatry-specialist-consultation",
  "psychology-specialist-consultation",
].sort();

const localizedLocales = ["CS", "DE", "ES", "PT", "RO"].sort();

test("maps exactly the seven canonical Ireland specialist services", () => {
  assert.match(
    IRELAND_SPECIALIST_SERVICE_KEYWORD_VERSION,
    /^IE-SPECIALIST-SERVICE-KEYWORDS-/,
  );
  assert.deepEqual(
    irelandSpecialistServiceKeywordMap.map(({ slug }) => slug).sort(),
    expectedSlugs,
  );
  assert.equal(
    new Set(irelandSpecialistServiceKeywordMap.map(({ slug }) => slug)).size,
    7,
  );
});

test("provides all six locale variants for every specialist service", () => {
  assert.equal(irelandSpecialistServiceSeoUpdates.length, 7);
  assert.equal(irelandSpecialistServiceLocalizedSeoUpdates.length, 35);
  assert.deepEqual(
    irelandSpecialistServiceSeoUpdates.map(({ slug }) => slug).sort(),
    expectedSlugs,
  );

  for (const slug of expectedSlugs) {
    const localized = irelandSpecialistServiceLocalizedSeoUpdates.filter(
      (update) => update.slug === slug,
    );

    assert.deepEqual(
      localized.map(({ locale }) => locale).sort(),
      localizedLocales,
      `${slug} must have CS, DE, ES, PT and RO copy in addition to English`,
    );
  }
});

test("keeps English and localized search snippets concise", () => {
  for (const update of irelandSpecialistServiceSeoUpdates) {
    assert.ok(update.seoTitle.length <= 62, `${update.slug} title is too long`);
    assert.ok(
      update.seoDescription.length >= 100,
      `${update.slug} description is too short`,
    );
    assert.ok(
      update.seoDescription.length <= 165,
      `${update.slug} description is too long`,
    );
    assert.ok(update.heroTitle.length <= 80, `${update.slug} H1 is too long`);
    assert.ok(update.seoKeywords.length >= 3, `${update.slug} needs focused keywords`);
  }

  for (const update of irelandSpecialistServiceLocalizedSeoUpdates) {
    assert.ok(
      update.seoTitle.length <= 80,
      `${update.locale}/${update.slug} title is too long`,
    );
    assert.ok(
      update.seoDescription.length >= 100,
      `${update.locale}/${update.slug} description is too short`,
    );
    assert.ok(
      update.seoDescription.length <= 180,
      `${update.locale}/${update.slug} description is too long`,
    );
    assert.ok(
      update.heroTitle.length <= 80,
      `${update.locale}/${update.slug} H1 is too long`,
    );
  }
});

test("assigns one distinct primary intent owner to each specialist service", () => {
  const primaryKeywords = irelandSpecialistServiceKeywordMap.map(({ primaryKeyword }) =>
    primaryKeyword.toLowerCase(),
  );

  assert.equal(new Set(primaryKeywords).size, primaryKeywords.length);
  assert.deepEqual(
    Object.fromEntries(
      irelandSpecialistServiceKeywordMap.map(({ slug, primaryKeyword }) => [
        slug,
        primaryKeyword,
      ]),
    ),
    {
      "cardiology-specialist-consultation": "cardiologist ireland",
      "neurology-specialist-consultation": "neurologist ireland",
      "nutrition-specialist-consultation": "online nutritionist ireland",
      "paediatric-specialist-consultation": "paediatrician ireland",
      "physiotherapy-specialist-consultation": "online physiotherapy consultation",
      "psychiatry-specialist-consultation": "online psychiatrist ireland",
      "psychology-specialist-consultation": "online psychologist ireland",
    },
  );
});

test("keeps specialist intent separate from GP mental-health and paediatric care", () => {
  const bySlug = new Map(
    irelandSpecialistServiceKeywordMap.map((entry) => [entry.slug, entry]),
  );
  const psychiatry = bySlug.get("psychiatry-specialist-consultation");
  const psychology = bySlug.get("psychology-specialist-consultation");
  const paediatrics = bySlug.get("paediatric-specialist-consultation");

  assert.ok(psychiatry);
  assert.ok(psychology);
  assert.ok(paediatrics);
  assert.doesNotMatch(psychiatry.primaryKeyword, /mental health consultation/i);
  assert.doesNotMatch(psychology.primaryKeyword, /mental health consultation/i);
  assert.doesNotMatch(paediatrics.primaryKeyword, /paediatric gp|children's doctor/i);
  assert.match(psychiatry.excludedKeywords.join(" "), /GP mental health/i);
  assert.match(psychology.excludedKeywords.join(" "), /GP mental health/i);
  assert.match(paediatrics.excludedKeywords.join(" "), /paediatric GP/i);
});

test("records evidence and exclusions for every keyword decision", () => {
  for (const entry of irelandSpecialistServiceKeywordMap) {
    assert.ok(entry.evidence.length > 0, `${entry.slug} must record evidence`);
    assert.ok(
      entry.excludedKeywords.length > 0,
      `${entry.slug} must record excluded terms`,
    );
    assert.ok(
      entry.secondaryKeywords.length >= 2,
      `${entry.slug} needs supporting long-tail terms`,
    );
  }
});

test("rejects unsupported credentials, outcomes and access promises", () => {
  const prohibited = [
    /consultant neurologist|neurologista consultor|neurólogo consultor|konzultant neurolog|neurolog consultant|leitender neurolog/i,
    /CORU[- ]registered physiotherapist/i,
    /CORU[- ]registered psychologist/i,
    /guaranteed (?:diagnosis|outcome|recovery|result|treatment)|resultado garantid[oa]|garantiertes? (?:Ergebnis|Behandlung)|rezultat garantat|zaručen(?:ý|é) (?:výsledek|léčení)/i,
    /same[- ]day (?:appointment|consultation|specialist)|consulta (?:no mesmo dia|el mismo día)|am selben Tag|în aceeași zi|tentýž den/i,
    /no (?:GP )?referral (?:is )?(?:needed|required)|sem encaminhamento|sin derivación|ohne Überweisung|fără trimitere|bez doporučení/i,
  ];
  const searchableCopy = [
    ...irelandSpecialistServiceSeoUpdates,
    ...irelandSpecialistServiceLocalizedSeoUpdates,
  ];

  for (const update of searchableCopy) {
    const copy = JSON.stringify(update);
    for (const pattern of prohibited) {
      assert.doesNotMatch(copy, pattern, `${update.slug} contains ${pattern}`);
    }
  }

  for (const entry of irelandSpecialistServiceKeywordMap) {
    const targets = [entry.primaryKeyword, ...entry.secondaryKeywords].join(" ");
    for (const pattern of prohibited) {
      assert.doesNotMatch(targets, pattern, `${entry.slug} targets ${pattern}`);
    }
  }
});
