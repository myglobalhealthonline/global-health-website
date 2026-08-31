import assert from "node:assert/strict";
import test from "node:test";

import {
  CZECHIA_SEO_SERVICE_DRAFTS,
  assertCzechiaSeoApplyGate,
  czechiaSeoApprovalSha256,
  czechiaSeoConfirmationToken,
  parseCzechiaSeoReviewDate,
  validateCzechiaSeoServiceDraft,
} from "./czechia-seo-service-drafts.js";

const expectedSlugs = ["neschopenka-online", "obnoveni-lecby"];

test("scopes the review-gated batch to the two eligible Czech services", () => {
  assert.deepEqual(CZECHIA_SEO_SERVICE_DRAFTS.map(({ slug }) => slug), expectedSlugs);
  assert.ok(CZECHIA_SEO_SERVICE_DRAFTS.every(({ countryCode }) => countryCode === "cz"));
  assert.ok(CZECHIA_SEO_SERVICE_DRAFTS.every(({ locale }) => locale === "CS"));
});

test("keeps one commercial keyword owner per service", () => {
  const [sickNote, renewal] = CZECHIA_SEO_SERVICE_DRAFTS;

  assert.equal(sickNote.primaryKeyword, "online neschopenka");
  assert.equal(renewal.primaryKeyword, "obnovení receptu online");
  assert.match(`${sickNote.seoTitle} ${sickNote.heroTitle}`.toLowerCase(), /online neschopenka/);
  assert.match(`${renewal.seoTitle} ${renewal.heroTitle}`.toLowerCase(), /obnovení (léčby|receptu)/);
});

test("ships concise, assessment-first metadata and content", () => {
  for (const draft of CZECHIA_SEO_SERVICE_DRAFTS) {
    assert.deepEqual(validateCzechiaSeoServiceDraft(draft), [], draft.slug);
    assert.ok(draft.seoTitle.length <= 60, `${draft.slug} SEO title is too long`);
    assert.ok(draft.seoDescription.length >= 110, `${draft.slug} meta is too short`);
    assert.ok(draft.seoDescription.length <= 160, `${draft.slug} meta is too long`);
    assert.match(draft.detailBody, /155.*112|112.*155/);
    assert.match(draft.detailBody, /https:\/\//);
    assert.ok(draft.faqs.length >= 5, `${draft.slug} needs useful visible FAQs`);
  }
});

test("removes volatile entitlement figures and unconditional medical promises", () => {
  const text = JSON.stringify(CZECHIA_SEO_SERVICE_DRAFTS);

  assert.doesNotMatch(text, /term[ií]n (ještě )?dnes|ve stejný den|bez čekání/i);
  assert.doesNotMatch(text, /4\s?500|12\s?000|243\s?Kč|dny 1[–-]14|od dne 15/i);
  assert.doesNotMatch(text, /vystaví potřebné žádanky|stejnou klinickou platnost/i);
  assert.doesNotMatch(text, /recept je automaticky obnoven|neschopenka ihned/i);
});

test("links each page to its official source and correct supporting owner", () => {
  const [sickNote, renewal] = CZECHIA_SEO_SERVICE_DRAFTS;

  assert.match(sickNote.detailBody, /cssz\.gov\.cz\/web\/eneschopenka/);
  assert.match(sickNote.detailBody, /\/czechia\/cs\/blog\/neschopenka-jak-funguje-eneschopenka/);
  assert.match(renewal.detailBody, /epreskripce\.cz/);
  assert.match(renewal.detailBody, /\/czechia\/cs\/gp-consultation-online/);
});

test("binds approval to the exact final copy and a real review date", () => {
  const draft = CZECHIA_SEO_SERVICE_DRAFTS[0];
  const hash = czechiaSeoApprovalSha256(draft);

  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(parseCzechiaSeoReviewDate("2026-08-31")?.toISOString(), "2026-08-31T12:00:00.000Z");
  assert.throws(() => parseCzechiaSeoReviewDate("2026-02-31"), /valid calendar date/i);
  assert.throws(() => parseCzechiaSeoReviewDate("2099-01-01"), /future/i);
  assert.doesNotThrow(() => assertCzechiaSeoApplyGate(false, draft, null, null, null, null));
  assert.throws(
    () => assertCzechiaSeoApplyGate(true, draft, null, hash, "doctor-id", "token"),
    /review date/i,
  );
  assert.throws(
    () =>
      assertCzechiaSeoApplyGate(
        true,
        draft,
        parseCzechiaSeoReviewDate("2026-08-31"),
        "wrong",
        "doctor-id",
        "token",
      ),
    /exact reviewed copy/i,
  );
  assert.doesNotThrow(() =>
    assertCzechiaSeoApplyGate(
      true,
      draft,
      parseCzechiaSeoReviewDate("2026-08-31"),
      hash,
      "doctor-id",
      czechiaSeoConfirmationToken(draft),
    ),
  );
});
