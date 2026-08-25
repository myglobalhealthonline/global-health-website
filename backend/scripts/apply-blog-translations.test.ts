import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertApplySafe,
  groupDrafts,
  normalize,
  planGroup,
  slugCandidate,
  type Group,
  type SourcePost,
} from "./apply-blog-translations-lib.js";

const post: SourcePost = {
  id: "post-1",
  status: "PUBLISHED",
  isActive: true,
  title: "Source title",
  excerpt: "Source excerpt",
  body: "<p>Source body</p>",
  seoTitle: "Source SEO title",
  seoDescription: "Source SEO description",
  coverAsset: { altText: "Source cover alt" },
};

function group(field: Group["fields"] extends Map<string, infer T> ? T : never): Group {
  return {
    postId: "post-1",
    slug: "source-slug",
    targetLocale: "DE",
    fields: new Map([[field.field, field]]),
  };
}

describe("blog translation import preflight", () => {
  it("preserves sourceText and requiresHumanReview while normalizing", () => {
    const draft = normalize(
      {
        entity: "blog",
        parentId: "post-1",
        slug: "source-slug",
        field: "title",
        targetLocale: "DE",
        draftText: "Zieltitel",
        sourceText: "Source title",
        requiresHumanReview: true,
      },
      "drafts.jsonl",
    );

    assert.ok(draft);
    assert.equal(draft.sourceText, "Source title");
    assert.equal(draft.requiresHumanReview, true);
  });

  it("rejects blog drafts that cannot be checked because sourceText is missing", () => {
    assert.throws(
      () => normalize({
        entity: "blog",
        parentId: "post-1",
        field: "title",
        targetLocale: "DE",
        draftText: "Zieltitel",
      }, "drafts.jsonl"),
      /sourceText/,
    );
  });

  it("plans a field only when its current source value still matches", () => {
    const draft = normalize({
      entity: "blog",
      parentId: "post-1",
      field: "body",
      targetLocale: "DE",
      draftText: "<p>Zieltext</p>",
      sourceText: "<p>Source body</p>",
    }, "drafts.jsonl");
    assert.ok(draft);

    const result = planGroup(group(draft), post, {}, false);
    assert.equal(result.status, "ready");
    assert.deepEqual(result.applied, { content: "<p>Zieltext</p>" });
  });

  it("maps coverAlt source verification through coverAsset.altText", () => {
    const draft = normalize({
      entity: "blog",
      parentId: "post-1",
      field: "coverAlt",
      targetLocale: "DE",
      draftText: "Deutscher Alt-Text",
      sourceText: "Source cover alt",
    }, "drafts.jsonl");
    assert.ok(draft);

    assert.equal(planGroup(group(draft), post, {}, false).status, "ready");
    assert.equal(
      planGroup(group(draft), { ...post, coverAsset: { altText: "Changed" } }, {}, false).status,
      "stale",
    );
  });

  it("skips the entire group when a planned field has stale source text", () => {
    const draft = normalize({
      entity: "blog",
      parentId: "post-1",
      field: "title",
      targetLocale: "DE",
      draftText: "Zieltitel",
      sourceText: "Old source title",
    }, "drafts.jsonl");
    assert.ok(draft);

    const result = planGroup(group(draft), post, undefined, false);
    assert.equal(result.status, "stale");
    assert.deepEqual(result.applied, {});
    assert.equal(result.staleFields, 1);
  });

  it("skips inactive and unpublished source-post groups", () => {
    const draft = normalize({
      entity: "blog",
      parentId: "post-1",
      field: "title",
      targetLocale: "DE",
      draftText: "Zieltitel",
      sourceText: "Source title",
    }, "drafts.jsonl");
    assert.ok(draft);

    assert.equal(planGroup(group(draft), { ...post, isActive: false }, undefined, false).status, "inactive");
    assert.equal(planGroup(group(draft), { ...post, status: "DRAFT" }, undefined, false).status, "inactive");
  });

  it("allows an active DRAFT source only when explicitly enabled", () => {
    const draft = normalize({
      entity: "blog",
      parentId: "post-1",
      field: "title",
      targetLocale: "DE",
      draftText: "Zieltitel",
      sourceText: "Source title",
    }, "drafts.jsonl");
    assert.ok(draft);

    assert.equal(planGroup(group(draft), { ...post, status: "DRAFT" }, undefined, false).status, "inactive");
    assert.equal(planGroup(group(draft), { ...post, status: "DRAFT" }, undefined, false, true).status, "ready");
  });

  it("never overwrites a meaningful existing translation", () => {
    const draft = normalize({
      entity: "blog",
      parentId: "post-1",
      field: "title",
      targetLocale: "DE",
      draftText: "New title",
      sourceText: "Source title",
    }, "drafts.jsonl");
    assert.ok(draft);

    const result = planGroup(group(draft), post, { title: "Existing title" }, false);
    assert.equal(result.status, "no-op");
    assert.equal(result.skippedExisting, 1);
  });

  it("rejects conflicting duplicate drafts for the same post, locale, and field", () => {
    const first = normalize({
      entity: "blog",
      parentId: "post-1",
      field: "title",
      targetLocale: "DE",
      draftText: "Erster Titel",
      sourceText: "Source title",
    }, "drafts-a.jsonl");
    const second = normalize({
      entity: "blog",
      parentId: "post-1",
      field: "title",
      targetLocale: "DE",
      draftText: "Zweiter Titel",
      sourceText: "Source title",
    }, "drafts-b.jsonl");
    assert.ok(first);
    assert.ok(second);

    assert.throws(() => groupDrafts([first, second]), /conflicting blog drafts/i);
  });

  it("allows byte-identical duplicate drafts", () => {
    const first = normalize({
      entity: "blog",
      parentId: "post-1",
      field: "title",
      targetLocale: "DE",
      draftText: "Gleicher Titel",
      sourceText: "Source title",
      requiresHumanReview: true,
      validationIssues: ["check"],
    }, "drafts-a.jsonl");
    const second = normalize({
      entity: "blog",
      parentId: "post-1",
      field: "title",
      targetLocale: "DE",
      draftText: "Gleicher Titel",
      sourceText: "Source title",
      requiresHumanReview: true,
      validationIssues: ["check"],
    }, "drafts-b.jsonl");
    assert.ok(first);
    assert.ok(second);

    const groups = groupDrafts([first, second]);
    assert.equal(groups.size, 1);
    assert.equal(groups.get("post-1:DE")?.fields.get("title")?.draftText, "Gleicher Titel");
  });
});

