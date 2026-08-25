import assert from "node:assert/strict";
import test from "node:test";

import {
  IRELAND_GENERAL_SERVICE_KEYWORD_VERSION,
  irelandGeneralServiceLocalizedSeoUpdates,
  irelandGeneralServiceKeywordMap,
  irelandGeneralServiceSeoUpdates,
} from "./ireland-general-service-keywords.js";

const expectedSlugs = [
  "acute-medical-consultation",
  "aesthetic-medicine-consultation",
  "chronic-disease-consultation",
  "hair-loss-consultation",
  "mens-health-consultation",
  "mental-health-consultation",
  "musculoskeletal-pain-assessment",
  "paediatric-consultation",
  "referral-and-investigations",
  "second-opinion-consultation",
  "sick-certificate-ireland",
  "skin-dermatology-consultation",
  "travel-health-consultation",
  "treatment-review",
  "weight-management-consultation",
  "womens-health-consultation",
].sort();

test("maps exactly the 16 active Ireland GP-level services", () => {
  assert.deepEqual(
    irelandGeneralServiceKeywordMap.map(({ slug }) => slug).sort(),
    expectedSlugs,
  );
  assert.equal(new Set(irelandGeneralServiceKeywordMap.map(({ slug }) => slug)).size, 16);
});

test("provides every supported localized variant for all 16 services", () => {
  const expectedLocales = ["CS", "DE", "ES", "PT", "RO"];
  const localizedSlugs = expectedSlugs;

  assert.equal(irelandGeneralServiceLocalizedSeoUpdates.length, 80);
  assert.deepEqual(
    [...new Set(irelandGeneralServiceLocalizedSeoUpdates.map(({ slug }) => slug))].sort(),
    localizedSlugs.sort(),
  );

  for (const slug of localizedSlugs) {
    assert.deepEqual(
      irelandGeneralServiceLocalizedSeoUpdates
        .filter((update) => update.slug === slug)
        .map(({ locale }) => locale)
        .sort(),
      expectedLocales,
      `${slug} must have all five localized variants`,
    );
  }
});

test("keeps localized snippets useful and clinically conditional", () => {
  for (const update of irelandGeneralServiceLocalizedSeoUpdates) {
    assert.ok(update.seoTitle.length <= 80, `${update.locale}/${update.slug} title is too long`);
    assert.ok(
      update.seoDescription.length <= 180,
      `${update.locale}/${update.slug} description is too long`,
    );
    assert.ok(
      update.seoDescription.length >= 100,
      `${update.locale}/${update.slug} description is too short`,
    );
    assert.ok(update.heroTitle.length <= 80, `${update.locale}/${update.slug} H1 is too long`);
  }

  const conditionalServices = new Set(["referral-and-investigations", "treatment-review"]);
  const conditionPatterns = {
    PT: /clinicamente indicado|não é automática/i,
    ES: /clínicamente indicado|no es automática/i,
    CS: /klinicky indikováno|není automatické/i,
    RO: /indicat clinic|nu este automată/i,
    DE: /klinisch angezeigt|nicht automatisch/i,
  } as const;

  for (const update of irelandGeneralServiceLocalizedSeoUpdates) {
    if (!conditionalServices.has(update.slug)) continue;
    assert.match(
      update.seoDescription,
      conditionPatterns[update.locale],
      `${update.locale}/${update.slug} must retain the clinical condition`,
    );
  }
});

test("keeps one distinct primary intent owner per service", () => {
  const primaryKeywords = irelandGeneralServiceKeywordMap.map(({ primaryKeyword }) =>
    primaryKeyword.toLowerCase(),
  );
  assert.equal(new Set(primaryKeywords).size, primaryKeywords.length);
  assert.equal(
    irelandGeneralServiceKeywordMap.find(({ slug }) => slug === "acute-medical-consultation")
      ?.primaryKeyword,
    "same day doctor consultation ireland",
  );
  assert.ok(!primaryKeywords.includes("online gp ireland"));
});

test("records sources and exclusions instead of copying unsafe competitor terms", () => {
  for (const entry of irelandGeneralServiceKeywordMap) {
    assert.ok(entry.evidence.length > 0, `${entry.slug} must record evidence`);
    assert.ok(entry.excludedKeywords.length > 0, `${entry.slug} must record exclusions`);
  }

  const prohibited = /mirtazapine|ozempic|mounjaro|weight loss pills|travel vaccinations dublin/i;
  for (const entry of irelandGeneralServiceKeywordMap) {
    assert.doesNotMatch(
      [entry.primaryKeyword, ...entry.secondaryKeywords].join(" "),
      prohibited,
      `${entry.slug} includes a misleading competitor term`,
    );
  }
});

test("covers all 16 services in the English update batch", () => {
  assert.deepEqual(
    irelandGeneralServiceSeoUpdates.map(({ slug }) => slug).sort(),
    expectedSlugs,
  );
});

test("keeps updated snippets concise and clinically conditional", () => {
  assert.match(IRELAND_GENERAL_SERVICE_KEYWORD_VERSION, /^IE-GENERAL-SERVICE-KEYWORDS-/);

  for (const update of irelandGeneralServiceSeoUpdates) {
    assert.ok(update.seoTitle.length <= 62, `${update.slug} title is too long`);
    assert.ok(update.seoDescription.length <= 165, `${update.slug} description is too long`);
    assert.ok(update.seoDescription.length >= 100, `${update.slug} description is too short`);
    assert.ok(update.heroTitle.length <= 80, `${update.slug} H1 is too long`);
    assert.ok(update.seoKeywords.length >= 4, `${update.slug} needs a focused keyword set`);
    assert.doesNotMatch(
      `${update.seoTitle} ${update.seoDescription} ${update.heroTitle}`,
      /guaranteed|guarantee|prescription issued|no referral needed|cure/i,
    );
  }

  const referral = irelandGeneralServiceSeoUpdates.find(
    ({ slug }) => slug === "referral-and-investigations",
  );
  const treatment = irelandGeneralServiceSeoUpdates.find(({ slug }) => slug === "treatment-review");
  assert.match(referral?.seoDescription ?? "", /when clinically indicated/i);
  assert.match(treatment?.seoDescription ?? "", /not automatic/i);
});
