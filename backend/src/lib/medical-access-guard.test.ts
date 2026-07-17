import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertMedicalAccess } from "./medical-access-guard.js";

/**
 * SEC-002: the clinical PHI routes (medical-notes, consultation-history,
 * generated-documents, consultation-chat) now funnel every read through
 * assertMedicalAccess. This locks in the decision those routes depend on.
 *
 * All prisma calls inside the guard are wrapped in try/catch and the audit
 * writers swallow their own errors, so the decision branches exercised here
 * resolve WITHOUT a live database. Denials are asserted via the returned
 * result (allowed=false) which holds in the default SHADOW mode regardless of
 * MEDICAL_ACCESS_ENFORCE.
 */

const resource = {
  patientProfileId: "patient-profile-1",
  patientCountryFolder: "GB",
  resourceType: "CONSULT_NOTE",
  accessAction: "VIEWED",
};

describe("medical access guard — route authorization decision", () => {
  it("allows an ADMIN (global override)", async () => {
    const result = await assertMedicalAccess({
      actor: { userId: "admin-1", role: "ADMIN", name: "Admin" },
      resource,
    });
    assert.equal(result.allowed, true);
  });

  it("denies a DOCTOR without a signed confidentiality agreement", async () => {
    const result = await assertMedicalAccess({
      actor: {
        userId: "doctor-1",
        role: "DOCTOR",
        name: "Dr Who",
        doctorId: "doc-1",
        confidentialityAgreementAccepted: false,
        twoFactorVerifiedAt: new Date(),
      },
      resource,
    });
    assert.equal(result.allowed, false);
    assert.equal(result.denyReason, "DOCTOR_NO_CONFIDENTIALITY_AGREEMENT");
  });

  it("denies a PATIENT reading a record that is not their own", async () => {
    // No matching PatientProfile.userId → not-own-record deny.
    const result = await assertMedicalAccess({
      actor: { userId: "patient-999", role: "PATIENT", name: "Someone Else" },
      resource,
    });
    assert.equal(result.allowed, false);
    assert.equal(result.denyReason, "PATIENT_NOT_OWN_RECORD");
  });
});
