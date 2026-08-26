import assert from "node:assert/strict";
import test from "node:test";

import {
  IRELAND_PROFILE_SPECIALIST_FAQ_PATCH_VERSION,
  assertIrelandDoctorFaqTargetWritable,
  assertIrelandProfileSpecialistFaqApplyAuthorized,
  assertIrelandSpecialistFaqTargetWritable,
  buildIrelandProfileSpecialistFaqTransactionOptions,
  hasIrelandFaqQuestionOverlap,
} from "./ireland-profile-specialist-faq-patch.js";

test("keeps preview mode safe and requires the exact apply token", () => {
  assert.doesNotThrow(() =>
    assertIrelandProfileSpecialistFaqApplyAuthorized({ apply: false, confirmation: undefined }),
  );
  assert.throws(
    () => assertIrelandProfileSpecialistFaqApplyAuthorized({ apply: true, confirmation: "wrong" }),
    /Refusing to write/,
  );
  assert.doesNotThrow(() =>
    assertIrelandProfileSpecialistFaqApplyAuthorized({
      apply: true,
      confirmation: IRELAND_PROFILE_SPECIALIST_FAQ_PATCH_VERSION,
    }),
  );
});

test("allows enough transaction time for the localized FAQ batch", () => {
  assert.deepEqual(buildIrelandProfileSpecialistFaqTransactionOptions("SERIALIZABLE"), {
    isolationLevel: "SERIALIZABLE",
    maxWait: 10_000,
    timeout: 45_000,
  });
});

test("rejects a doctor profile whose audited FAQ or Ireland state drifted", () => {
  const safe = {
    slug: "roney-carli",
    countryCode: "ie",
    doctorActive: true,
    marketActive: true,
    activeFaqCount: 0,
    expectedActiveFaqCount: 0,
    totalFaqCount: 0,
    expectedTotalFaqCount: 0,
    targetQuestionExists: false,
  } as const;
  assert.doesNotThrow(() => assertIrelandDoctorFaqTargetWritable(safe));
  assert.throws(
    () => assertIrelandDoctorFaqTargetWritable({ ...safe, activeFaqCount: 1 }),
    /FAQ count drifted/,
  );
  assert.throws(
    () => assertIrelandDoctorFaqTargetWritable({ ...safe, countryCode: "pt" }),
    /outside the Ireland market/,
  );
  assert.throws(
    () => assertIrelandDoctorFaqTargetWritable({ ...safe, targetQuestionExists: true }),
    /already exists/,
  );
});

test("rejects a specialist service whose publication or FAQ state drifted", () => {
  const safe = {
    slug: "cardiology-specialist-consultation",
    countryCode: "IE",
    isActive: true,
    visibility: "PUBLIC",
    kind: "SPECIALIST",
    visibleFaqCount: 8,
    expectedVisibleFaqCount: 8,
    targetQuestionExists: false,
  } as const;
  assert.doesNotThrow(() => assertIrelandSpecialistFaqTargetWritable(safe));
  assert.throws(
    () => assertIrelandSpecialistFaqTargetWritable({ ...safe, visibleFaqCount: 9 }),
    /FAQ count drifted/,
  );
  assert.throws(
    () => assertIrelandSpecialistFaqTargetWritable({ ...safe, targetQuestionExists: true }),
    /already exists/,
  );
  assert.throws(
    () => assertIrelandSpecialistFaqTargetWritable({ ...safe, visibility: "PRIVATE" }),
    /active public specialist/,
  );
});

test("detects duplicates in localized FAQ questions", () => {
  assert.equal(
    hasIrelandFaqQuestionOverlap(
      ["Can I book this service?", "Como marco uma consulta online?"],
      ["How do I book?", "  COMO   MARCO UMA CONSULTA ONLINE?  "],
    ),
    true,
  );
  assert.equal(
    hasIrelandFaqQuestionOverlap(
      ["Can I book this service?"],
      ["How do I prepare for the appointment?"],
    ),
    false,
  );
});
