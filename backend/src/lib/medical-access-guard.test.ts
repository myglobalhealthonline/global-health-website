import assert from "node:assert/strict";
import { before, describe, it, mock } from "node:test";

/**
 * SEC-002: the clinical PHI routes (medical-notes, consultation-history,
 * generated-documents, consultation-chat) now funnel every read through
 * assertMedicalAccess. This locks in the decision those routes depend on.
 *
 * All prisma calls inside the guard are wrapped in try/catch and the audit
 * writers swallow their own errors, so the deny-path decisions below resolve
 * WITHOUT a live database (DB lookups throw/reject → guard treats as "not
 * found" → deny). The two "allowed" cases (Task 3: doctor-of-record via a
 * COMPLETED appointment) need real consent/appointment rows to resolve
 * `true`, so `../db/prisma.js` is replaced with an in-memory fake via
 * node:test's module mocking — still zero contact with any real database.
 * Requires `--experimental-test-module-mocks` (see backend/package.json
 * `test`/`test:db` scripts to wire that flag in permanently if this pattern
 * is reused elsewhere).
 */

type FakeConsent = {
  patientProfileId: string;
  consentType: string;
  consentValue: boolean;
  createdAt: Date;
};
type FakeAppointment = { doctorId: string; userId: string; status: string };

const fixtures: {
  patientProfiles: Record<string, { userId: string }>;
  consents: FakeConsent[];
  appointments: FakeAppointment[];
  countryAccessModels: Record<string, string>;
} = { patientProfiles: {}, consents: [], appointments: [], countryAccessModels: {} };

// SEC-008: toggled per-test to simulate an audit-store outage (MedicalAccessLog
// write throwing). Default false so every existing test writes audit rows fine.
let auditWriteShouldThrow = false;

let assertMedicalAccess: (typeof import("./medical-access-guard.js"))["assertMedicalAccess"];
let MedicalAccessDeniedError: (typeof import("./medical-access-guard.js"))["MedicalAccessDeniedError"];
let env: (typeof import("../config/env.js"))["env"];

