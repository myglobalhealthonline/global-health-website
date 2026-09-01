import assert from "node:assert/strict";
import test from "node:test";

import {
  CZECHIA_SEO_SERVICE_DRAFTS,
  assertCzechiaSeoApplyGate,
  czechiaSeoApprovalSha256,
  czechiaSeoConfirmationToken,
  parseCzechiaSeoNativeReviewDate,
  parseCzechiaSeoReviewDate,
  type CzechiaSeoServiceDraft,
  validateCzechiaSeoServiceDraft,
} from "./czechia-seo-service-drafts.js";

const expectedAssets = [
  "CS:bolesti-pohyboveho-aparatu",
  "CS:cestovni-medicina-praha",
  "CS:chronicka-onemocneni",
  "CS:detsky-lekar-online",
  "CS:doporuceni-a-vysetreni",
  "CS:druhy-nazor-praha",
  "CS:dusevni-zdravi-online",
  "CS:kontrola-vahy-online",
  "CS:kozni-konzultace-praha",
  "CS:lekar-online-praha",
  "EN:lekar-online-praha",
  "CS:muzske-zdravi-online",
  "CS:neschopenka-online",
  "CS:obnoveni-lecby",
  "CS:vypadavani-vlasu-online",
  "CS:zenske-zdravi-online",
];

test("scopes the review-gated batch to every eligible Czech service variant", () => {
  assert.deepEqual(
    CZECHIA_SEO_SERVICE_DRAFTS.map(({ locale, slug }) => `${locale}:${slug}`),
    expectedAssets,
  );
  assert.ok(CZECHIA_SEO_SERVICE_DRAFTS.every(({ countryCode }) => countryCode === "cz"));
});

test("keeps one commercial keyword owner per service variant", () => {
  const sickNote = CZECHIA_SEO_SERVICE_DRAFTS.find(({ slug }) => slug === "neschopenka-online")!;
  const renewal = CZECHIA_SEO_SERVICE_DRAFTS.find(({ slug }) => slug === "obnoveni-lecby")!;

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
    if (draft.detailBody) assert.match(draft.detailBody, /155.*112|112.*155/);
    if (draft.detailBody) assert.match(draft.detailBody, /https:\/\//);
  }
});

test("rewrites only the unsafe published FAQ sets by exact record id", () => {
  const exactFaqAssets = CZECHIA_SEO_SERVICE_DRAFTS
    .filter(({ faqs }) => faqs.length > 0)
    .map(({ locale, slug }) => `${locale}:${slug}`);

  assert.deepEqual(exactFaqAssets, [
    "CS:cestovni-medicina-praha",
    "CS:detsky-lekar-online",
    "CS:dusevni-zdravi-online",
    "CS:kozni-konzultace-praha",
    "CS:lekar-online-praha",
    "EN:lekar-online-praha",
    "CS:neschopenka-online",
    "CS:obnoveni-lecby",
  ]);
  assert.ok(CZECHIA_SEO_SERVICE_DRAFTS.every(({ expectedFaqIds }) => expectedFaqIds.length >= 5));
  assert.ok(
    CZECHIA_SEO_SERVICE_DRAFTS
      .filter(({ faqs }) => faqs.length > 0)
      .every(({ faqs, expectedFaqIds }) =>
        faqs.every(({ id }) => expectedFaqIds.includes(id)),
      ),
  );
});

test("removes volatile entitlement figures and unconditional medical promises", () => {
  const text = JSON.stringify(CZECHIA_SEO_SERVICE_DRAFTS);

  assert.doesNotMatch(text, /term[ií]n (ještě )?dnes|ve stejný den|bez čekání/i);
  assert.doesNotMatch(text, /4\s?500|12\s?000|243\s?Kč|dny 1[–-]14|od dne 15/i);
  assert.doesNotMatch(text, /vystaví potřebné žádanky|stejnou klinickou platnost/i);
  assert.doesNotMatch(text, /recept je automaticky obnoven|neschopenka ihned/i);
});

test("links each full-copy page to its official source and correct supporting owner", () => {
  const sickNote = CZECHIA_SEO_SERVICE_DRAFTS.find(({ slug }) => slug === "neschopenka-online")!;
  const renewal = CZECHIA_SEO_SERVICE_DRAFTS.find(({ slug }) => slug === "obnoveni-lecby")!;
  const sickNoteBody = sickNote.detailBody;
  const renewalBody = renewal.detailBody;

  assert.ok(sickNoteBody);
  assert.ok(renewalBody);
  assert.match(sickNoteBody, /cssz\.gov\.cz\/web\/eneschopenka/);
  assert.match(sickNoteBody, /\/czechia\/cs\/blog\/neschopenka-jak-funguje-eneschopenka/);
  assert.match(renewalBody, /epreskripce\.cz/);
  assert.match(renewalBody, /\/czechia\/cs\/gp-consultation-online/);
});

