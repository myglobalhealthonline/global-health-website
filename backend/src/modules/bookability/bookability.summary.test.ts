import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

const now = new Date("2026-09-02T12:00:00.000Z");

type ServiceFixture = {
  id: string;
  durationMinutes: number | null;
  bookingPausedFrom: Date | null;
  bookingPausedUntil: Date | null;
  country: { bookingSetting: { bookingEnabled: boolean } | null };
  assignedDoctors: Array<{
    doctor: {
      id: string;
      bookingPausedFrom: Date | null;
      bookingPausedUntil: Date | null;
    };
  }>;
};

let serviceFixture: ServiceFixture;
let slotFixtures: Array<{ id: string; startAt: string; endAt: string }>;
let slotReads = 0;
let invalidations = 0;
let pauseSqlStatements: string[] = [];

let getServiceBookability:
  (typeof import("./bookability.service.js"))["getServiceBookability"];
let getDoctorBookability:
  (typeof import("./bookability.service.js"))["getDoctorBookability"];
let setDoctorBookingPause:
  (typeof import("./bookability.service.js"))["setDoctorBookingPause"];
let setServiceBookingPause:
  (typeof import("./bookability.service.js"))["setServiceBookingPause"];

function service(overrides: Partial<ServiceFixture> = {}): ServiceFixture {
  return {
    id: "service-1",
    durationMinutes: 30,
    bookingPausedFrom: null,
    bookingPausedUntil: null,
    country: { bookingSetting: { bookingEnabled: true } },
    assignedDoctors: [
      {
        doctor: {
          id: "doctor-1",
          bookingPausedFrom: null,
          bookingPausedUntil: null,
        },
      },
    ],
    ...overrides,
  };
}

before(async () => {
  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
          const sql = strings.join("?");
          pauseSqlStatements.push(sql);
          const id = String(values.at(-1));
          return [{
            id,
            bookingPausedFrom: values[0] as Date | null,
            bookingPausedUntil: values[1] as Date | null,
            bookingPauseReason: values[2] as string | null,
          }];
        },
        service: {
          findFirst: async () => serviceFixture,
          findMany: async () => [serviceFixture],
          update: async ({ where, data }: { where: { id: string }; data: object }) => ({
            id: where.id,
            ...data,
          }),
        },
        doctor: {
          update: async ({ where, data }: { where: { id: string }; data: object }) => ({
            id: where.id,
            ...data,
          }),
        },
      },
    },
  });
  mock.module("../doctor-availability/availability-cache-bus.js", {
    namedExports: {
      registerAvailabilityCache: () => {},
      invalidateAvailabilityCaches: () => {
        invalidations += 1;
      },
    },
  });
  mock.module("../doctor-availability/doctor-availability.service.js", {
    namedExports: {
      listOpenSlotsForDoctorAndService: async () => {
        slotReads += 1;
        return slotFixtures;
      },
    },
  });

  ({
    getServiceBookability,
    getDoctorBookability,
    setDoctorBookingPause,
    setServiceBookingPause,
  } = await import("./bookability.service.js"));
});

beforeEach(() => {
  serviceFixture = service();
  slotFixtures = [];
  slotReads = 0;
  invalidations = 0;
  pauseSqlStatements = [];
});

describe("authoritative bookability summaries", () => {
  it("deduplicates concurrent cold reads for the same summary", async () => {
    serviceFixture = service({ id: "service-concurrent" });
    slotFixtures = [
      {
        id: "slot-concurrent",
        startAt: "2026-09-03T09:00:00.000Z",
        endAt: "2026-09-03T09:30:00.000Z",
      },
    ];

    const [first, second] = await Promise.all([
      getServiceBookability({ countryCode: "IE", serviceId: "service-concurrent", now }),
      getServiceBookability({ countryCode: "IE", serviceId: "service-concurrent", now }),
    ]);

    assert.deepEqual(first, second);
    assert.equal(slotReads, 1);
  });

  it("keeps a Wednesday CTA enabled for a real compatible Thursday slot", async () => {
    slotFixtures = [
      {
        id: "slot-1",
        startAt: "2026-09-03T09:00:00.000Z",
        endAt: "2026-09-03T09:30:00.000Z",
      },
    ];
    assert.deepEqual(
      await getServiceBookability({ countryCode: "IE", serviceId: "service-1", now }),
      {
        state: "BOOKABLE",
        reasonCode: null,
        nextAvailableAt: "2026-09-03T09:00:00.000Z",
      },
    );
  });

  it("returns a verified post-pause date without enabling the CTA", async () => {
    serviceFixture = service({
      id: "service-paused",
      bookingPausedFrom: new Date("2026-09-01T00:00:00.000Z"),
      bookingPausedUntil: new Date("2026-09-20T00:00:00.000Z"),
    });
    slotFixtures = [
      {
        id: "slot-later",
        startAt: "2026-09-24T09:00:00.000Z",
        endAt: "2026-09-24T09:30:00.000Z",
      },
    ];
    assert.deepEqual(
      await getServiceBookability({ countryCode: "IE", serviceId: "service-paused", now }),
      {
        state: "RETURNING",
        reasonCode: "SERVICE_PAUSED",
        nextAvailableAt: "2026-09-24T09:00:00.000Z",
      },
    );
  });

  it("does not touch slot inventory when the country gate is closed", async () => {
    serviceFixture = service({
      id: "service-country-paused",
      country: { bookingSetting: { bookingEnabled: false } },
    });
    assert.deepEqual(
      await getServiceBookability({
        countryCode: "IE",
        serviceId: "service-country-paused",
        now,
      }),
      { state: "UNAVAILABLE", reasonCode: "COUNTRY_PAUSED", nextAvailableAt: null },
    );
    assert.equal(slotReads, 0);
  });

  it("supports a doctor-service pair summary for specialist CTAs", async () => {
    serviceFixture = service({ id: "specialist-service" });
    slotFixtures = [
      {
        id: "specialist-slot",
        startAt: "2026-09-04T10:00:00.000Z",
        endAt: "2026-09-04T10:30:00.000Z",
      },
    ];
    const summary = await getDoctorBookability({
      countryCode: "IE",
      doctorId: "doctor-1",
      serviceId: "specialist-service",
      now,
    });
    assert.equal(summary.state, "BOOKABLE");
    assert.equal(summary.nextAvailableAt, "2026-09-04T10:00:00.000Z");
  });
});

describe("pause mutations", () => {
  it("invalidates availability caches after a successful pause update", async () => {
    const updated = await setDoctorBookingPause("doctor-1", {
      bookingPausedFrom: new Date("2026-09-10T00:00:00.000Z"),
      bookingPausedUntil: null,
      bookingPauseReason: "leave",
    });
    assert.equal(updated.id, "doctor-1");
    assert.equal(invalidations, 1);
    assert.match(pauseSqlStatements[0], /UPDATE "Doctor"/);
    assert.doesNotMatch(pauseSqlStatements[0], /updatedAt/);
  });

  it("updates service pause fields without changing editorial updatedAt/lastmod", async () => {
    const updated = await setServiceBookingPause("service-1", {
      bookingPausedFrom: new Date("2026-09-10T00:00:00.000Z"),
      bookingPausedUntil: null,
      bookingPauseReason: "leave",
    });
    assert.equal(updated.id, "service-1");
    assert.equal(invalidations, 1);
    assert.match(pauseSqlStatements[0], /UPDATE "Service"/);
    assert.doesNotMatch(pauseSqlStatements[0], /updatedAt/);
  });
});
