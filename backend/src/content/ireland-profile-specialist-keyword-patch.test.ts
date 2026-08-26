import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  IRELAND_PROFILE_SPECIALIST_KEYWORD_TRANSACTION_TIMEOUT_MS,
  IRELAND_PROFILE_SPECIALIST_KEYWORD_VERSION,
  assertIrelandDoctorMarketWritable,
  assertIrelandProfileSpecialistKeywordApplyAuthorized,
  buildIrelandProfileSpecialistKeywordTransactionOptions,
  buildOptimisticDoctorMarketTranslationWhere,
  buildOptimisticDoctorWhere,
  buildOptimisticSpecialistServiceWhere,
  buildOptimisticSpecialistServiceTranslationWhere,
} from "./ireland-profile-specialist-keyword-patch.js";

describe("Ireland doctor-profile and specialist-service keyword patch guards", () => {
  it("keeps preview mode as the safe default", () => {
    assert.doesNotThrow(() =>
      assertIrelandProfileSpecialistKeywordApplyAuthorized({
        apply: false,
        confirmation: undefined,
      }),
    );
  });

  it("requires the exact reviewed version token before applying", () => {
    assert.throws(
      () =>
        assertIrelandProfileSpecialistKeywordApplyAuthorized({
          apply: true,
          confirmation: undefined,
        }),
      /confirmation|refusing to write/i,
    );
    assert.throws(
      () =>
        assertIrelandProfileSpecialistKeywordApplyAuthorized({
          apply: true,
          confirmation: `${IRELAND_PROFILE_SPECIALIST_KEYWORD_VERSION}-stale`,
        }),
      /confirmation|refusing to write/i,
    );
    assert.doesNotThrow(() =>
      assertIrelandProfileSpecialistKeywordApplyAuthorized({
        apply: true,
        confirmation: IRELAND_PROFILE_SPECIALIST_KEYWORD_VERSION,
      }),
    );
  });

  it("allows enough transaction time for the localized production batch", () => {
    assert.ok(IRELAND_PROFILE_SPECIALIST_KEYWORD_TRANSACTION_TIMEOUT_MS >= 30_000);
    assert.deepEqual(buildIrelandProfileSpecialistKeywordTransactionOptions("Serializable"), {
      isolationLevel: "Serializable",
      maxWait: 10_000,
      timeout: IRELAND_PROFILE_SPECIALIST_KEYWORD_TRANSACTION_TIMEOUT_MS,
    });
  });

  it("rechecks that a specialist service is still active and public", () => {
    const updatedAt = new Date("2026-08-26T12:00:00.000Z");

    assert.deepEqual(
      buildOptimisticSpecialistServiceWhere({ id: "service-1", updatedAt }),
      {
        id: "service-1",
        updatedAt,
        isActive: true,
        kind: "SPECIALIST",
        visibility: "PUBLIC",
      },
    );
  });

  it("rejects a doctor profile outside an active Ireland market", () => {
    assert.doesNotThrow(() =>
      assertIrelandDoctorMarketWritable({
        doctorSlug: "doctor-one",
        doctorActive: true,
        countryCode: "IE",
        marketActive: true,
      }),
    );
    assert.throws(
      () =>
        assertIrelandDoctorMarketWritable({
          doctorSlug: "doctor-one",
          doctorActive: true,
          countryCode: "PT",
          marketActive: true,
        }),
      /Ireland|countryCode=PT/i,
    );
    assert.throws(
      () =>
        assertIrelandDoctorMarketWritable({
          doctorSlug: "doctor-one",
          doctorActive: true,
          countryCode: "IE",
          marketActive: false,
        }),
      /active|marketActive=false/i,
    );
    assert.throws(
      () =>
        assertIrelandDoctorMarketWritable({
          doctorSlug: "doctor-one",
          doctorActive: false,
          countryCode: "IE",
          marketActive: true,
        }),
      /active|doctorActive=false/i,
    );
  });

  it("uses updatedAt when rechecking the doctor row", () => {
    const updatedAt = new Date("2026-08-26T12:00:00.000Z");

    assert.deepEqual(buildOptimisticDoctorWhere({ id: "doctor-1", updatedAt }), {
      id: "doctor-1",
      updatedAt,
      active: true,
    });
  });

  it("uses updatedAt guards for both localized translation tables", () => {
    const updatedAt = new Date("2026-08-26T12:00:00.000Z");

    assert.deepEqual(
      buildOptimisticDoctorMarketTranslationWhere({ id: "doctor-translation-1", updatedAt }),
      { id: "doctor-translation-1", updatedAt },
    );
    assert.deepEqual(
      buildOptimisticSpecialistServiceTranslationWhere({
        id: "service-translation-1",
        updatedAt,
      }),
      { id: "service-translation-1", updatedAt },
    );
  });
});
