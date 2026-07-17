import assert from "node:assert/strict";
import { before, describe, it, mock } from "node:test";

/**
 * PRIV-002 (docs/security/priv-002-retention-table-2026-07-17.md): the admin
 * anonymize/deletion path now ERASES identity + REVOKES sessions while
 * RETAINING clinical/financial rows, and writes a completion audit record.
 *
 * Fully mocked — zero DB contact (task constraint). `../../db/prisma.js` and
 * the trusted-device revoker are replaced via node:test module mocking.
 * Requires `--experimental-test-module-mocks` (same pattern + caveat as
 * src/lib/medical-access-guard.test.ts).
 */

type Captured = Record<string, unknown> | null;

const cap: {
  profileUpdate: Captured;
  nationalityUpdate: Captured;
  newsletterDelete: Captured;
  userUpdate: Captured;
  loginOtpDelete: Captured;
  auditCreate: Captured;
  trustedDevicesRevokedFor: string | null;
  clinicalRowTouched: boolean;
} = {
  profileUpdate: null,
  nationalityUpdate: null,
  newsletterDelete: null,
  userUpdate: null,
  loginOtpDelete: null,
  auditCreate: null,
  trustedDevicesRevokedFor: null,
  clinicalRowTouched: false,
};

const PROFILE = {
  id: "pp-1",
  userId: "user-1",
  email: "patient@real.example",
  countryFolderCode: "PT",
  insuranceDocumentKey: "ins/key-1",
  idDocumentKey: "id/front-1",
  idDocumentBackKey: "id/back-1",
};

// A model that must NEVER be written during anonymization → any call flips the
// tripwire so the "clinical rows untouched" assertion can catch a regression.
const clinicalTripwire = {
  update: async () => {
    cap.clinicalRowTouched = true;
    return {};
  },
  updateMany: async () => {
    cap.clinicalRowTouched = true;
    return { count: 0 };
  },
  deleteMany: async () => {
    cap.clinicalRowTouched = true;
    return { count: 0 };
  },
};

const txFake = {
  patientProfile: {
    update: async (args: Record<string, unknown>) => {
      cap.profileUpdate = args;
      return {};
    },
  },
  patientNationalityDocument: {
    updateMany: async (args: Record<string, unknown>) => {
      cap.nationalityUpdate = args;
      return { count: 0 };
    },
  },
  newsletterSubscriber: {
    deleteMany: async (args: Record<string, unknown>) => {
      cap.newsletterDelete = args;
      return { count: 1 };
    },
  },
  user: {
    update: async (args: Record<string, unknown>) => {
      cap.userUpdate = args;
      return {};
    },
  },
  loginOtp: {
    deleteMany: async (args: Record<string, unknown>) => {
      cap.loginOtpDelete = args;
      return { count: 2 };
    },
  },
  // Clinical + financial — must stay untouched.
  appointment: clinicalTripwire,
  order: clinicalTripwire,
  invoice: clinicalTripwire,
  medicalDocument: clinicalTripwire,
};

let anonymizePatient: (typeof import("./country-data-policy.service.js"))["anonymizePatient"];

before(async () => {
  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        patientProfile: {
          findUnique: async () => PROFILE,
        },
        patientNationalityDocument: {
          findMany: async () => [
            { frontFileKey: "nat/front", backFileKey: null },
          ],
        },
        $transaction: async (cb: (tx: typeof txFake) => Promise<unknown>) =>
          cb(txFake),
        auditLog: {
          create: async (args: Record<string, unknown>) => {
            cap.auditCreate = args;
            return {};
          },
        },
      },
    },
  });
  mock.module("../two-factor/login-otp.service.js", {
    namedExports: {
      revokeTrustedDevices: async (userId: string) => {
        cap.trustedDevicesRevokedFor = userId;
      },
    },
  });

  ({ anonymizePatient } = await import("./country-data-policy.service.js"));
});

describe("PRIV-002 anonymizePatient", () => {
  it("erases identity, revokes sessions, retains clinical, writes completion record", async () => {
    await anonymizePatient({ patientProfileId: "pp-1", adminId: "admin-9" });

    // ── PatientProfile identity scrubbed + email tombstoned ─────────────────
    const pData = (cap.profileUpdate as { data: Record<string, unknown> }).data;
    assert.equal(pData.fullName, null);
    assert.equal(pData.phone, null);
    assert.equal(pData.dateOfBirth, null);
    assert.equal(pData.nationalIdNumber, null);
    assert.equal(pData.emailHash, null);
    assert.equal(pData.idDocumentKey, null);
    assert.equal(pData.email, "deleted-pp-1@removed.invalid");
    assert.ok(pData.anonymizedAt instanceof Date);

    // ── National-ID docs scrubbed ───────────────────────────────────────────
    const nData = (cap.nationalityUpdate as { data: Record<string, unknown> })
      .data;
    assert.equal(nData.documentNumber, null);
    assert.equal(nData.frontFileKey, null);

    // ── User identity erased + tokenVersion bumped ─────────────────────────
    const uData = (cap.userUpdate as { data: Record<string, unknown> }).data;
    assert.equal(uData.fullName, "Deleted user");
    assert.equal(uData.isActive, false);
    assert.equal(uData.twoFactorEnabled, false);
    assert.equal(uData.email, "deleted-user-1@removed.invalid");
    assert.deepEqual(uData.tokenVersion, { increment: 1 });

    // ── Session revocation: trusted devices + login OTPs ───────────────────
    assert.equal(cap.trustedDevicesRevokedFor, "user-1");
    assert.deepEqual(cap.loginOtpDelete, { where: { userId: "user-1" } });

    // ── Marketing withdrawn by original email ──────────────────────────────
    assert.deepEqual(cap.newsletterDelete, {
      where: { email: "patient@real.example" },
    });

    // ── Clinical / financial rows NEVER touched ────────────────────────────
    assert.equal(cap.clinicalRowTouched, false);

    // ── Completion audit record with retained categories + queued keys ─────
    const aData = (cap.auditCreate as { data: Record<string, unknown> }).data;
    assert.equal(aData.action, "PATIENT_ANONYMIZED");
    const meta = aData.metadata as Record<string, unknown>;
    assert.equal(meta.sessionsRevoked, true);
    assert.equal(meta.legalSignOff, "PENDING");
    assert.deepEqual(meta.personalStorageKeysQueuedForPurge, [
      "ins/key-1",
      "id/front-1",
      "id/back-1",
      "nat/front",
    ]);
    assert.ok((meta.categoriesRetained as Record<string, string>).clinical);
  });
});
