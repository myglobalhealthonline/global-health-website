import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

/**
 * PR-3, self-service half — the expired-grace-period account purge.
 *
 * This path used to delete the patient's personal uploads inline: it logged the
 * raw storage key on failure and then carried on to scrub the DB row anyway, so
 * a permissions or network error left an orphaned object in the bucket and a
 * DB row that no longer pointed at it. The keys are now queued on the durable
 * outbox inside the same transaction that clears their columns.
 *
 * Fully mocked — no DB, no object storage, no network. Synthetic ids and keys.
 */

type Row = Record<string, unknown>;

const USER_ID = "user-purge-synthetic";
const PROFILE_ID = "pp-purge-synthetic";
const INSURANCE_KEY = `patient-docs/${PROFILE_ID}/insurance/policy-0001.pdf`;
const ID_FRONT_KEY = `patient-docs/${PROFILE_ID}/id-document/front-0001.jpg`;
const NATIONALITY_KEY = `patient-docs/${PROFILE_ID}/nationality-1/front-0001.jpg`;

const cap: {
  profileUpdate: Row | null;
  userUpdate: Row | null;
  outboxRows: Row[] | null;
  auditCreate: Row | null;
  clinicalTouched: boolean;
  failOutbox: boolean;
  failAudit: boolean;
  /** How many rows createMany reports as INSERTED, independent of how many
   *  were requested — models skipDuplicates collapsing a re-run. */
  outboxInsertedCount: number | null;
} = {
  profileUpdate: null,
  userUpdate: null,
  outboxRows: null,
  auditCreate: null,
  clinicalTouched: false,
  failOutbox: false,
  failAudit: false,
  outboxInsertedCount: null,
};

/** Anything written here would be a clinical record leaving the retention set. */
const clinicalTripwire = {
  update: async () => {
    cap.clinicalTouched = true;
    return {};
  },
  updateMany: async () => {
    cap.clinicalTouched = true;
    return { count: 0 };
  },
  deleteMany: async () => {
    cap.clinicalTouched = true;
    return { count: 0 };
  },
  delete: async () => {
    cap.clinicalTouched = true;
    return {};
  },
};

let purgeExpiredAccountDeletions: (typeof import("./auth.service.js"))["purgeExpiredAccountDeletions"];
/** Any use of the fail-open recordAudit helper on this path. Must stay empty. */
const failOpenAuditCalls: true[] = [];
/** Anything the production code passed to console.error during a purge. */
const consoleErrors: unknown[][] = [];