// Module mocking must happen before medical-access-guard.js (and therefore
// its "../db/prisma.js" import) is first loaded — done in `before()` rather
// than at top level so this file stays CommonJS-compatible (tsconfig has no
// top-level-await support here).
before(async () => {
  mock.module("../db/prisma.js", {
    namedExports: {
      prisma: {
        patientProfile: {
          findUnique: async ({ where }: { where: { id: string } }) =>
            fixtures.patientProfiles[where.id]
              ? { userId: fixtures.patientProfiles[where.id].userId }
              : null,
        },
        patientConsent: {
          findFirst: async ({
            where,
          }: {
            where: { patientProfileId: string; consentType: string };
          }) => {
            const rows = fixtures.consents
              .filter(
                (c) =>
                  c.patientProfileId === where.patientProfileId &&
                  c.consentType === where.consentType,
              )
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            return rows[0] ?? null;
          },
        },
        appointment: {
          findFirst: async ({
            where,
          }: {
            where: { doctorId: string; userId: string; status: { notIn: string[] } };
          }) => {
            const excluded = where.status.notIn;
            const match = fixtures.appointments.find(
              (a) =>
                a.doctorId === where.doctorId &&
                a.userId === where.userId &&
                !excluded.includes(a.status),
            );
            return match ? { id: "fake-appt" } : null;
          },
        },
        medicalAccessGrant: { findFirst: async () => null },
        medicalAccessLog: {
          create: async () => {
            if (auditWriteShouldThrow) throw new Error("audit store unavailable");
            return {};
          },
        },
        country: {
          findFirst: async ({ where }: { where: { code: string } }) => {
            const accessModel = fixtures.countryAccessModels[where.code];
            return accessModel ? { accessModel } : null;
          },
        },
      },
    },
  });

  ({ assertMedicalAccess, MedicalAccessDeniedError } = await import(
    "./medical-access-guard.js"
  ));
  ({ env } = await import("../config/env.js"));
});

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

  it("allows a DOCTOR with direct consent and a COMPLETED appointment (doctor-of-record)", async () => {
    const patientProfileId = "patient-profile-completed";
    fixtures.patientProfiles[patientProfileId] = { userId: "user-completed" };
    fixtures.consents.push({
      patientProfileId,
      consentType: "MEDICAL_ACCESS_DIRECT",
      consentValue: true,
      createdAt: new Date(),
    });
    fixtures.appointments.push({
      doctorId: "doc-completed",
      userId: "user-completed",
      status: "COMPLETED",
    });

    const result = await assertMedicalAccess({
      actor: {
        userId: "doctor-2",
        role: "DOCTOR",
        name: "Dr Complete",
        doctorId: "doc-completed",
        confidentialityAgreementAccepted: true,
        twoFactorVerifiedAt: new Date(),
      },
      resource: { ...resource, patientProfileId },
    });
    assert.equal(result.allowed, true);
    assert.equal(result.consentLevelUsed, "DIRECT_ONLY");
  });

  it("denies a DOCTOR with direct consent but only a CANCELLED appointment", async () => {
    const patientProfileId = "patient-profile-cancelled";
    fixtures.patientProfiles[patientProfileId] = { userId: "user-cancelled" };
    fixtures.consents.push({
      patientProfileId,
      consentType: "MEDICAL_ACCESS_DIRECT",
      consentValue: true,
      createdAt: new Date(),
    });
    fixtures.appointments.push({
      doctorId: "doc-cancelled",
      userId: "user-cancelled",
      status: "CANCELLED",
    });

    const result = await assertMedicalAccess({
      actor: {
        userId: "doctor-3",
        role: "DOCTOR",
        name: "Dr Cancelled",
        doctorId: "doc-cancelled",
        confidentialityAgreementAccepted: true,
        twoFactorVerifiedAt: new Date(),
      },
      resource: { ...resource, patientProfileId, patientCountryFolder: null },
    });
    assert.equal(result.allowed, false);
    assert.equal(result.denyReason, "DOCTOR_NO_VALID_ACCESS_PATH");
  });

  it("allows a DOCTOR via country-clinic consent when doctor country matches patient folder and country accessModel is CLINIC", async () => {
    const patientProfileId = "patient-profile-clinic-allow";
    fixtures.patientProfiles[patientProfileId] = { userId: "user-clinic-allow" };
    fixtures.consents.push({
      patientProfileId,
      consentType: "MEDICAL_ACCESS_COUNTRY_CLINIC",
      consentValue: true,
      createdAt: new Date(),
    });
    fixtures.countryAccessModels["PT"] = "CLINIC";

    const result = await assertMedicalAccess({
      actor: {
        userId: "doctor-clinic-1",
        role: "DOCTOR",
        name: "Dr Clinic",
        doctorId: "doc-clinic-1",
        confidentialityAgreementAccepted: true,
        twoFactorVerifiedAt: new Date(),
        countryCode: "PT",
      },
      resource: { ...resource, patientProfileId, patientCountryFolder: "PT" },
    });
    assert.equal(result.allowed, true);
    assert.equal(result.consentLevelUsed, "COUNTRY_CLINIC");
  });

  it("denies a DOCTOR with country-clinic consent when the country accessModel is PLATFORM", async () => {
    const patientProfileId = "patient-profile-clinic-platform";
    fixtures.patientProfiles[patientProfileId] = { userId: "user-clinic-platform" };
    fixtures.consents.push({
      patientProfileId,
      consentType: "MEDICAL_ACCESS_COUNTRY_CLINIC",
      consentValue: true,
      createdAt: new Date(),
    });
    fixtures.countryAccessModels["ES"] = "PLATFORM";

    const result = await assertMedicalAccess({
      actor: {
        userId: "doctor-clinic-2",
        role: "DOCTOR",
        name: "Dr Platform",
        doctorId: "doc-clinic-2",
        confidentialityAgreementAccepted: true,
        twoFactorVerifiedAt: new Date(),
        countryCode: "ES",
      },
      resource: { ...resource, patientProfileId, patientCountryFolder: "ES" },
    });
    assert.equal(result.allowed, false);
    assert.equal(result.denyReason, "DOCTOR_NO_VALID_ACCESS_PATH");
  });

  it("denies a DOCTOR in a CLINIC country when the patient has no country-clinic consent", async () => {
    const patientProfileId = "patient-profile-clinic-no-consent";
    fixtures.patientProfiles[patientProfileId] = { userId: "user-clinic-no-consent" };
    fixtures.countryAccessModels["CZ"] = "CLINIC";

    const result = await assertMedicalAccess({
      actor: {
        userId: "doctor-clinic-3",
        role: "DOCTOR",
        name: "Dr NoConsent",
        doctorId: "doc-clinic-3",
        confidentialityAgreementAccepted: true,
        twoFactorVerifiedAt: new Date(),
        countryCode: "CZ",
      },
      resource: { ...resource, patientProfileId, patientCountryFolder: "CZ" },
    });
    assert.equal(result.allowed, false);
    assert.equal(result.denyReason, "DOCTOR_NO_VALID_ACCESS_PATH");
  });
});

  // GH-2026-001436: 42 production appointments had userId=null while the
  // patient's profile had one, so doctorHasTreatmentRelationship's
  // Appointment.userId -> PatientProfile.userId join could never match. A
  // doctor with valid direct consent was denied for four days. This locks in
  // the failure mode (so it's visible here, not just in an incident report)
  // and then the fix once the appointment is linked to the same user.
  it("denies a DOCTOR with valid direct consent when Appointment.userId is null (GH-2026-001436)", async () => {
    const patientProfileId = "patient-profile-null-userid";
    fixtures.patientProfiles[patientProfileId] = { userId: "user-null-userid" };
    fixtures.consents.push({
      patientProfileId,
      consentType: "MEDICAL_ACCESS_DIRECT",
      consentValue: true,
      createdAt: new Date(),
    });
    // The appointment exists but carries no userId — exactly the production
    // shape. doctorId + status match, but the userId join has nothing to
    // match against, so doctorHasTreatmentRelationship never finds it.
    fixtures.appointments.push({
      doctorId: "doc-null-userid",
      userId: "", // treated as "no userId" by the fake findFirst (never equals profile.userId)
      status: "COMPLETED",
    });

    const result = await assertMedicalAccess({
      actor: {
        userId: "doctor-null-userid",
        role: "DOCTOR",
        name: "Dr NullUserId",
        doctorId: "doc-null-userid",
        confidentialityAgreementAccepted: true,
        twoFactorVerifiedAt: new Date(),
      },
      resource: { ...resource, patientProfileId, patientCountryFolder: null },
    });
    assert.equal(result.allowed, false);
    assert.equal(result.denyReason, "DOCTOR_NO_VALID_ACCESS_PATH");
  });

  it("allows the same DOCTOR once the appointment is linked to the patient's userId", async () => {
    const patientProfileId = "patient-profile-linked-userid";
    fixtures.patientProfiles[patientProfileId] = { userId: "user-linked-userid" };
    fixtures.consents.push({
      patientProfileId,
      consentType: "MEDICAL_ACCESS_DIRECT",
      consentValue: true,
      createdAt: new Date(),
    });
    fixtures.appointments.push({
      doctorId: "doc-linked-userid",
      userId: "user-linked-userid",
      status: "COMPLETED",
    });

    const result = await assertMedicalAccess({
      actor: {
        userId: "doctor-linked-userid",
        role: "DOCTOR",
        name: "Dr LinkedUserId",
        doctorId: "doc-linked-userid",
        confidentialityAgreementAccepted: true,
        twoFactorVerifiedAt: new Date(),
      },
      resource: { ...resource, patientProfileId, patientCountryFolder: null },
    });
    assert.equal(result.allowed, true);
    assert.equal(result.consentLevelUsed, "DIRECT_ONLY");
  });

