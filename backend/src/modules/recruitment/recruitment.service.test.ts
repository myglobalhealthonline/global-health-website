import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

const state: {
  events: string[];
  transactionCalls: number;
  applicationData: Record<string, unknown> | null;
  outboxData: Record<string, unknown> | null;
  auditData: Record<string, unknown> | null;
  listWhere: Record<string, unknown> | null;
} = {
  events: [],
  transactionCalls: 0,
  applicationData: null,
  outboxData: null,
  auditData: null,
  listWhere: null,
};

const tx = {
  jobListing: {
    findFirst: async () => {
      state.events.push("job-open-recheck");
      return { id: "job-1" };
    },
  },
  jobApplication: {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      state.events.push("application-create");
      state.applicationData = data;
      return { id: "application-1" };
    },
  },
  outbox: {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      state.events.push("outbox-create");
      state.outboxData = data;
      return { id: "outbox-1" };
    },
  },
  auditLog: {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      state.events.push("audit-create");
      state.auditData = data;
      return { id: "audit-1" };
    },
  },
};

let service: typeof import("./recruitment.service.js");

before(async () => {
  mock.module("../../config/env.js", {
    namedExports: {
      env: {
        CLAMAV_HOST: "clamav",
        RECRUITMENT_PRIVACY_NOTICE_VERSION: "recruitment-privacy-v1",
        RECRUITMENT_RETENTION_MONTHS: 6,
      },
    },
  });
  mock.module("../../services/object-storage.js", {
    namedExports: { isMediaStorageConfigured: () => true },
  });
  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        jobApplication: {
          count: async () => 0,
          findMany: async ({ where }: { where: Record<string, unknown> }) => {
            state.listWhere = where;
            return [];
          },
        },
        $transaction: async (
          input: Promise<unknown>[] | ((client: typeof tx) => Promise<unknown>),
        ) => {
          state.transactionCalls++;
          return Array.isArray(input) ? Promise.all(input) : input(tx);
        },
      },
    },
  });
  service = await import("./recruitment.service.js");
});

beforeEach(() => {
  state.events = [];
  state.transactionCalls = 0;
  state.applicationData = null;
  state.outboxData = null;
  state.auditData = null;
  state.listWhere = null;
});

describe("recruitment application transaction", () => {
  it("atomically creates the application, PII-free outbox row, and receipt audit", async () => {
    const submittedAt = new Date("2026-08-31T12:00:00.000Z");
    await service.createApplicationAfterUpload({
      jobId: "job-1",
      fields: {
        fullName: "Jane Candidate",
        email: "jane@example.com",
        phone: "+353 1 234 5678",
        message: "Private candidate message",
        privacyAcknowledged: "true",
        website: "",
      },
      cvStorageKey: "recruitment/cv/random.pdf",
      cvByteSize: 1024,
      now: submittedAt,
    });

    assert.equal(state.transactionCalls, 1);
    assert.deepEqual(state.events, [
      "job-open-recheck",
      "application-create",
      "outbox-create",
      "audit-create",
    ]);
    assert.equal(state.applicationData?.fullName, "Jane Candidate");
    assert.deepEqual(state.outboxData?.payload, { applicationId: "application-1" });
    assert.deepEqual(state.auditData?.metadata, { jobListingId: "job-1" });
    const durableSideEffects = JSON.stringify({ outbox: state.outboxData, audit: state.auditData });
    for (const forbidden of [
      "Jane Candidate",
      "jane@example.com",
      "+353 1 234 5678",
      "Private candidate message",
      "random.pdf",
    ]) {
      assert.equal(durableSideEffects.includes(forbidden), false, `must exclude ${forbidden}`);
    }
  });

  it("uses an exclusive next-day upper boundary for date-only submittedTo filters", async () => {
    await service.listAdminApplications({
      submittedTo: new Date("2026-09-01T00:00:00.000Z"),
      page: 1,
      pageSize: 25,
    });
    assert.deepEqual(state.listWhere?.submittedAt, {
      lt: new Date("2026-09-01T00:00:00.000Z"),
    });
  });
});
