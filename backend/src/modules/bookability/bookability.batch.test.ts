import assert from "node:assert/strict";
import { before, describe, it, mock } from "node:test";

/**
 * Batch/per-item parity (perf plan docs/plans/new.md §7.4).
 *
 * The batch changes HOW bookability inputs are loaded, never what they mean.
 * These tests run the per-item readers FIRST (so any cache they populate is
 * theirs) and then run the batch, which always computes from scratch, and
 * require the two to agree for every service, every doctor, and every
 * doctor/service pair — across a fixture that covers a paused doctor, a
 * paused service, a service with no doctors, primary-window slots,
 * lookahead-only slots, and no slots at all.
 *
 * It also pins the two query-count claims the phase exists for: one metadata
 * read and one expired-hold sweep for the whole country.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-09-01T09:00:00.000Z");
const COUNTRY = "ie";

type Row = {
  id: string;
  durationMinutes: number | null;
  bookingPausedFrom: Date | null;
  bookingPausedUntil: Date | null;
  country: { bookingSetting: { bookingEnabled: boolean } | null };
  assignedDoctors: Array<{
    doctor: { id: string; bookingPausedFrom: Date | null; bookingPausedUntil: Date | null };
  }>;
};

const d1 = { id: "d1", bookingPausedFrom: null, bookingPausedUntil: null };
const d2 = {
  id: "d2",
  bookingPausedFrom: new Date(NOW.getTime() - DAY_MS),
  bookingPausedUntil: new Date(NOW.getTime() + 30 * DAY_MS),
};
const enabled = { bookingSetting: { bookingEnabled: true } };

const SERVICES: Row[] = [
  // Bookable: an open slot inside the primary window.
  {
    id: "svc-open",
    durationMinutes: 15,
    bookingPausedFrom: null,
    bookingPausedUntil: null,
    country: enabled,
    assignedDoctors: [{ doctor: d1 }, { doctor: d2 }],
  },
  // Returning: the doctor's only slot for this duration is past the horizon.
  {
    id: "svc-lookahead",
    durationMinutes: 30,
    bookingPausedFrom: null,
    bookingPausedUntil: null,
    country: enabled,
    assignedDoctors: [{ doctor: d1 }],
  },
  // No approved doctor at all.
  {
    id: "svc-no-doctors",
    durationMinutes: 15,
    bookingPausedFrom: null,
    bookingPausedUntil: null,
    country: enabled,
    assignedDoctors: [],
  },
  // Paused service: its doctor has slots, but they overlap the pause.
  {
    id: "svc-paused",
    durationMinutes: 15,
    bookingPausedFrom: new Date(NOW.getTime() - DAY_MS),
    bookingPausedUntil: new Date(NOW.getTime() + 30 * DAY_MS),
    country: enabled,
    assignedDoctors: [{ doctor: d1 }],
  },
  // Only a paused doctor.
  {
    id: "svc-paused-doctor",
    durationMinutes: 60,
    bookingPausedFrom: null,
    bookingPausedUntil: null,
    country: enabled,
    assignedDoctors: [{ doctor: d2 }],
  },
];

/** (doctorId|durationMinutes) -> the slots that doctor has for that duration. */
const SLOTS: Record<string, Array<{ startAt: string; endAt: string }>> = {
  "d1|15": [
    {
      startAt: new Date(NOW.getTime() + 2 * DAY_MS).toISOString(),
      endAt: new Date(NOW.getTime() + 2 * DAY_MS + 15 * 60_000).toISOString(),
    },
  ],
  "d1|30": [
    {
      startAt: new Date(NOW.getTime() + 40 * DAY_MS).toISOString(),
      endAt: new Date(NOW.getTime() + 40 * DAY_MS + 30 * 60_000).toISOString(),
    },
  ],
  "d2|15": [
    {
      startAt: new Date(NOW.getTime() + DAY_MS).toISOString(),
      endAt: new Date(NOW.getTime() + DAY_MS + 15 * 60_000).toISOString(),
    },
  ],
  "d2|60": [],
};

let metadataReads = 0;
let sweeps = 0;
let slotReads = 0;

/** Applies the parts of the real `where`/`select` the readers depend on. */
function selectRows(args: {
  where?: { id?: string; assignedDoctors?: { some?: { doctorId?: string } } };
  select?: { assignedDoctors?: { where?: { doctorId?: string } } };
}): Row[] {
  const wantedDoctor = args.where?.assignedDoctors?.some?.doctorId;
  const scopeDoctor = args.select?.assignedDoctors?.where?.doctorId;
  return SERVICES.filter((s) => !args.where?.id || s.id === args.where.id)
    .filter((s) => !wantedDoctor || s.assignedDoctors.some((a) => a.doctor.id === wantedDoctor))
    .map((s) => ({
      ...s,
      assignedDoctors: scopeDoctor
        ? s.assignedDoctors.filter((a) => a.doctor.id === scopeDoctor)
        : s.assignedDoctors,
    }));
}

type Bookability = typeof import("./bookability.service.js");
let svc: Bookability;

before(async () => {
  mock.module("../../db/prisma.js", {
    namedExports: {
      prisma: {
        service: {
          findMany: async (args: Parameters<typeof selectRows>[0]) => {
            metadataReads += 1;
            return selectRows(args);
          },
          findFirst: async (args: Parameters<typeof selectRows>[0]) => {
            metadataReads += 1;
            return selectRows(args)[0] ?? null;
          },
        },
      },
    },
  });
  mock.module("../doctor-availability/doctor-availability.service.js", {
    namedExports: {
      listOpenSlotsForDoctorAndService: async (
        doctorId: string,
        durationMinutes: number | null,
      ) => {
        slotReads += 1;
        return SLOTS[`${doctorId}|${durationMinutes ?? "null"}`] ?? [];
      },
      releaseExpiredHeldSlotsForDoctors: async () => {
        sweeps += 1;
      },
    },
  });
  svc = await import("./bookability.service.js");
});