describe("guard-medical-read — 403 body shape (SEC-008 reason surfacing)", () => {
  it("DOCTOR_2FA_REQUIRED: self-fixable, no request-access path, no patient/clinical detail", async () => {
    const { describeDenyReason } = await import("./medical-access-guard.js");
    const info = describeDenyReason("DOCTOR_2FA_REQUIRED");
    assert.equal(info.selfFixable, true);
    assert.equal(info.canRequestAccess, false);
    assert.equal(typeof info.remedy, "string");
    // Generic reference to the "patient" role in the remedy sentence is fine
    // ("the patient has not consented") — what must never appear is an actual
    // identifier or clinical content.
    const serialized = JSON.stringify(info);
    assert.ok(
      !/patient-profile-|globalHealthNumber|diagnos|prescri/i.test(serialized),
      "no clinical/patient identifier leaks",
    );
  });

  it("DOCTOR_NO_VALID_ACCESS_PATH: not self-fixable, offers request-access, no patient/clinical detail", async () => {
    const { describeDenyReason } = await import("./medical-access-guard.js");
    const info = describeDenyReason("DOCTOR_NO_VALID_ACCESS_PATH");
    assert.equal(info.selfFixable, false);
    assert.equal(info.canRequestAccess, true);
    assert.equal(typeof info.remedy, "string");
    // Generic reference to the "patient" role in the remedy sentence is fine
    // ("the patient has not consented") — what must never appear is an actual
    // identifier or clinical content.
    const serialized = JSON.stringify(info);
    assert.ok(
      !/patient-profile-|globalHealthNumber|diagnos|prescri/i.test(serialized),
      "no clinical/patient identifier leaks",
    );
  });

  it("medicalAccessDeniedResponse builds the full details envelope with no patient/clinical detail", async () => {
    const { medicalAccessDeniedResponse } = await import("../utils/guard-medical-read.js");
    const err = new MedicalAccessDeniedError("DOCTOR_NO_VALID_ACCESS_PATH");
    const body = medicalAccessDeniedResponse(err);
    assert.equal(body.ok, false);
    assert.deepEqual(body.details, {
      reasonCode: "DOCTOR_NO_VALID_ACCESS_PATH",
      remedy:
        "The patient has not consented to your access. Request access — the patient will be asked to approve it.",
      selfFixable: false,
      canRequestAccess: true,
    });
    const serialized = JSON.stringify(body);
    assert.ok(!/patient-profile-|patientProfileId|globalHealthNumber/i.test(serialized));
  });
});

