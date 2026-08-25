import assert from "node:assert/strict";
import test from "node:test";

import {
  assertIrelandGeneralServiceKeywordApplyAuthorized,
  buildOptimisticServiceTranslationWhere,
  buildOptimisticServiceWhere,
} from "./ireland-general-service-keyword-patch.js";

test("requires the exact version token before an apply", () => {
  assert.doesNotThrow(() =>
    assertIrelandGeneralServiceKeywordApplyAuthorized({ apply: false, confirmation: undefined }),
  );
  assert.throws(
    () => assertIrelandGeneralServiceKeywordApplyAuthorized({ apply: true, confirmation: "wrong" }),
    /confirmation/i,
  );
  assert.doesNotThrow(() =>
    assertIrelandGeneralServiceKeywordApplyAuthorized({
      apply: true,
      confirmation: "IE-GENERAL-SERVICE-KEYWORDS-2026-08-25",
    }),
  );
});

test("builds a publication-safe optimistic service guard", () => {
  const updatedAt = new Date("2026-08-25T12:00:00.000Z");
  assert.deepEqual(
    buildOptimisticServiceWhere({ id: "svc", updatedAt, isActive: true, kind: "GENERAL", visibility: "PUBLIC" }),
    { id: "svc", updatedAt, isActive: true, kind: "GENERAL", visibility: "PUBLIC" },
  );
});

test("builds an optimistic EN translation guard", () => {
  const updatedAt = new Date("2026-08-25T12:00:00.000Z");
  assert.deepEqual(buildOptimisticServiceTranslationWhere({ id: "tr", updatedAt }), {
    id: "tr",
    updatedAt,
  });
});
