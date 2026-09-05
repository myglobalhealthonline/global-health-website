import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

let invalidations = 0;

const service = {
  id: "service-1",
  countryId: "country-1",
  kind: "GENERAL",
  assignedDoctors: [],
  insuranceCoverages: [],
  insuranceDoctorPayouts: [],
};

let updateAdminService:
  (typeof import("./services.service.js"))["updateAdminService"];

before(async () => {
  // Two different transaction clients flow through this path now (CA-4):
  // the base-service + translations one opened by updateAdminService, and
  // the roster one opened by syncServiceDoctorAssignments. One stub covers
  // both.
  const tx = {
    service: {
      update: async () => service,
      findUniqueOrThrow: async () => service,
    },
    serviceTranslation: { upsert: async () => ({}) },
    serviceDoctor: {
      deleteMany: async () => ({ count: 0 }),
      upsert: async () => ({}),
    },
  };

  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        service: {
          findUnique: async () => service,
          findUniqueOrThrow: async () => service,
          update: async () => service,
        },
        doctor: { findMany: async () => [{ id: "doctor-1" }] },
        $transaction: async (callback: (client: typeof tx) => unknown) => callback(tx),
      },
    },
  });
  mock.module("../bookability/bookability.service.js", {
    namedExports: {
      getServiceBookability: async () => ({
        state: "UNAVAILABLE",
        reasonCode: "NO_OPEN_SLOT",
        nextAvailableAt: null,
      }),
      invalidateBookabilityCache: () => {
        invalidations += 1;
      },
    },
  });

  ({ updateAdminService } = await import("./services.service.js"));
});

beforeEach(() => {
  invalidations = 0;
});

describe("service-side doctor assignment cache invalidation", () => {
  it("invalidates after the admin replaces a service roster", async () => {
    await updateAdminService("service-1", { doctorIds: ["doctor-1"] });
    assert.equal(invalidations, 1);
  });
});
