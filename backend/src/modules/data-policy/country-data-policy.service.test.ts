import assert from "node:assert/strict";
import { before, describe, it, mock } from "node:test";

/**
 * PRIV-002 (docs/audits/security/priv-002-retention-table-2026-07-17.md): the admin
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
  /** The appointment→patient link write. Retention-preserving, so it is
   *  captured separately from the clinical tripwire rather than flipping it. */
  appointmentLinkUpdate: Captured;
  /** The `where` the link pass selected its candidates with. */
  appointmentLinkQuery: Captured;
  outboxRows: Record<string, unknown>[] | null;
  failAuditCreate: boolean;
  failOutboxCreate: boolean;
} = {
  profileUpdate: null,
  nationalityUpdate: null,
  newsletterDelete: null,
  userUpdate: null,
  loginOtpDelete: null,
  auditCreate: null,
  trustedDevicesRevokedFor: null,
  clinicalRowTouched: false,
  appointmentLinkUpdate: null,
  appointmentLinkQuery: null,
  outboxRows: null,
  failAuditCreate: false,
  failOutboxCreate: false,
};

/** The one synthetic appointment the link pass finds for this profile. */
const LINKABLE_APPT_ID = "appt-linkable-1";

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
  // PR-5: the completion audit now commits WITH the scrub, so it is written on
  // the transaction client, not the top-level one.
  auditLog: {
    create: async (args: Record<string, unknown>) => {
      if (cap.failAuditCreate) throw new Error("simulated audit insert failure");
      cap.auditCreate = args;
      return {};
    },
  },
  // PR-3: personal-object purge queued in the same commit.
  outbox: {
    createMany: async (args: { data: Record<string, unknown>[] }) => {
      if (cap.failOutboxCreate) throw new Error("simulated outbox enqueue failure");
      cap.outboxRows = args.data;
      return { count: args.data.length };
    },
  },
  // Clinical + financial — must stay untouched.
  //
  // Appointment is the one exception, and only for ONE column: anonymization
  // stamps `patientProfileId` before it tombstones the email, which is what
  // keeps the retained record reachable by its treating doctor afterwards.
  // Writing anything else on an appointment is still a tripwire.
  appointment: {
    ...clinicalTripwire,
    // The link pass reads its candidates first; `LINKABLE_APPT_ID` is the one
    // synthetic appointment that matches, and the order-line lookup below says
    // it was NOT booked for someone else, so it stays claimable.
    findMany: async (args: Record<string, unknown>) => {
      cap.appointmentLinkQuery = args;
      return [{ id: LINKABLE_APPT_ID }];
    },
    updateMany: async (args: { data?: Record<string, unknown> }) => {
      const keys = Object.keys(args.data ?? {});
      if (keys.length === 1 && keys[0] === "patientProfileId") {
        cap.appointmentLinkUpdate = args as Record<string, unknown>;
        return { count: 1 };
      }
      cap.clinicalRowTouched = true;
      return { count: 0 };
    },
  },
  // No order line marks the candidate as booked for a dependent.
  orderItem: { findMany: async () => [] },
  order: clinicalTripwire,
  invoice: clinicalTripwire,
  medicalDocument: clinicalTripwire,
};