describe("SEC-008 — audit writes fail closed", () => {
  // These tests flip enforcement + bypass on the shared env object at runtime
  // (env is a plain module singleton, read at call-time inside the guard). Each
  // test restores the baseline (shadow off, bypass off, audit healthy) in a
  // finally so the shadow-mode deny tests above/below stay unaffected.
  function reset() {
    auditWriteShouldThrow = false;
    env.MEDICAL_ACCESS_ENFORCE = false;
    env.PHI_AUDIT_EMERGENCY_BYPASS = false;
  }

  it("denies an otherwise-ALLOWED read when the audit write fails while enforcing", async () => {
    auditWriteShouldThrow = true;
    env.MEDICAL_ACCESS_ENFORCE = true;
    env.PHI_AUDIT_EMERGENCY_BYPASS = false;
    try {
      await assert.rejects(
        assertMedicalAccess({
          actor: { userId: "admin-1", role: "ADMIN", name: "Admin" },
          resource,
        }),
        (err: unknown) =>
          err instanceof MedicalAccessDeniedError &&
          err.denyReason === "AUDIT_UNAVAILABLE",
      );
    } finally {
      reset();
    }
  });

  it("allows the read (no block) when PHI_AUDIT_EMERGENCY_BYPASS is set, despite the audit write failing", async () => {
    auditWriteShouldThrow = true;
    env.MEDICAL_ACCESS_ENFORCE = true;
    env.PHI_AUDIT_EMERGENCY_BYPASS = true;
    try {
      const result = await assertMedicalAccess({
        actor: { userId: "admin-1", role: "ADMIN", name: "Admin" },
        resource,
      });
      assert.equal(result.allowed, true);
    } finally {
      reset();
    }
  });

  it("keeps a DENIED decision denied for its own reason (not AUDIT_UNAVAILABLE) when the audit write also fails", async () => {
    auditWriteShouldThrow = true;
    env.MEDICAL_ACCESS_ENFORCE = true;
    env.PHI_AUDIT_EMERGENCY_BYPASS = false;
    try {
      // PATIENT reading a non-own record → deny; audit write throws but the
      // deny path is best-effort, so it must surface the original deny reason.
      await assert.rejects(
        assertMedicalAccess({
          actor: { userId: "patient-999", role: "PATIENT", name: "Someone Else" },
          resource,
        }),
        (err: unknown) =>
          err instanceof MedicalAccessDeniedError &&
          err.denyReason === "PATIENT_NOT_OWN_RECORD",
      );
    } finally {
      reset();
    }
  });
});
