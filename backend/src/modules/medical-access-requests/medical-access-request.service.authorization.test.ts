import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

const state = {
  request: {
    id: "request_1",
    patientProfileId: "patient_owner",
    status: "PENDING",
    requestingUserId: "doctor_user_1",
    requestedAccessScope: "GLOBAL_NETWORK",
  },
  updates: 0,
  grants: 0,
};

let respondToAccessRequest: (typeof import(
  "./medical-access-request.service.js"
))["respondToAccessRequest"];
let MedicalAccessRequestNotFoundError: (typeof import(
  "./medical-access-request.service.js"
))["MedicalAccessRequestNotFoundError"];

before(async () => {
  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        $transaction: async (operation: (tx: unknown) => Promise<unknown>) =>
          operation({
            medicalAccessRequest: {
              findUnique: async () => ({ ...state.request }),
              updateMany: async ({
                where,
              }: {
                where: { status: string; patientProfileId: string };
              }) => {
                if (
                  state.request.status !== where.status ||
                  state.request.patientProfileId !== where.patientProfileId
                ) {
                  return { count: 0 };
                }
                state.request.status = "APPROVED";
                state.updates += 1;
                return { count: 1 };
              },
            },
            medicalAccessGrant: {
              create: async () => {
                state.grants += 1;
                return { id: "grant_1" };
              },
            },
          }),
        medicalAccessRequest: {
          update: async () => ({ ...state.request }),
        },
        medicalAccessGrant: {
          create: async () => {
            state.grants += 1;
            return { id: "grant_1" };
          },
        },
      },
    },
  });
  mock.module("../audit/audit.service.js", {
    namedExports: { recordCriticalAudit: async () => ({ id: "audit_1" }) },
  });
  mock.module("../../lib/email/templates.js", {
    namedExports: { sendMedicalAccessRequestEmail: async () => undefined },
  });

  ({ respondToAccessRequest, MedicalAccessRequestNotFoundError } = await import(
    "./medical-access-request.service.js"
  ));
});

beforeEach(() => {
  state.request.status = "PENDING";
  state.updates = 0;
  state.grants = 0;
});

describe("respondToAccessRequest patient ownership", () => {
  it("rejects a request belonging to a different authenticated patient without changing it", async () => {
    await assert.rejects(
      respondToAccessRequest({
        requestId: "request_1",
        patientProfileId: "patient_attacker",
        approved: true,
      }),
      (error: unknown) => error instanceof MedicalAccessRequestNotFoundError,
    );
    assert.equal(state.updates, 0);
    assert.equal(state.grants, 0);
  });

  it("allows the owning patient to approve the request", async () => {
    await respondToAccessRequest({
      requestId: "request_1",
      patientProfileId: "patient_owner",
      approved: true,
    });
    assert.equal(state.updates, 1);
    assert.equal(state.grants, 1);
  });

  it("creates only one grant when two approvals race", async () => {
    await Promise.all([
      respondToAccessRequest({
        requestId: "request_1",
        patientProfileId: "patient_owner",
        approved: true,
      }),
      respondToAccessRequest({
        requestId: "request_1",
        patientProfileId: "patient_owner",
        approved: true,
      }),
    ]);
    assert.equal(state.updates, 1);
    assert.equal(state.grants, 1);
  });
});
