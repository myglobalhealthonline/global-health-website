import assert from "node:assert/strict";
import { before, beforeEach, describe, it, mock } from "node:test";

let heldReads = 0;
let heldReadDoctorIds: string[][] = [];
let pauseReads = 0;
let slotReads = 0;
let windowReads = 0;

let listOpenSlotsForDoctorAndService:
  (typeof import("./doctor-availability.service.js"))["listOpenSlotsForDoctorAndService"];
let releaseExpiredHeldSlotsForDoctors:
  (typeof import("./doctor-availability.service.js"))["releaseExpiredHeldSlotsForDoctors"];

before(async () => {
  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        doctor: {
          findUnique: async ({
            where,
            select,
          }: {
            where: { id: string };
            select: { active?: boolean };
          }) => {
            if (select.active) return { active: where.id !== "doctor-suspended" };
            pauseReads += 1;
            return {
              bookingPausedFrom: null,
              bookingPausedUntil: null,
              country: { bookingSetting: { timezone: "UTC" } },
            };
          },
        },
        doctorAvailability: {
          findMany: async () => {
            windowReads += 1;
            return [];
          },
        },
        doctorTimeSlot: {
          findMany: async ({
            where,
          }: {
            where: { doctorId?: { in?: string[] }; status?: string };
          }) => {
            if (where.status === "HELD") {
              heldReads += 1;
              heldReadDoctorIds.push([...(where.doctorId?.in ?? [])]);
              return [];
            }
            slotReads += 1;
            return [
              {
                id: "slot-1",
                startAt: new Date("2026-09-03T09:00:00.000Z"),
                endAt: new Date("2026-09-03T09:30:00.000Z"),
                status: "OPEN",
              },
            ];
          },
        },
      },
    },
  });
  mock.module("./availability-cache-bus.js", {
    namedExports: {
      invalidateAvailabilityCaches: () => {},
      registerAvailabilityCache: () => {},
    },
  });

  ({
    listOpenSlotsForDoctorAndService,
    releaseExpiredHeldSlotsForDoctors,
  } = await import("./doctor-availability.service.js"));
});

beforeEach(() => {
  heldReads = 0;
  heldReadDoctorIds = [];
  pauseReads = 0;
  slotReads = 0;
  windowReads = 0;
});

describe("public slot cache", () => {
  it("never exposes cached slot rows for a suspended doctor", async () => {
    const slots = await listOpenSlotsForDoctorAndService(
      "doctor-suspended",
      30,
      new Date("2026-09-01T00:00:00.000Z"),
      new Date("2026-09-02T00:00:00.000Z"),
    );

    assert.deepEqual(slots, []);
    assert.equal(heldReads, 0);
    assert.equal(windowReads, 0);
    assert.equal(slotReads, 0);
  });

  it("deduplicates concurrent cold reads for the same doctor/service range", async () => {
    const fromUtc = new Date("2026-09-03T00:00:00.000Z");
    const toUtc = new Date("2026-09-04T00:00:00.000Z");

    const [first, second] = await Promise.all([
      listOpenSlotsForDoctorAndService("doctor-1", 30, fromUtc, toUtc),
      listOpenSlotsForDoctorAndService("doctor-1", 30, fromUtc, toUtc),
    ]);

    assert.deepEqual(first, second);
    assert.equal(heldReads, 1);
    assert.equal(slotReads, 1);
  });

  it("loads one raw slot inventory for concurrent service durations", async () => {
    const fromUtc = new Date("2026-09-05T00:00:00.000Z");
    const toUtc = new Date("2026-09-06T00:00:00.000Z");

    const [thirtyMinutes, sixtyMinutes] = await Promise.all([
      listOpenSlotsForDoctorAndService("doctor-multi-duration", 30, fromUtc, toUtc, {
        skipExpiredRelease: true,
      }),
      listOpenSlotsForDoctorAndService("doctor-multi-duration", 60, fromUtc, toUtc, {
        skipExpiredRelease: true,
      }),
    ]);

    assert.equal(thirtyMinutes.length, 1);
    assert.equal(sixtyMinutes.length, 0);
    assert.equal(windowReads, 1);
    assert.equal(slotReads, 1);
    assert.equal(pauseReads, 1);
  });

  it("does not let a skip-release cache entry satisfy a normal read", async () => {
    const fromUtc = new Date("2026-09-07T00:00:00.000Z");
    const toUtc = new Date("2026-09-08T00:00:00.000Z");

    await listOpenSlotsForDoctorAndService("doctor-skip-separation", 30, fromUtc, toUtc, {
      skipExpiredRelease: true,
    });
    await listOpenSlotsForDoctorAndService("doctor-skip-separation", 30, fromUtc, toUtc);

    assert.equal(heldReads, 1);
    assert.equal(windowReads, 2);
    assert.equal(slotReads, 2);
    assert.equal(pauseReads, 2);
  });

  it("does not sweep the same doctor's expired holds twice concurrently", async () => {
    await Promise.all([
      releaseExpiredHeldSlotsForDoctors(["doctor-sweep-1", "doctor-sweep-2"]),
      releaseExpiredHeldSlotsForDoctors(["doctor-sweep-2", "doctor-sweep-3"]),
    ]);

    assert.equal(heldReads, 2);
    assert.equal(
      heldReadDoctorIds.flat().filter((doctorId) => doctorId === "doctor-sweep-2").length,
      1,
    );
  });
});
