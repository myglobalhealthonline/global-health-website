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
} = { patientProfiles: {}, consents: [], appointments: [] };

let assertMedicalAccess: (typeof import("./medical-access-guard.js"))["assertMedicalAccess"];

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
        medicalAccessLog: { create: async () => ({}) },
        country: { findFirst: async () => null },
      },
    },
  });

  ({ assertMedicalAccess } = await import("./medical-access-guard.js"));
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
});