describe("blog translation apply guard", () => {
  it("keeps fallback slugs valid when a translated title has no ASCII characters", () => {
    assert.equal(slugCandidate(""), "post");
    assert.equal(slugCandidate("", 2), "post-2");
  });

  it("fails closed before writes when any group is stale or inactive", () => {
    assert.throws(
      () => assertApplySafe({ dryRun: false, approveHumanReview: true, staleGroups: 1, inactiveGroups: 0, reviewFields: 0 }),
      /stale or inactive/i,
    );
    assert.throws(
      () => assertApplySafe({ dryRun: false, approveHumanReview: true, staleGroups: 0, inactiveGroups: 1, reviewFields: 0 }),
      /stale or inactive/i,
    );
  });

  it("requires explicit human-review approval only in apply mode", () => {
    assert.throws(
      () => assertApplySafe({ dryRun: false, approveHumanReview: false, staleGroups: 0, inactiveGroups: 0, reviewFields: 1 }),
      /--approve-human-review/,
    );
    assert.doesNotThrow(() =>
      assertApplySafe({ dryRun: true, approveHumanReview: false, staleGroups: 0, inactiveGroups: 0, reviewFields: 1 }),
    );
    assert.doesNotThrow(() =>
      assertApplySafe({ dryRun: false, approveHumanReview: true, staleGroups: 0, inactiveGroups: 0, reviewFields: 1 }),
    );
  });
});
