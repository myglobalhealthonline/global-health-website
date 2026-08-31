import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

const fakeEnv = { RECRUITMENT_RETENTION_ENFORCE: false };
const state = {
  events: [] as string[],
  storageFails: false,
  backlog: false,
  batches: [] as { id: string; cvStorageKey: string; retentionUntil: Date }[][],
};

const tx = {
  jobApplication: {
    deleteMany: async ({ where }: { where: { id: string } }) => {
      state.events.push(`row:${where.id}`);
      return { count: 1 };
    },
  },
  auditLog: {
    create: async () => {
      state.events.push("audit");
      return { id: "audit-1" };
    },
  },
};

let runSweep: typeof import("./recruitment-retention.service.js")["runRecruitmentRetentionSweep"];

function application(index: number) {
  return {
    id: `application-${index}`,
    cvStorageKey: `recruitment/cv/random-${index}.pdf`,
    retentionUntil: new Date("2026-08-01T00:00:00.000Z"),
  };
}

before(async () => {
  mock.module("../../config/env.js", { namedExports: { env: fakeEnv } });
  mock.module("../../services/object-storage.js", {
    namedExports: {
      isMediaStorageConfigured: () => true,
      deleteObject: async (key: string) => {
        state.events.push(`object:${key}`);
        if (state.storageFails) throw new Error("storage unavailable");
      },
    },
  });
  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        jobApplication: {
          findMany: async () => state.batches.shift() ?? [],
          findFirst: async () => (state.backlog ? { id: "remaining" } : null),
        },
        $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
      },
    },
  });
  ({ runRecruitmentRetentionSweep: runSweep } = await import(
    "./recruitment-retention.service.js"
  ));
});

beforeEach(() => {
  fakeEnv.RECRUITMENT_RETENTION_ENFORCE = false;
  state.events = [];
  state.storageFails = false;
  state.backlog = false;
  state.batches = [[application(1)]];
});

describe("recruitment retention sweep", () => {
  it("reports expired candidates without deleting while enforcement is off", async () => {
    const result = await runSweep(new Date("2026-08-31T00:00:00.000Z"));
    assert.deepEqual(result, {
      candidates: 1,
      purged: 0,
      failed: 0,
      oldestOverdueMs: 30 * 24 * 60 * 60 * 1000,
      enforced: false,
      backlogRemaining: false,
    });
    assert.deepEqual(state.events, []);
  });

  it("deletes the private object before deleting and auditing the row", async () => {
    fakeEnv.RECRUITMENT_RETENTION_ENFORCE = true;
    const result = await runSweep(new Date("2026-08-31T00:00:00.000Z"));
    assert.equal(result.purged, 1);
    assert.equal(result.failed, 0);
    assert.deepEqual(state.events, [
      "object:recruitment/cv/random-1.pdf",
      "row:application-1",
      "audit",
    ]);
  });

  it("retains the row on object failure and safely retries object-first", async () => {
    fakeEnv.RECRUITMENT_RETENTION_ENFORCE = true;
    state.storageFails = true;
    const failed = await runSweep(new Date("2026-08-31T00:00:00.000Z"));
    assert.equal(failed.purged, 0);
    assert.equal(failed.failed, 1);
    assert.deepEqual(state.events, ["object:recruitment/cv/random-1.pdf"]);

    state.storageFails = false;
    state.events = [];
    state.batches = [[application(1)]];
    const retried = await runSweep(new Date("2026-08-31T00:00:00.000Z"));
    assert.equal(retried.purged, 1);
    assert.equal(retried.failed, 0);
    assert.deepEqual(state.events, [
      "object:recruitment/cv/random-1.pdf",
      "row:application-1",
      "audit",
    ]);
  });

  it("drains multiple 100-row batches in one run", async () => {
    fakeEnv.RECRUITMENT_RETENTION_ENFORCE = true;
    state.batches = [
      Array.from({ length: 100 }, (_, index) => application(index + 1)),
      Array.from({ length: 50 }, (_, index) => application(index + 101)),
    ];
    const result = await runSweep(new Date("2026-08-31T00:00:00.000Z"));
    assert.equal(result.candidates, 150);
    assert.equal(result.purged, 150);
    assert.equal(result.backlogRemaining, false);
  });

  it("stops at the hard safety cap and reports a remaining backlog", async () => {
    fakeEnv.RECRUITMENT_RETENTION_ENFORCE = true;
    state.batches = Array.from({ length: 10 }, (_, batch) =>
      Array.from({ length: 100 }, (_, index) => application(batch * 100 + index + 1)),
    );
    state.backlog = true;
    const result = await runSweep(new Date("2026-08-31T00:00:00.000Z"));
    assert.equal(result.candidates, 1000);
    assert.equal(result.purged, 1000);
    assert.equal(result.backlogRemaining, true);
  });
});
