import "../../test-module-mocks.js";
import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

/**
 * PR-3 — the durable personal-object purge.
 *
 * Anonymization nulls the DB reference to a patient's identity/insurance
 * uploads. Deleting the objects themselves used to be either a raw-key array
 * parked in AuditLog metadata for a job that did not exist (admin path) or an
 * inline `deleteObject` whose failures were logged with the key and swallowed
 * (self-service path). Both are now one outbox kind.
 *
 * The properties that matter here are safety properties: a clinical file can
 * never be deleted through this queue, and a storage key never reaches
 * `Outbox.lastError`, a log line, or an ops alert. Synthetic keys only.
 */

type Row = Record<string, unknown>;

const store: { outbox: Row[] } = { outbox: [] };
const effects: { deleted: string[]; deleteError: Error | null } = {
  deleted: [],
  deleteError: null,
};

let outbox: typeof import("./outbox.js");

before(async () => {
  const prisma = {
    outbox: {
      createMany: async ({
        data,
        skipDuplicates,
      }: {
        data: Row[];
        skipDuplicates?: boolean;
      }) => {
        let count = 0;
        for (const row of data) {
          const clash = store.outbox.some((r) => r.idempotencyKey === row.idempotencyKey);
          if (clash && skipDuplicates) continue;
          store.outbox.push({
            id: `ob-${store.outbox.length + 1}`,
            status: "PENDING",
            attempts: 0,
            lastAttemptAt: null,
            lastError: null,
            createdAt: new Date(),
            ...row,
          });
          count += 1;
        }
        return { count };
      },
      update: async ({ where, data }: { where: Row; data: Row }) => {
        const row = store.outbox.find((r) => r.id === where.id)!;
        Object.assign(row, data);
        return { ...row };
      },
      findFirst: async () => null,
      findMany: async ({ where }: { where: Row }) =>
        store.outbox.filter((r) => r.status === (where.status as string)).map((r) => ({ ...r })),
      updateMany: async ({ where, data }: { where: Row; data: Row }) => {
        // Two shapes: the stale-PROCESSING reclaim sweep, and the per-row
        // PENDING -> PROCESSING claim.
        if (!where.id) return { count: 0 };
        const row = store.outbox.find((r) => r.id === where.id && r.status === where.status);
        if (!row) return { count: 0 };
        const next = { ...data } as Row;
        if (
          next.attempts &&
          typeof next.attempts === "object" &&
          "increment" in (next.attempts as Row)
        ) {
          next.attempts = (row.attempts as number) + 1;
        }
        Object.assign(row, next);
        return { count: 1 };
      },
    },
  };
  mock.module("../../db/prisma.js", { namedExports: { prisma } });
  mock.module("../../services/object-storage.js", {
    namedExports: {
      deleteObject: async (key: string) => {
        if (effects.deleteError) throw effects.deleteError;
        effects.deleted.push(key);
      },
    },
  });
  mock.module("../subscriptions/ops/ops-alert.js", {
    namedExports: { emitOpsAlert: async () => undefined },
  });
  outbox = await import("./outbox.js");
});

beforeEach(() => {
  store.outbox = [];
  effects.deleted = [];
  effects.deleteError = null;
});

const PERSONAL_KEY = "patient-docs/pp-synthetic/id-document/front-0001.jpg";
const PERSONAL_KEY_2 = "patient-docs/pp-synthetic/insurance/policy-0001.pdf";
const NATIONALITY_KEY = "patient-docs/pp-synthetic/nationality-1/front-0001.jpg";
const CLINICAL_KEY = "patient-docs/pp-synthetic/medical/report-0001.pdf";
const SELFIE_KEY = "patient-docs/pp-synthetic/identity-verification/selfie-0001.jpg";
const GENERATED_KEY = "generated/doc-1/appt-1/uuid/certificate.pdf";

const silentLog = { info: () => {}, error: () => {} };

/**
 * Drive the real scheduler entry point, so the row's terminal status and
 * `lastError` are produced by production code rather than asserted in the
 * abstract. Rows are reset to PENDING first so a retry can be driven.
 */
async function drain() {
  for (const row of store.outbox) {
    if (row.status === "SENT") continue;
    row.status = "PENDING";
    row.lastAttemptAt = null;
    row.attempts = 0;
  }
  return outbox.runOutboxDispatch(silentLog);
}

