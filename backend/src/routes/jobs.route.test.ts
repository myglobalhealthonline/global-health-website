import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it, mock } from "node:test";
import multipart from "@fastify/multipart";
import Fastify, { type FastifyInstance, type FastifyPluginAsync } from "fastify";
import { MAX_CV_BYTES } from "../modules/recruitment/recruitment.schema.js";

type ScanResult = "CLEAN" | "INFECTED" | "ERROR";

const state = {
  open: true,
  scanResult: "CLEAN" as ScanResult,
  scanCalls: 0,
  putCalls: 0,
  saveCalls: 0,
  deleteCalls: 0,
  saveFails: false,
};

let app: FastifyInstance;

class FakeJobClosedError extends Error {}

before(async () => {
  mock.module("../services/malware-scan.js", {
    namedExports: {
      scanBufferForMalware: async () => {
        state.scanCalls++;
        return { result: state.scanResult };
      },
    },
  });
  mock.module("../services/object-storage.js", {
    namedExports: {
      putObject: async () => {
        state.putCalls++;
      },
      deleteObject: async () => {
        state.deleteCalls++;
      },
    },
  });
  mock.module("../modules/recruitment/recruitment.service.js", {
    namedExports: {
      JobClosedError: FakeJobClosedError,
      createApplicationAfterUpload: async () => {
        state.saveCalls++;
        if (state.saveFails) throw new Error("database unavailable");
        return { id: "application-1" };
      },
      getOpenJobById: async () => (state.open ? { id: "job-1" } : null),
      getPublicJob: async () => null,
      listPublicJobs: async () => [],
    },
  });

  const jobsRoute = (await import("./jobs.route.js")).default as unknown as FastifyPluginAsync;
  app = Fastify({ logger: false });
  await app.register(multipart);
  await app.register(jobsRoute);
  await app.ready();
});

after(async () => {
  await app?.close();
});

beforeEach(() => {
  state.open = true;
  state.scanResult = "CLEAN";
  state.scanCalls = 0;
  state.putCalls = 0;
  state.saveCalls = 0;
  state.deleteCalls = 0;
  state.saveFails = false;
});

function multipartBody(file: Buffer, filename = "candidate.pdf", mimetype = "application/pdf") {
  const boundary = `recruitment-${Math.random().toString(16).slice(2)}`;
  const fields: Record<string, string> = {
    fullName: "Jane Doe",
    email: "jane@example.com",
    phone: "",
    message: "",
    privacyAcknowledged: "true",
    website: "",
  };
  const chunks: Buffer[] = [];
  for (const [name, value] of Object.entries(fields)) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
      ),
    );
  }
  chunks.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="cv"; filename="${filename}"\r\nContent-Type: ${mimetype}\r\n\r\n`,
    ),
    file,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  );
  return {
    payload: Buffer.concat(chunks),
    headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
  };
}

async function apply(file: Buffer, filename?: string, mimetype?: string) {
  const body = multipartBody(file, filename, mimetype);
  return app.inject({
    method: "POST",
    url: "/api/public/jobs/job-1/applications",
    headers: body.headers,
    payload: body.payload,
  });
}

function assertNothingStored() {
  assert.equal(state.putCalls, 0, "rejected CV must not reach private storage");
  assert.equal(state.saveCalls, 0, "rejected CV must not create an application row");
}

describe("public job application upload fail-closed boundaries", () => {
  it("stores a clean PDF and returns a neutral receipt without an application id", async () => {
    const response = await apply(Buffer.from("%PDF-1.4\n% valid fixture\n"));
    assert.equal(response.statusCode, 201, response.body);
    assert.equal(state.scanCalls, 1);
    assert.equal(state.putCalls, 1);
    assert.equal(state.saveCalls, 1);
    assert.equal(state.deleteCalls, 0);
    assert.deepEqual(response.json().data, {});
    assert.equal(response.body.includes("application-1"), false);
    assert.equal(response.body.includes("jane@example.com"), false);
  });

  it("removes the uploaded object when the final database transaction fails", async () => {
    state.saveFails = true;
    const response = await apply(Buffer.from("%PDF-1.4\n% valid fixture\n"));
    assert.equal(response.statusCode, 503, response.body);
    assert.equal(state.scanCalls, 1);
    assert.equal(state.putCalls, 1);
    assert.equal(state.saveCalls, 1);
    assert.equal(state.deleteCalls, 1);
  });

  it("rejects a closed job before reading or scanning its CV", async () => {
    state.open = false;
    const response = await apply(Buffer.from("%PDF-1.4\n% valid fixture\n"));
    assert.equal(response.statusCode, 409, response.body);
    assert.equal(state.scanCalls, 0);
    assertNothingStored();
  });

  it("rejects an oversized PDF before scanning or storage", async () => {
    const prefix = Buffer.from("%PDF-1.4\n");
    const response = await apply(Buffer.concat([prefix, Buffer.alloc(MAX_CV_BYTES + 1 - prefix.length)]));
    assert.equal(response.statusCode, 413, response.body);
    assert.equal(state.scanCalls, 0);
    assertNothingStored();
  });

  it("rejects a renamed non-PDF before scanning or storage", async () => {
    const response = await apply(Buffer.from("this is not a PDF"));
    assert.equal(response.statusCode, 400, response.body);
    assert.equal(state.scanCalls, 0);
    assertNothingStored();
  });

  it("rejects an infected PDF without storing a row or object", async () => {
    state.scanResult = "INFECTED";
    const response = await apply(Buffer.from("%PDF-1.4\n% EICAR-like fixture\n"));
    assert.equal(response.statusCode, 422, response.body);
    assert.equal(state.scanCalls, 1);
    assertNothingStored();
  });

  it("fails closed when the scanner is unavailable", async () => {
    state.scanResult = "ERROR";
    const response = await apply(Buffer.from("%PDF-1.4\n% valid fixture\n"));
    assert.equal(response.statusCode, 503, response.body);
    assert.equal(state.scanCalls, 1);
    assertNothingStored();
  });
});