before(async () => {
  const txFake = {
    patientProfile: {
      update: async (args: Row) => {
        cap.profileUpdate = args;
        return {};
      },
    },
    user: {
      update: async (args: Row) => {
        cap.userUpdate = args;
        return {};
      },
    },
    outbox: {
      createMany: async (args: { data: Row[] }) => {
        if (cap.failOutbox) throw new Error("simulated outbox enqueue failure");
        cap.outboxRows = args.data;
        return { count: cap.outboxInsertedCount ?? args.data.length };
      },
    },
    // PR-5 completion record — written on the TRANSACTION, so a failure here
    // has to take the scrub and the enqueue down with it.
    auditLog: {
      create: async (args: Row) => {
        if (cap.failAudit) throw new Error("simulated audit insert failure");
        cap.auditCreate = args;
        return {};
      },
    },
    appointment: clinicalTripwire,
    medicalDocument: clinicalTripwire,
    consultation: clinicalTripwire,
    prescription: clinicalTripwire,
  };

  const prisma = {
    user: {
      findMany: async () => [{ id: USER_ID }],
      findUnique: async () => ({ email: "patient@synthetic.test" }),
    },
    patientProfile: {
      findUnique: async () => ({
        id: PROFILE_ID,
        insuranceDocumentKey: INSURANCE_KEY,
        idDocumentKey: ID_FRONT_KEY,
        idDocumentBackKey: null,
      }),
    },
    patientNationalityDocument: {
      findMany: async () => [{ frontFileKey: NATIONALITY_KEY, backFileKey: null }],
    },
    $transaction: async (cb: (tx: typeof txFake) => Promise<unknown>) => {
      const snapshot = { ...cap };
      try {
        return await cb(txFake);
      } catch (error) {
        cap.profileUpdate = snapshot.profileUpdate;
        cap.userUpdate = snapshot.userUpdate;
        cap.outboxRows = snapshot.outboxRows;
        cap.auditCreate = snapshot.auditCreate;
        throw error;
      }
    },
    appointment: clinicalTripwire,
    medicalDocument: clinicalTripwire,
  };

  mock.module("../../db/prisma.js", { namedExports: { prisma } });
  // Tripwire: the completion record must NOT go through the fail-open
  // `recordAudit` helper any more — an audit insert that fails has to roll the
  // erasure back, which only a write on the transaction can do.
  mock.module("../audit/audit.service.js", {
    namedExports: {
      recordAudit: async () => {
        failOpenAuditCalls.push(true);
      },
    },
  });
  mock.module("../two-factor/login-otp.service.js", {
    namedExports: { revokeTrustedDevices: async () => undefined },
  });
  // A tripwire: nothing on this path may call object storage directly any more.
  mock.module("../../services/object-storage.js", {
    namedExports: {
      deleteObject: async () => {
        throw new Error("purge must not delete objects inline");
      },
    },
  });

  const original = console.error;
  console.error = (...args: unknown[]) => {
    consoleErrors.push(args);
    void original;
  };

  ({ purgeExpiredAccountDeletions } = await import("./auth.service.js"));
});

beforeEach(() => {
  cap.profileUpdate = null;
  cap.userUpdate = null;
  cap.outboxRows = null;
  cap.auditCreate = null;
  cap.clinicalTouched = false;
  cap.failOutbox = false;
  cap.failAudit = false;
  cap.outboxInsertedCount = null;
  consoleErrors.length = 0;
  failOpenAuditCalls.length = 0;
});