const doctorServicePairs = SERVICES.flatMap((s) =>
  s.assignedDoctors.map((a) => ({ serviceId: s.id, doctorId: a.doctor.id })),
);
const doctorIds = [...new Set(doctorServicePairs.map((p) => p.doctorId))];

describe("country bookability batch", () => {
  it("matches the per-item readers for every service, doctor and pair", async () => {
    // Per-item first: whatever they cache is their own, so the batch below
    // still computes from scratch and the comparison stays meaningful.
    const perService = new Map<string, unknown>();
    for (const service of SERVICES) {
      perService.set(
        service.id,
        await svc.getServiceBookability({
          countryCode: COUNTRY,
          serviceId: service.id,
          now: NOW,
        }),
      );
    }
    const perDoctor = new Map<string, unknown>();
    for (const doctorId of doctorIds) {
      perDoctor.set(
        doctorId,
        await svc.getDoctorBookability({ countryCode: COUNTRY, doctorId, now: NOW }),
      );
    }
    const perPair = new Map<string, unknown>();
    for (const { doctorId, serviceId } of doctorServicePairs) {
      perPair.set(
        `${doctorId}|${serviceId}`,
        await svc.getDoctorBookability({
          countryCode: COUNTRY,
          doctorId,
          serviceId,
          now: NOW,
        }),
      );
    }

    const batch = await svc.getCountryBookabilityBatch({ countryCode: COUNTRY, now: NOW });

    for (const service of SERVICES) {
      assert.deepEqual(
        batch.services.get(service.id),
        perService.get(service.id),
        `service ${service.id}`,
      );
    }
    for (const doctorId of doctorIds) {
      assert.deepEqual(batch.doctors.get(doctorId), perDoctor.get(doctorId), `doctor ${doctorId}`);
    }
    for (const { doctorId, serviceId } of doctorServicePairs) {
      assert.deepEqual(
        batch.doctorServices.get(doctorId)?.get(serviceId),
        perPair.get(`${doctorId}|${serviceId}`),
        `pair ${doctorId}/${serviceId}`,
      );
    }
  });

  it("covers the fixture's full state range, so the parity above is not trivial", async () => {
    const batch = await svc.getCountryBookabilityBatch({ countryCode: COUNTRY, now: NOW });
    assert.equal(batch.services.get("svc-open")!.state, "BOOKABLE");
    assert.equal(batch.services.get("svc-lookahead")!.state, "RETURNING");
    assert.deepEqual(batch.services.get("svc-no-doctors"), {
      state: "UNAVAILABLE",
      reasonCode: "NO_APPROVED_DOCTOR",
      nextAvailableAt: null,
    });
    assert.equal(batch.services.get("svc-paused")!.reasonCode, "SERVICE_PAUSED");
    assert.equal(batch.services.get("svc-paused-doctor")!.reasonCode, "DOCTOR_PAUSED");
  });

  it("reads country metadata once and sweeps expired holds once", async () => {
    metadataReads = 0;
    sweeps = 0;
    await svc.getCountryBookabilityBatch({ countryCode: COUNTRY, now: NOW });
    assert.equal(metadataReads, 1);
    assert.equal(sweeps, 1);
  });

  it("reads each doctor/duration slot set once, not once per pair", async () => {
    slotReads = 0;
    await svc.getCountryBookabilityBatch({ countryCode: COUNTRY, now: NOW });
    // d1|15, d1|30, d2|15, d2|60 — four distinct sets across seven evaluations.
    assert.equal(slotReads, 4);
  });

  it("fills the per-item cache so a later single read agrees with the batch", async () => {
    const now = new Date(NOW.getTime() + 5 * DAY_MS);
    const batch = await svc.getCountryBookabilityBatch({ countryCode: COUNTRY, now });
    metadataReads = 0;
    const single = await svc.getServiceBookability({
      countryCode: COUNTRY,
      serviceId: "svc-open",
      now,
    });
    assert.deepEqual(single, batch.services.get("svc-open"));
    assert.equal(metadataReads, 0, "the single read should have hit the batch's cache entry");
  });

  it("reports a service the doctor does not take as NO_APPROVED_DOCTOR", async () => {
    const batch = await svc.getCountryBookabilityBatch({ countryCode: COUNTRY, now: NOW });
    const read = svc.readBatchDoctorBookability(batch, "d1", ["svc-open", "svc-not-assigned"]);
    assert.deepEqual(read.bookabilityByServiceId["svc-not-assigned"], {
      state: "UNAVAILABLE",
      reasonCode: "NO_APPROVED_DOCTOR",
      nextAvailableAt: null,
    });
    assert.equal(read.bookabilityByServiceId["svc-open"]!.state, "BOOKABLE");
  });

  it("covers every requested service id, so no card CTA silently dies", async () => {
    const batch = await svc.getCountryBookabilityBatch({ countryCode: COUNTRY, now: NOW });
    const requested = ["svc-open", "svc-lookahead", "svc-paused"];
    const read = svc.readBatchDoctorBookability(batch, "d1", requested);
    assert.deepEqual(Object.keys(read.bookabilityByServiceId).sort(), [...requested].sort());
  });
});
