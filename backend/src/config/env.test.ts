import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertProductionMedicalAccessSafety } from "./env.js";

/**
 * SEC-005: the production boot-time validator must refuse to start when the
 * medical-access guard would run in a shadow / non-enforcing configuration.
 * These assert the throw for each unsafe combination and the pass when every
 * value is safe. The validator is a pure function of its argument, so no
 * process.env mutation is needed.
 */

const PRIVILEGED = ["SUPER_ADMIN", "ADMIN", "LOCAL_ADMIN", "DOCTOR"];

/** A fully-safe production config; individual tests override one field. */
function safeProdConfig() {
  return {
    nodeEnv: "production",
    complianceMode: "strict",
    medicalAccessEnforce: true,
    adminPhiRequireReason: true,
    require2faForRoles: new Set(PRIVILEGED),
  };
}

describe("SEC-005 assertProductionMedicalAccessSafety", () => {
  it("passes when every value is safe in production", () => {
    assert.doesNotThrow(() => assertProductionMedicalAccessSafety(safeProdConfig()));
  });

  it("throws when COMPLIANCE_MODE is relaxed", () => {
    assert.throws(
      () => assertProductionMedicalAccessSafety({ ...safeProdConfig(), complianceMode: "relaxed" }),
      /COMPLIANCE_MODE/,
    );
  });

  it("throws when MEDICAL_ACCESS_ENFORCE is off (shadow mode)", () => {
    assert.throws(
      () =>
        assertProductionMedicalAccessSafety({ ...safeProdConfig(), medicalAccessEnforce: false }),
      /MEDICAL_ACCESS_ENFORCE/,
    );
  });

  it("throws when ADMIN_PHI_REQUIRE_REASON is off", () => {
    assert.throws(
      () =>
        assertProductionMedicalAccessSafety({ ...safeProdConfig(), adminPhiRequireReason: false }),
      /ADMIN_PHI_REQUIRE_REASON/,
    );
  });

  it("throws when REQUIRE_2FA_FOR_ROLES is empty", () => {
    assert.throws(
      () =>
        assertProductionMedicalAccessSafety({
          ...safeProdConfig(),
          require2faForRoles: new Set(),
        }),
      /REQUIRE_2FA_FOR_ROLES.*DOCTOR/s,
    );
  });

  it("throws naming exactly the missing privileged role", () => {
    assert.throws(
      () =>
        assertProductionMedicalAccessSafety({
          ...safeProdConfig(),
          require2faForRoles: new Set(["SUPER_ADMIN", "ADMIN", "LOCAL_ADMIN"]),
        }),
      /missing: DOCTOR/,
    );
  });

  it("does not enforce any of it outside production", () => {
    // Every value unsafe, but nodeEnv !== production → permissive dev defaults.
    assert.doesNotThrow(() =>
      assertProductionMedicalAccessSafety({
        nodeEnv: "development",
        complianceMode: "relaxed",
        medicalAccessEnforce: false,
        adminPhiRequireReason: false,
        require2faForRoles: new Set(),
      }),
    );
  });
});