describe("PR-3 — expired-grace-period account purge", () => {
  it("queues every personal upload instead of deleting it inline", async () => {
    const result = await purgeExpiredAccountDeletions();
    assert.deepEqual(result, { purged: 1, failed: 0 });

    const rows = cap.outboxRows ?? [];
    assert.equal(rows.length, 3, "insurance + id front + nationality front");
    assert.deepEqual(
      rows.map((r) => (r.payload as { storageKey: string }).storageKey),
      [INSURANCE_KEY, ID_FRONT_KEY, NATIONALITY_KEY],
    );
    for (const row of rows) {
      assert.equal(row.kind, "personal_object_purge");
      assert.match(String(row.idempotencyKey), /^personal_object_purge:[0-9a-f]{64}$/);
      assert.equal(
        (row.payload as { patientProfileId?: string }).patientProfileId,
        PROFILE_ID,
        "linked so a deletion request cannot claim COMPLETED while this is queued",
      );
    }
  });

  it("scrubs identity and leaves every clinical record untouched", async () => {
    await purgeExpiredAccountDeletions();
    const profileData = (cap.profileUpdate as { data: Row }).data;
    assert.equal(profileData.nationalIdNumber, null);
    assert.equal(profileData.idDocumentKey, null);
    assert.equal(profileData.insuranceDocumentKey, null);
    assert.ok(profileData.anonymizedAt, "anonymization recorded");
    const userData = (cap.userUpdate as { data: Row }).data;
    assert.equal(userData.isActive, false);
    assert.deepEqual(userData.tokenVersion, { increment: 1 }, "sessions revoked");
    assert.equal(cap.clinicalTouched, false, "no clinical row written");
  });

  it("never writes a storage key to the application log", async () => {
    await purgeExpiredAccountDeletions();
    const logged = JSON.stringify(consoleErrors);
    for (const key of [INSURANCE_KEY, ID_FRONT_KEY, NATIONALITY_KEY]) {
      assert.equal(logged.includes(key), false);
    }
  });

  it("reports the objects as queued, not deleted, in the audit record", async () => {
    await purgeExpiredAccountDeletions();
    const meta = (cap.auditCreate as { data: { metadata: Row } }).data.metadata;
    assert.equal(meta.personalObjectsQueuedForPurge, 3);
    assert.equal(meta.purgeMechanism, "outbox");
    assert.equal(meta.objectsDeleted, undefined, "nothing claims the files are gone yet");
    const metaJson = JSON.stringify(meta);
    for (const key of [INSURANCE_KEY, ID_FRONT_KEY, NATIONALITY_KEY]) {
      assert.equal(metaJson.includes(key), false, "no raw key in audit metadata");
    }
  });

  it("rolls the scrub back when the purge enqueue fails", async () => {
    cap.failOutbox = true;
    const result = await purgeExpiredAccountDeletions();
    // The batch records the row as failed and leaves it a candidate for the
    // next tick rather than scrubbing the DB with the deletion work lost.
    assert.deepEqual(result, { purged: 0, failed: 1 });
    assert.equal(cap.profileUpdate, null, "PHI scrub rolled back");
    assert.equal(cap.userUpdate, null, "user erasure rolled back");
    assert.equal(cap.auditCreate, null, "no completion record for work that did not happen");
  });

  it("rolls the scrub AND the enqueue back when the audit insert fails", async () => {
    // The failure mode this closes: scrub commits, purge enqueue commits, audit
    // insert fails — leaving an irreversible erasure with no durable evidence
    // it was ever performed.
    cap.failAudit = true;
    const result = await purgeExpiredAccountDeletions();
    assert.deepEqual(result, { purged: 0, failed: 1 });
    assert.equal(cap.profileUpdate, null, "PHI scrub rolled back");
    assert.equal(cap.userUpdate, null, "user erasure rolled back");
    assert.equal(cap.outboxRows, null, "purge enqueue rolled back");
  });

  it("commits the scrub, the enqueue and the audit together", async () => {
    const result = await purgeExpiredAccountDeletions();
    assert.deepEqual(result, { purged: 1, failed: 0 });
    assert.ok(cap.profileUpdate, "scrub committed");
    assert.ok(cap.userUpdate, "user erasure committed");
    assert.equal((cap.outboxRows ?? []).length, 3, "purge enqueued");
    assert.ok(cap.auditCreate, "completion record committed");
    assert.deepEqual(
      failOpenAuditCalls,
      [],
      "the completion record does not go through the fail-open recordAudit helper",
    );
  });

  it("reports the INSERTED purge count, not the requested one", async () => {
    // A re-run enqueues nothing new (unique idempotencyKey + skipDuplicates).
    // The audit has to say so rather than repeating `fileKeys.length`.
    cap.outboxInsertedCount = 0;
    await purgeExpiredAccountDeletions();
    const meta = (cap.auditCreate as { data: { metadata: Row } }).data.metadata;
    assert.equal(meta.personalObjectsQueuedForPurge, 0, "truthful about duplicates");
    assert.equal(meta.purgeMechanism, "outbox");
  });

  it("keeps every raw storage key out of the completion record", async () => {
    await purgeExpiredAccountDeletions();
    const audit = cap.auditCreate as { data: { metadata: Row; entityId: string } };
    const json = JSON.stringify(audit.data);
    for (const key of [INSURANCE_KEY, ID_FRONT_KEY, NATIONALITY_KEY]) {
      assert.equal(json.includes(key), false, "no raw storage key");
    }
    // Opaque ids and a reason code only — no email, name or national id.
    assert.equal(audit.data.entityId, USER_ID);
    assert.equal(audit.data.metadata.patientProfileId, PROFILE_ID);
    assert.equal(audit.data.metadata.reason, "gdpr_deletion_grace_period_expired");
    assert.equal(json.includes("patient@synthetic.test"), false, "no email");
  });
});
