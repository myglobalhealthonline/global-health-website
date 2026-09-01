import assert from "node:assert/strict";
import test from "node:test";

import {
  CZECHIA_PAGE_CONTENT_SEO_DRAFTS,
  assertCzechiaPageContentApplyGate,
  czechiaPageContentApprovalSha256,
  czechiaPageContentConfirmationToken,
  validateCzechiaPageContentSeoDraft,
} from "./czechia-page-content-seo-drafts.js";

test("covers only the three eligible Czechia PageContent targets", () => {
  assert.deepEqual(
    CZECHIA_PAGE_CONTENT_SEO_DRAFTS.map(({ key }) => key),
    ["home-cs", "home-en", "doctors-cs"],
  );
  assert.ok(CZECHIA_PAGE_CONTENT_SEO_DRAFTS.every(({ countryCode }) => countryCode === "cz"));
  assert.deepEqual(
    CZECHIA_PAGE_CONTENT_SEO_DRAFTS.map(({ pageKey }) => pageKey),
    ["HOME", "HOME", "DOCTORS_INDEX"],
  );
});

test("matches the approved matrix keyword and copy fields", () => {
  const [homeCs, homeEn, doctorsCs] = CZECHIA_PAGE_CONTENT_SEO_DRAFTS;

  assert.equal(homeCs.primaryKeyword, "online lékař Česko");
  assert.equal(homeCs.copy.seoTitle, "Online lékař v Česku | Registrovaní lékaři");
  assert.equal(homeEn.primaryKeyword, "online doctor Czech Republic");
  assert.equal(homeEn.copy.heroTitle, "Online medical care in the Czech Republic");
  assert.equal(doctorsCs.primaryKeyword, "online lékaři Česko");
  assert.equal(doctorsCs.copy.seoTitle, "Online lékaři v Česku | Ověřené profily");
  assert.equal(doctorsCs.copy.heroTitle, "Online lékaři v Česku");
  assert.equal(
    doctorsCs.copy.heroSubtitle,
    "Vyberte si z ověřených profilů lékařů registrovaných v Česku. U každého najdete jazyky, registrační údaje a aktuální možnost rezervace.",
  );
});

test("keeps every draft concise and free of unsupported promises", () => {
  for (const draft of CZECHIA_PAGE_CONTENT_SEO_DRAFTS) {
    assert.deepEqual(validateCzechiaPageContentSeoDraft(draft), [], draft.key);
  }
});

test("binds approval to the exact copy and blocks pending clinical rows", () => {
  const draft = CZECHIA_PAGE_CONTENT_SEO_DRAFTS[0];
  const approvedHash = czechiaPageContentApprovalSha256(draft);
  const confirmation = czechiaPageContentConfirmationToken(draft);
  const reviewedAt = new Date("2026-09-01T12:00:00.000Z");

  assert.match(approvedHash, /^[a-f0-9]{64}$/);
  assert.doesNotThrow(() =>
    assertCzechiaPageContentApplyGate({
      apply: false,
      registerStatus: "pending",
      draft,
      approvedHash: null,
      reviewedAt: null,
      reviewerId: null,
      nativeReviewerId: null,
      nativeReviewedAt: null,
      confirmation: null,
    }),
  );
  assert.throws(
    () =>
      assertCzechiaPageContentApplyGate({
        apply: true,
        registerStatus: "pending",
        draft,
        approvedHash,
        reviewedAt,
        reviewerId: "reviewer-1",
        nativeReviewerId: null,
        nativeReviewedAt: null,
        confirmation,
      }),
    /clinical register status=approved/i,
  );
  assert.throws(
    () =>
      assertCzechiaPageContentApplyGate({
        apply: true,
        registerStatus: "approved",
        draft,
        approvedHash: "0".repeat(64),
        reviewedAt,
        reviewerId: "reviewer-1",
        nativeReviewerId: null,
        nativeReviewedAt: null,
        confirmation,
      }),
    /exact reviewed copy/i,
  );
  assert.doesNotThrow(() =>
    assertCzechiaPageContentApplyGate({
      apply: true,
      registerStatus: "approved",
      draft,
      approvedHash,
      reviewedAt,
      reviewerId: "reviewer-1",
      nativeReviewerId: null,
      nativeReviewedAt: null,
      confirmation,
    }),
  );
});

test("requires a separate native editor for the English Czechia home", () => {
  const draft = CZECHIA_PAGE_CONTENT_SEO_DRAFTS[1];
  const input = {
    apply: true,
    registerStatus: "approved",
    draft,
    approvedHash: czechiaPageContentApprovalSha256(draft),
    reviewedAt: new Date("2026-09-01T12:00:00.000Z"),
    reviewerId: "clinical-reviewer",
    nativeReviewerId: null,
    nativeReviewedAt: null,
    confirmation: czechiaPageContentConfirmationToken(draft),
  } as const;

  assert.throws(() => assertCzechiaPageContentApplyGate(input), /native English reviewer/i);
  assert.throws(
    () => assertCzechiaPageContentApplyGate({ ...input, nativeReviewerId: "native-editor" }),
    /native English review date/i,
  );
  assert.doesNotThrow(() =>
    assertCzechiaPageContentApplyGate({
      ...input,
      nativeReviewerId: "native-editor",
      nativeReviewedAt: new Date("2026-09-01T12:00:00.000Z"),
    }),
  );
});