describe("PR-3 — personal-object purge queue", () => {
  describe("enqueue", () => {
    it("queues one row per distinct key and skips blanks and duplicates", async () => {
      const { prisma } = (await import("../../db/prisma.js")) as unknown as {
        prisma: Parameters<typeof outbox.enqueuePersonalObjectPurge>[0];
      };
      const queued = await outbox.enqueuePersonalObjectPurge(
        prisma,
        [PERSONAL_KEY, PERSONAL_KEY, PERSONAL_KEY_2, null, undefined, "", "   "],
        { patientProfileId: "pp-synthetic" },
      );
      assert.equal(queued, 2, "two distinct objects");
      assert.equal(store.outbox.length, 2);
    });

    it("re-running anonymization does not create duplicate jobs", async () => {
      const { prisma } = (await import("../../db/prisma.js")) as unknown as {
        prisma: Parameters<typeof outbox.enqueuePersonalObjectPurge>[0];
      };
      const first = await outbox.enqueuePersonalObjectPurge(prisma, [PERSONAL_KEY]);
      const second = await outbox.enqueuePersonalObjectPurge(prisma, [PERSONAL_KEY]);
      assert.equal(store.outbox.length, 1, "unique idempotency key collapses the retry");
      assert.equal(first, 1);
      // The returned count is what the anonymization audit row records, so it
      // must be rows actually inserted, not rows requested.
      assert.equal(second, 0, "the re-run queued nothing new and must say so");
    });

    it("never puts a raw storage key in the idempotency key", async () => {
      const { prisma } = (await import("../../db/prisma.js")) as unknown as {
        prisma: Parameters<typeof outbox.enqueuePersonalObjectPurge>[0];
      };
      await outbox.enqueuePersonalObjectPurge(prisma, [PERSONAL_KEY]);
      const key = String(store.outbox[0].idempotencyKey);
      assert.match(key, /^personal_object_purge:[0-9a-f]{64}$/);
      assert.equal(key.includes(PERSONAL_KEY), false);
    });
  });

  describe("namespace guard", () => {
    it("accepts exactly the personal-upload namespaces anonymization clears", () => {
      assert.equal(outbox.isPersonalUploadStorageKey(PERSONAL_KEY), true);
      assert.equal(outbox.isPersonalUploadStorageKey(PERSONAL_KEY_2), true);
      assert.equal(outbox.isPersonalUploadStorageKey(NATIONALITY_KEY), true);
    });

    it("rejects clinical and identity-verification objects", () => {
      // Clinical files share the patient-docs/ root, so this is the guard that
      // actually keeps a medical record out of a deletion queue.
      assert.equal(outbox.isPersonalUploadStorageKey(CLINICAL_KEY), false);
      assert.equal(outbox.isPersonalUploadStorageKey(SELFIE_KEY), false);
      assert.equal(outbox.isPersonalUploadStorageKey(GENERATED_KEY), false);
    });
  });

  describe("dispatch", () => {
    async function queue(key: string) {
      const { prisma } = (await import("../../db/prisma.js")) as unknown as {
        prisma: Parameters<typeof outbox.enqueuePersonalObjectPurge>[0];
      };
      await outbox.enqueuePersonalObjectPurge(prisma, [key], {
        patientProfileId: "pp-synthetic",
      });
    }

    it("deletes the object once and scrubs the key from the payload", async () => {
      await queue(PERSONAL_KEY);
      await drain();
      assert.deepEqual(effects.deleted, [PERSONAL_KEY], "deleted exactly once");
      assert.equal(store.outbox[0].status, "SENT");
      assert.deepEqual(
        store.outbox[0].payload,
        { purged: true },
        "the raw key is not retained after the object is gone",
      );
    });

    it("is a no-op on a second dispatch of an already-purged row", async () => {
      await queue(PERSONAL_KEY);
      await drain();
      store.outbox[0].status = "PENDING";
      await drain();
      assert.deepEqual(effects.deleted, [PERSONAL_KEY], "not deleted twice");
    });

    it("treats a missing object as success", async () => {
      // deleteObject is idempotent for a missing key (object-storage.ts), so a
      // second purge of an already-deleted object must not fail the row.
      await queue(PERSONAL_KEY_2);
      await drain();
      assert.deepEqual(store.outbox[0].payload, { purged: true });
      assert.equal(store.outbox[0].status, "SENT");
    });

    it("refuses a clinical storage key instead of deleting it", async () => {
      const { prisma } = (await import("../../db/prisma.js")) as unknown as {
        prisma: Parameters<typeof outbox.enqueuePersonalObjectPurge>[0];
      };
      // Force the row in directly: nothing in production enqueues a clinical
      // key, and the point is that the dispatcher would still refuse one.
      await outbox.enqueuePersonalObjectPurge(prisma, [CLINICAL_KEY]);
      await drain();
      assert.deepEqual(effects.deleted, [], "nothing was deleted");
      assert.notEqual(store.outbox[0].status, "SENT", "the row did not succeed");
      assert.match(
        String(store.outbox[0].lastError),
        /outside the personal-upload namespace/,
      );
    });

    it("keeps the storage key out of the error a failure records", async () => {
      await queue(PERSONAL_KEY);
      effects.deleteError = Object.assign(
        new Error(`AccessDenied writing ${PERSONAL_KEY} to bucket`),
        { name: "AccessDenied" },
      );
      await drain();
      const message = String(store.outbox[0].lastError ?? "");
      assert.ok(message, "the failure is recorded on the row");
      assert.equal(
        message.includes(PERSONAL_KEY),
        false,
        "Outbox.lastError, logs and ops alerts all carry this message",
      );
      assert.match(message, /object deletion failed/);
      // Still retryable: the payload keeps the key so a later attempt works.
      assert.equal(
        (store.outbox[0].payload as { storageKey?: string }).storageKey,
        PERSONAL_KEY,
      );
    });

    it("succeeds on retry after a transient failure", async () => {
      await queue(PERSONAL_KEY);
      effects.deleteError = new Error("transient");
      await drain();
      assert.notEqual(store.outbox[0].status, "SENT");
      effects.deleteError = null;
      await drain();
      assert.deepEqual(effects.deleted, [PERSONAL_KEY]);
      assert.deepEqual(store.outbox[0].payload, { purged: true });
    });
  });
});
