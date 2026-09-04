import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CZECHIA_BLOG_SEO_DRAFTS,
  CZECHIA_DOCTOR_PROFILE_SEO_DRAFTS,
  CZECHIA_TOOL_SEO_DRAFTS,
  assertCzechiaBlogMetadataReadback,
  assertCzechiaClinicalPromotionGate,
  assertCzechiaDoctorMetadataReadback,
  czechiaClinicalDraftApprovalSha256,
  czechiaClinicalDraftConfirmationToken,
  findCzechiaClinicalRegisterRow,
  validateCzechiaProfileBlogToolDrafts,
  type CzechiaDoctorProfileSeoDraft,
} from "./czechia-profile-blog-tool-seo-drafts.js";

describe("Czechia profile, blog and tool SEO drafts", () => {
  it("contains exactly the approved metadata-only scope", () => {
    assert.equal(CZECHIA_DOCTOR_PROFILE_SEO_DRAFTS.length, 5);
    assert.equal(CZECHIA_BLOG_SEO_DRAFTS.length, 2);
    assert.equal(CZECHIA_TOOL_SEO_DRAFTS.length, 7);

    assert.deepEqual(
      CZECHIA_BLOG_SEO_DRAFTS.map(({ slug }) => slug),
      ["diabetes-ticha-nemoc", "lekar-online-24-7-co-vyresi"],
    );
    assert.ok(
      !CZECHIA_BLOG_SEO_DRAFTS.some(({ slug }) =>
        [
          "neschopenka-jak-funguje-eneschopenka",
          "vypocet-nemocenske-2026-co-plati-zamestnavatel-a-co-cssz",
        ].includes(slug),
      ),
    );
    assert.deepEqual(
      CZECHIA_BLOG_SEO_DRAFTS.find(({ slug }) => slug === "lekar-online-24-7-co-vyresi")
        ?.desired,
      {
        title: "Co vyřeší lékař online a kdy nestačí",
        seoTitle: "Lékař online 24/7: co lze řešit a kdy nestačí",
        seoDescription:
          "Zjistěte, co lze bezpečně probrat s lékařem online, jak konzultace probíhá a kdy je nutné osobní nebo akutní vyšetření.",
      },
    );
  });

  it("keeps bios and credentials immutable while replacing only source-pinned doctor FAQs", () => {
    for (const draft of CZECHIA_DOCTOR_PROFILE_SEO_DRAFTS) {
      assert.deepEqual(Object.keys(draft.desired).sort(), [
        "seoDescription",
        "seoKeywords",
        "seoTitle",
      ]);
      assert.ok(draft.faqReplacements.length >= 1);
      assert.ok(draft.faqReplacements.every(({ id }) => /^cmr[a-z0-9]+$/.test(id)));
    }
    for (const draft of CZECHIA_BLOG_SEO_DRAFTS) {
      assert.deepEqual(Object.keys(draft.desired).sort(), [
        "seoDescription",
        "seoTitle",
        "title",
      ]);
      assert.deepEqual(draft.faqReplacements, []);
    }
    for (const draft of CZECHIA_TOOL_SEO_DRAFTS) {
      assert.deepEqual(Object.keys(draft.desired).sort(), [
        "h1Accent",
        "h1Lead",
        "h1Trail",
        "metaDescription",
        "metaTitle",
      ]);
      assert.deepEqual(draft.faqReplacements, []);
    }
  });

  it("removes same-day and guaranteed-outcome claims from doctor FAQ replacements", () => {
    const drafts: readonly CzechiaDoctorProfileSeoDraft[] = CZECHIA_DOCTOR_PROFILE_SEO_DRAFTS;
    const text = JSON.stringify(
      drafts.flatMap(({ faqReplacements }) => faqReplacements),
    );
    assert.doesNotMatch(text, /ve stejný den|ještě dnes|jistý výsledek|automaticky/i);
    assert.match(text, /rezervačním kalendáři/);
  });

  it("keeps every draft hashable, source-pinned and deslop-clean", () => {
    assert.deepEqual(validateCzechiaProfileBlogToolDrafts(), []);
    for (const draft of [
      ...CZECHIA_DOCTOR_PROFILE_SEO_DRAFTS,
      ...CZECHIA_BLOG_SEO_DRAFTS,
      ...CZECHIA_TOOL_SEO_DRAFTS,
    ]) {
      assert.match(draft.expectedSourceSha256, /^[a-f0-9]{64}$/);
      assert.match(czechiaClinicalDraftApprovalSha256(draft), /^[a-f0-9]{64}$/);
      assert.match(
        czechiaClinicalDraftConfirmationToken(draft),
        /^CZ-SEO-(DOCTOR|BLOG|TOOL):[a-z0-9-]+:[a-f0-9]{16}$/,
      );
    }
  });

  it("reads quoted clinical-register rows by exact asset path", () => {
    const csv = [
      "asset,asset_type,review_domain,reason,claim_guardrail,official_source,priority,reviewer_requirement,status",
      '/czechia/cs/tools/bmi-calculator,tool,BMI interpretation,"formula, categories, limitations","Educational estimate only",https://example.test,P2,Czech-licensed physician,pending',
    ].join("\n");
    assert.deepEqual(findCzechiaClinicalRegisterRow(csv, "/czechia/cs/tools/bmi-calculator"), {
      asset: "/czechia/cs/tools/bmi-calculator",
      reviewerRequirement: "Czech-licensed physician",
      status: "pending",
    });
  });

  it("never lets CLI approval values bypass a pending register row", () => {
    const draft = CZECHIA_TOOL_SEO_DRAFTS[0];
    assert.doesNotThrow(() =>
      assertCzechiaClinicalPromotionGate({
        apply: false,
        draft,
        registerStatus: "pending",
        reviewedAt: null,
        reviewerId: null,
        approvedHash: null,
        confirmation: null,
      }),
    );
    assert.throws(
      () =>
        assertCzechiaClinicalPromotionGate({
          apply: true,
          draft,
          registerStatus: "pending",
          reviewedAt: new Date("2026-09-01T12:00:00.000Z"),
          reviewerId: "doctor-1",
          approvedHash: czechiaClinicalDraftApprovalSha256(draft),
          confirmation: czechiaClinicalDraftConfirmationToken(draft),
        }),
      /register.*approved/i,
    );
  });

  it("requires every exact approval input after the register is approved", () => {
    const draft = CZECHIA_DOCTOR_PROFILE_SEO_DRAFTS[0];
    const valid = {
      apply: true,
      draft,
      registerStatus: "approved",
      reviewedAt: new Date("2025-01-01T12:00:00.000Z"),
      reviewerId: "doctor-1",
      approvedHash: czechiaClinicalDraftApprovalSha256(draft),
      confirmation: czechiaClinicalDraftConfirmationToken(draft),
    } as const;

    assert.throws(
      () => assertCzechiaClinicalPromotionGate({ ...valid, reviewedAt: null }),
      /review date/i,
    );
    assert.throws(
      () => assertCzechiaClinicalPromotionGate({ ...valid, reviewerId: null }),
      /reviewer/i,
    );
    assert.throws(
      () => assertCzechiaClinicalPromotionGate({ ...valid, approvedHash: "wrong" }),
      /exact reviewed copy/i,
    );
    assert.throws(
      () => assertCzechiaClinicalPromotionGate({ ...valid, confirmation: "wrong" }),
      /confirmation/i,
    );
    assert.doesNotThrow(() => assertCzechiaClinicalPromotionGate(valid));
  });

  it("requires exact doctor and blog metadata readback", () => {
    const doctor = CZECHIA_DOCTOR_PROFILE_SEO_DRAFTS[0];
    assert.doesNotThrow(() =>
      assertCzechiaDoctorMetadataReadback(doctor, {
        seoTitle: doctor.desired.seoTitle,
        seoDescription: doctor.desired.seoDescription,
        seoKeywords: doctor.desired.seoKeywords,
      }),
    );
    assert.throws(
      () =>
        assertCzechiaDoctorMetadataReadback(doctor, {
          seoTitle: doctor.desired.seoTitle,
          seoDescription: "stale",
          seoKeywords: doctor.desired.seoKeywords,
        }),
      /metadata readback/i,
    );

    const blog = CZECHIA_BLOG_SEO_DRAFTS[0];
    assert.doesNotThrow(() => assertCzechiaBlogMetadataReadback(blog, blog.desired));
    assert.throws(
      () => assertCzechiaBlogMetadataReadback(blog, { ...blog.desired, title: "stale" }),
      /metadata readback/i,
    );
  });
});
