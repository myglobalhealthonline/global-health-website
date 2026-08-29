import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

let invalidations = 0;

const now = new Date("2026-08-29T12:00:00.000Z");
const assignment = {
  id: "assignment-1",
  serviceId: "service-1",
  doctorId: "doctor-1",
  status: "active",
  selectedBy: "admin",
  isActive: true,
  sortOrder: 0,
  doctorAmountCents: null,
  createdAt: now,
  updatedAt: now,
  service: {
    id: "service-1",
    slug: "general",
    name: "General consultation",
    kind: "GENERAL",
    durationMinutes: 30,
    basePriceCents: 5000,
    currencyCode: "EUR",
    isActive: true,
  },
};
let selfSelectedAssignments: typeof assignment[] = [];

let adminAssignServiceToDoctor:
  (typeof import("./doctor-services.service.js"))["adminAssignServiceToDoctor"];
let adminRemoveDoctorService:
  (typeof import("./doctor-services.service.js"))["adminRemoveDoctorService"];
let adminUpdateDoctorService:
  (typeof import("./doctor-services.service.js"))["adminUpdateDoctorService"];
let saveDoctorServiceSelections:
  (typeof import("./doctor-services.service.js"))["saveDoctorServiceSelections"];

before(async () => {
  const tx = {
    serviceDoctor: {
      findMany: async () => selfSelectedAssignments,
      deleteMany: async () => ({ count: 0 }),
      create: async () => {
        selfSelectedAssignments = [{ ...assignment, selectedBy: "doctor", status: "pending", isActive: false }];
        return selfSelectedAssignments[0];
      },
      update: async () => selfSelectedAssignments[0],
    },
  };
  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        doctor: {
          findUnique: async () => ({ countryId: "country-1", additionalCountries: [] }),
        },
        service: {
          findFirst: async () => ({ id: "service-1" }),
          findMany: async () => [{
            ...assignment.service,
            summary: null,
            countryId: "country-1",
            country: { code: "IE", name: "Ireland", defaultLocale: "EN" },
            translations: [],
          }],
        },
        bookingSetting: {
          findUnique: async () => ({ doctorServiceSelfSelectApproval: true }),
        },
        serviceDoctor: {
          findFirst: async () => assignment,
          findMany: async () => selfSelectedAssignments,
          upsert: async () => assignment,
          update: async () => assignment,
          deleteMany: async () => ({ count: 1 }),
        },
        $transaction: async (callback: (client: typeof tx) => unknown) => callback(tx),
      },
    },
  });
  mock.module("../bookability/bookability.service.js", {
    namedExports: {
      invalidateBookabilityCache: () => {
        invalidations += 1;
      },
    },
  });

  ({
    adminAssignServiceToDoctor,
    adminRemoveDoctorService,
    adminUpdateDoctorService,
    saveDoctorServiceSelections,
  } = await import("./doctor-services.service.js"));
});

beforeEach(() => {
  invalidations = 0;
  selfSelectedAssignments = [];
});

describe("doctor-service assignment cache invalidation", () => {
  it("invalidates after an admin assignment upsert", async () => {
    await adminAssignServiceToDoctor("doctor-1", "service-1");
    assert.equal(invalidations, 1);
  });

  it("invalidates after an assignment status update", async () => {
    await adminUpdateDoctorService("doctor-1", "assignment-1", { status: "disabled" });
    assert.equal(invalidations, 1);
  });

  it("invalidates after an assignment is removed", async () => {
    assert.equal(await adminRemoveDoctorService("doctor-1", "assignment-1"), true);
    assert.equal(invalidations, 1);
  });

  it("invalidates after doctor self-selection writes", async () => {
    await saveDoctorServiceSelections("doctor-1", ["service-1"]);
    assert.equal(invalidations, 1);
  });
});
