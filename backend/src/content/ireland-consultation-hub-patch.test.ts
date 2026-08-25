import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  IRELAND_HUB_CONTENT_VERSION,
  assertIrelandHubApplyAuthorized,
  assertIrelandHubPageWritable,
  buildOptimisticPageWhere,
  buildOptimisticTranslationWhere,
  jsonValuesEqual,
} from "./ireland-consultation-hub-patch.js";

describe("Ireland consultation hub CMS patch guards", () => {
  it("allows preview mode without a confirmation token", () => {
    assert.doesNotThrow(() =>
      assertIrelandHubApplyAuthorized({ apply: false, confirmation: undefined }),
    );
  });

  it("rejects writes without the exact version confirmation", () => {
    assert.throws(
      () => assertIrelandHubApplyAuthorized({ apply: true, confirmation: undefined }),
      /Refusing to write/,
    );
    assert.throws(
      () => assertIrelandHubApplyAuthorized({ apply: true, confirmation: "wrong" }),
      /Refusing to write/,
    );
    assert.doesNotThrow(() =>
      assertIrelandHubApplyAuthorized({
        apply: true,
        confirmation: IRELAND_HUB_CONTENT_VERSION,
      }),
    );
  });

  it("refuses to patch inactive or unpublished page content", () => {
    assert.throws(
      () =>
        assertIrelandHubPageWritable({
          pageKey: "GENERAL_CONSULTATION",
          status: "DRAFT",
          isActive: true,
        }),
      /status=DRAFT isActive=true/,
    );
    assert.throws(
      () =>
        assertIrelandHubPageWritable({
          pageKey: "SPECIALIST_CONSULTATION",
          status: "PUBLISHED",
          isActive: false,
        }),
      /status=PUBLISHED isActive=false/,
    );
  });

  it("builds an immutable optimistic-concurrency selector", () => {
    const updatedAt = new Date("2026-08-25T12:00:00.000Z");
    const snapshot = { id: "translation-1", updatedAt };
    const where = buildOptimisticTranslationWhere(snapshot);

    assert.deepEqual(where, { id: "translation-1", updatedAt });
    assert.notEqual(where, snapshot);
  });

  it("builds a page selector that rechecks publish state inside the transaction", () => {
    const updatedAt = new Date("2026-08-25T12:00:00.000Z");
    const snapshot = { id: "page-1", updatedAt };

    assert.deepEqual(buildOptimisticPageWhere(snapshot), {
      id: "page-1",
      updatedAt,
      status: "PUBLISHED",
      isActive: true,
    });
  });

  it("compares JSON objects without treating key order as a content change", () => {
    assert.equal(
      jsonValuesEqual(
        [{ question: "Question", answer: "Answer" }],
        [{ answer: "Answer", question: "Question" }],
      ),
      true,
    );
    assert.equal(jsonValuesEqual(["first", "second"], ["second", "first"]), false);
  });
});
