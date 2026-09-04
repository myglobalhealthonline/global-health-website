import assert from "node:assert/strict";
import test from "node:test";

import {
  PORTUGAL_FAQ_SAFETY_PATCHES,
  portugalFaqSafetyPatchToken,
} from "./portugal-faq-safety-patches.js";
import { assertPortugalFaqSafetyApplyAuthorized } from "./portugal-faq-safety-patch.js";

const patch = PORTUGAL_FAQ_SAFETY_PATCHES[0];

test("Portugal FAQ safety apply requires the exact source, confirmation, and database", () => {
  const options = {
    apply: true,
    patch,
    currentSourceSha256: "a".repeat(64),
    sourceSha256: "a".repeat(64),
    confirmation: portugalFaqSafetyPatchToken(patch),
    databaseUrl: "postgresql://user:secret@db.example:5432/global_health",
    confirmationDatabase: "postgresql://db.example:5432/global_health",
  } as const;

  assert.doesNotThrow(() => assertPortugalFaqSafetyApplyAuthorized(options));
  assert.throws(
    () => assertPortugalFaqSafetyApplyAuthorized({ ...options, sourceSha256: "b".repeat(64) }),
    /source SHA-256/i,
  );
  assert.throws(
    () => assertPortugalFaqSafetyApplyAuthorized({ ...options, confirmation: "wrong" }),
    /confirmation token/i,
  );
  assert.throws(
    () => assertPortugalFaqSafetyApplyAuthorized({ ...options, confirmationDatabase: "postgresql://other:5432/global_health" }),
    /database identity/i,
  );
});