function resetCaptures() {
  cap.profileUpdate = null;
  cap.nationalityUpdate = null;
  cap.newsletterDelete = null;
  cap.userUpdate = null;
  cap.loginOtpDelete = null;
  cap.auditCreate = null;
  cap.trustedDevicesRevokedFor = null;
  cap.appointmentLinkUpdate = null;
  cap.appointmentLinkQuery = null;
  cap.clinicalRowTouched = false;
  cap.outboxRows = null;
  cap.failAuditCreate = false;
  cap.failOutboxCreate = false;
}

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
        // Rolls the captured writes back when the body throws, so a rollback
        // assertion means "nothing was committed", not just "it threw".
        $transaction: async (cb: (tx: typeof txFake) => Promise<unknown>) => {
          const snapshot = {
            profileUpdate: cap.profileUpdate,
            nationalityUpdate: cap.nationalityUpdate,
            newsletterDelete: cap.newsletterDelete,
            userUpdate: cap.userUpdate,
            loginOtpDelete: cap.loginOtpDelete,
            auditCreate: cap.auditCreate,
            outboxRows: cap.outboxRows,
          };
          try {
            return await cb(txFake);
          } catch (error) {
            Object.assign(cap, snapshot);
            throw error;
          }
        },
        // Kept so a regression that reinstates the old post-transaction,
        // fail-open audit write is visible rather than silent.
        auditLog: {
          create: async () => {
            throw new Error("audit must be written on the transaction client");
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

    // ── The one appointment write: the link, stamped BEFORE the tombstone ──
    const linkArgs = cap.appointmentLinkUpdate as {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    };
    assert.ok(linkArgs, "appointments are linked during anonymization");
    assert.deepEqual(linkArgs.data, { patientProfileId: "pp-1" });
    assert.deepEqual(linkArgs.where, {
      id: { in: [LINKABLE_APPT_ID] },
      patientProfileId: null,
    });
    // Corroborated, not email-only: the candidate query requires the purchaser
    // account to agree too, and never considers an appointment already
    // attributed to another patient.
    const linkQuery = (cap.appointmentLinkQuery as { where: Record<string, unknown> })
      .where;
    assert.equal(linkQuery.patientProfileId, null);
    assert.equal(linkQuery.userId, "user-1");
    assert.deepEqual(linkQuery.email, {
      equals: "patient@real.example",
      mode: "insensitive",
    });

    // ── Completion audit record with retained categories + queued keys ─────
    const aData = (cap.auditCreate as { data: Record<string, unknown> }).data;
    assert.equal(aData.action, "PATIENT_ANONYMIZED");
    const meta = aData.metadata as Record<string, unknown>;
    assert.equal(meta.sessionsRevoked, true);
    assert.equal(meta.legalSignOff, "PENDING");
    assert.ok((meta.categoriesRetained as Record<string, string>).clinical);

    // ── PR-3: a count and a mechanism, never the storage keys ──────────────
    assert.equal(meta.personalObjectsQueuedForPurge, 4);
    assert.equal(meta.purgeMechanism, "outbox");
    assert.equal(
      meta.personalStorageKeysQueuedForPurge,
      undefined,
      "the raw-key array must be gone from audit metadata",
    );
    const metaJson = JSON.stringify(meta);
    for (const key of ["ins/key-1", "id/front-1", "id/back-1", "nat/front"]) {
      assert.equal(
        metaJson.includes(key),
        false,
        "no raw storage key may appear anywhere in audit metadata",
      );
    }

    // ── PR-3: one durable purge row per object, keys never used as the id ──
    const rows = cap.outboxRows ?? [];
    assert.equal(rows.length, 4);
    for (const row of rows) {
      assert.equal(row.kind, "personal_object_purge");
      const idempotencyKey = String(row.idempotencyKey);
      assert.match(
        idempotencyKey,
        /^personal_object_purge:[0-9a-f]{64}$/,
        "idempotency key is an opaque digest",
      );
      const payload = row.payload as { storageKey: string; patientProfileId?: string };
      assert.equal(payload.patientProfileId, "pp-1");
      assert.equal(idempotencyKey.includes(payload.storageKey), false);
    }
    assert.deepEqual(
      rows.map((r) => (r.payload as { storageKey: string }).storageKey),
      ["ins/key-1", "id/front-1", "id/back-1", "nat/front"],
    );
  });

  it("PR-5: a failed audit insert rolls the erasure back", async () => {
    resetCaptures();
    cap.failAuditCreate = true;
    await assert.rejects(
      anonymizePatient({ patientProfileId: "pp-1", adminId: "admin-9" }),
      "the caller must see the failure",
    );
    assert.equal(cap.profileUpdate, null, "PHI scrub rolled back");
    assert.equal(cap.userUpdate, null, "user erasure rolled back");
    assert.equal(cap.outboxRows, null, "object-purge enqueue rolled back");
  });

  it("PR-3: a failed purge enqueue rolls the erasure and the audit back", async () => {
    resetCaptures();
    cap.failOutboxCreate = true;
    await assert.rejects(anonymizePatient({ patientProfileId: "pp-1", adminId: "admin-9" }));
    assert.equal(cap.profileUpdate, null, "PHI scrub rolled back");
    assert.equal(cap.auditCreate, null, "audit rolled back");
  });
});