test("gives every remaining high-risk service a sourced, emergency-aware full-copy draft", () => {
  const required = new Set([
    "CS:cestovni-medicina-praha",
    "CS:detsky-lekar-online",
    "CS:dusevni-zdravi-online",
    "CS:kozni-konzultace-praha",
    "CS:lekar-online-praha",
    "EN:lekar-online-praha",
  ]);

  for (const draft of CZECHIA_SEO_SERVICE_DRAFTS) {
    if (!required.has(`${draft.locale}:${draft.slug}`)) continue;
    assert.ok(draft.detailBody, `${draft.locale}:${draft.slug}`);
    assert.equal(draft.faqs.length, draft.expectedFaqIds.length);
    assert.match(draft.detailBody, /https:\/\/(?:www\.)?(?:nzip\.cz|ncez\.mzcr\.cz)/);
  }
});

test("pins the English Prague draft to the post-Czech-rollout service snapshot", () => {
  const english = CZECHIA_SEO_SERVICE_DRAFTS.find(
    ({ slug, locale }) => slug === "lekar-online-praha" && locale === "EN",
  )!;

  assert.equal(english.expectedServiceUpdatedAt, "2026-09-01T18:18:02.359Z");
  assert.equal(
    english.expectedSourceSha256,
    "c71ac9b6b975743c102646def4c4e1839d04bc15d5ae414f7103adcf35ffcc58",
  );
});

test("binds approval to the exact final copy, a real review date and an approved register row", () => {
  const draft = CZECHIA_SEO_SERVICE_DRAFTS[0]!;
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
  assert.throws(
    () =>
      assertCzechiaSeoApplyGate(
        true,
        draft,
        parseCzechiaSeoReviewDate("2026-08-31"),
        hash,
        "doctor-id",
        czechiaSeoConfirmationToken(draft),
        "pending",
      ),
    /clinical review register/i,
  );
  assert.doesNotThrow(() =>
    assertCzechiaSeoApplyGate(
      true,
      draft,
      parseCzechiaSeoReviewDate("2026-08-31"),
      hash,
      "doctor-id",
      czechiaSeoConfirmationToken(draft),
      "approved",
    ),
  );
});

test("keeps every current service apply path closed while the register is pending", () => {
  for (const draft of CZECHIA_SEO_SERVICE_DRAFTS) {
    assert.throws(
      () =>
        assertCzechiaSeoApplyGate(
          true,
          draft,
          parseCzechiaSeoReviewDate("2026-08-31"),
          czechiaSeoApprovalSha256(draft),
          "doctor-id",
          czechiaSeoConfirmationToken(draft),
          "pending",
          draft.locale === "EN" ? "native-editor-id" : null,
          draft.locale === "EN" ? parseCzechiaSeoNativeReviewDate("2026-08-31") : null,
        ),
      /clinical review register/i,
      `${draft.locale}:${draft.slug}`,
    );
  }
});

test("requires a dated native-English review only for the English Prague variant", () => {
  const english = CZECHIA_SEO_SERVICE_DRAFTS.find(({ locale }) => locale === "EN")!;
  const czech = CZECHIA_SEO_SERVICE_DRAFTS.find(({ locale }) => locale === "CS")!;
  const approved = (draft: CzechiaSeoServiceDraft) => [
    true,
    draft,
    parseCzechiaSeoReviewDate("2026-08-31"),
    czechiaSeoApprovalSha256(draft),
    "doctor-id",
    czechiaSeoConfirmationToken(draft),
    "approved",
  ] as const;

  assert.throws(() => assertCzechiaSeoApplyGate(...approved(english)), /native reviewer/i);
  assert.throws(
    () => assertCzechiaSeoApplyGate(...approved(english), "native-editor-id", null),
    /native review date/i,
  );
  assert.throws(
    () => assertCzechiaSeoApplyGate(...approved(english), "native-editor-id", new Date("invalid")),
    /valid native review date/i,
  );
  assert.throws(
    () => assertCzechiaSeoApplyGate(...approved(english), "native-editor-id", new Date("2099-01-01")),
    /future/i,
  );
  assert.doesNotThrow(() =>
    assertCzechiaSeoApplyGate(
      ...approved(english),
      "native-editor-id",
      parseCzechiaSeoNativeReviewDate("2026-08-31"),
    ),
  );
  assert.doesNotThrow(() => assertCzechiaSeoApplyGate(...approved(czech)));
  assert.throws(() => parseCzechiaSeoNativeReviewDate("2026-02-31"), /valid calendar date/i);
  assert.throws(() => parseCzechiaSeoNativeReviewDate("2099-01-01"), /future/i);
});
