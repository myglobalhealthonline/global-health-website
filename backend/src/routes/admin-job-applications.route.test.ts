import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { after, before, beforeEach, describe, it, mock } from "node:test";
import Fastify, { type FastifyInstance, type FastifyPluginAsync } from "fastify";

const pdf = Buffer.from("%PDF-1.4\n% recruitment CV fixture\n");
const auditActions: string[] = [];
const state = { auditFails: false, getObjectCalls: 0 };

let app: FastifyInstance;

before(async () => {
  mock.module("../utils/admin-auth.js", {
    namedExports: {
      verifyGlobalAdminAccess: async () => ({ ok: true, method: "session" }),
      resolveAdminSessionActor: () => ({ userId: "admin-1", role: "ADMIN" }),
    },
  });
  mock.module("../modules/audit/audit.service.js", {
    namedExports: {
      recordCriticalAudit: async ({ action }: { action: string }) => {
        auditActions.push(action);
        if (state.auditFails) throw new Error("audit unavailable");
      },
    },
  });
  mock.module("../modules/recruitment/recruitment.service.js", {
    namedExports: {
      getAdminApplication: async () => null,
      getApplicationForCv: async () => ({
        id: "application-1",
        cvStorageKey: "recruitment/cv/private.pdf",
        jobListing: { id: "job-1", slug: "doctor" },
      }),
      listAdminApplications: async () => ({
        items: [],
        pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 },
      }),
      purgeApplicationRow: async () => true,
      setApplicationStatus: async () => null,
    },
  });
  mock.module("../services/object-storage.js", {
    namedExports: {
      MediaObjectNotFoundError: class MediaObjectNotFoundError extends Error {},
      deleteObject: async () => undefined,
      getObject: async () => {
        state.getObjectCalls++;
        return { Body: Readable.from(pdf), ContentType: "application/pdf" };
      },
      isMediaStorageConfigured: () => true,
      streamToNodeReadable: (body: Readable) => body,
    },
  });

  const route = (await import("./admin-job-applications.route.js"))
    .default as unknown as FastifyPluginAsync;
  app = Fastify({ logger: false });
  await app.register(route);
  await app.ready();
});

after(async () => {
  await app?.close();
});

beforeEach(() => {
  auditActions.length = 0;
  state.auditFails = false;
  state.getObjectCalls = 0;
});

describe("admin recruitment CV download", () => {
  it("audits and forces a private, non-inline PDF attachment", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/admin/job-applications/application-1/cv",
    });

    assert.equal(response.statusCode, 200, response.body);
    assert.equal(response.headers["content-type"], "application/pdf");
    assert.match(
      String(response.headers["content-disposition"]),
      /attachment;.*candidate-cv-application-1\.pdf/i,
    );
    assert.equal(response.headers["cache-control"], "private, no-store");
    assert.equal(response.headers["x-content-type-options"], "nosniff");
    assert.match(String(response.headers["content-security-policy"]), /sandbox/);
    assert.deepEqual(response.rawPayload, pdf);
    assert.deepEqual(auditActions, ["JOB_APPLICATION_CV_DOWNLOADED"]);
    assert.equal(state.getObjectCalls, 1);
  });

  it("fails closed before private storage is read when the audit store is unavailable", async () => {
    state.auditFails = true;
    const response = await app.inject({
      method: "GET",
      url: "/api/admin/job-applications/application-1/cv",
    });

    assert.equal(response.statusCode, 503, response.body);
    assert.deepEqual(auditActions, ["JOB_APPLICATION_CV_DOWNLOADED"]);
    assert.equal(state.getObjectCalls, 0);
  });
});
