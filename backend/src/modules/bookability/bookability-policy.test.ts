import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deriveBookability,
  isPauseActiveAt,
  resolveBookabilityFailClosed,
  slotOverlapsPause,
} from "./bookability-policy.js";

const now = new Date("2026-09-02T12:00:00.000Z"); // Wednesday
const thursday = "2026-09-03T09:00:00.000Z";

describe("deriveBookability", () => {
  it("keeps booking enabled across a weekly gap when Thursday has a compatible slot", () => {
    assert.deepEqual(
      deriveBookability({
        now,
        countryBookingEnabled: true,
        approvedDoctorIds: ["doctor-1"],
        primarySlots: [{ doctorId: "doctor-1", startAt: thursday }],
        lookaheadSlots: [],
      }),
      { state: "BOOKABLE", reasonCode: null, nextAvailableAt: thursday },
    );
  });

  it("does not infer availability from an approved doctor's weekly windows", () => {
    assert.deepEqual(
      deriveBookability({
        now,
        countryBookingEnabled: true,
        approvedDoctorIds: ["doctor-1"],
        primarySlots: [],
        lookaheadSlots: [],
      }),
      { state: "UNAVAILABLE", reasonCode: "NO_OPEN_SLOT", nextAvailableAt: null },
    );
  });

  it("returns only a verified compatible slot as a return date", () => {
    const later = "2026-09-24T09:00:00.000Z";
    assert.deepEqual(
      deriveBookability({
        now,
        countryBookingEnabled: true,
        approvedDoctorIds: ["doctor-1"],
        primarySlots: [],
        lookaheadSlots: [{ doctorId: "doctor-1", startAt: later }],
      }),
      { state: "RETURNING", reasonCode: "NO_OPEN_SLOT", nextAvailableAt: later },
    );
  });

  it("keeps an active finite doctor pause disabled even when a post-pause slot exists", () => {
    const later = "2026-09-24T09:00:00.000Z";
    assert.deepEqual(
      deriveBookability({
        now,
        countryBookingEnabled: true,
        approvedDoctorIds: ["doctor-1"],
        doctorPauses: {
          "doctor-1": {
            bookingPausedFrom: new Date("2026-09-01T00:00:00.000Z"),
            bookingPausedUntil: new Date("2026-09-20T00:00:00.000Z"),
          },
        },
        primarySlots: [],
        lookaheadSlots: [{ doctorId: "doctor-1", startAt: later }],
      }),
      { state: "RETURNING", reasonCode: "DOCTOR_PAUSED", nextAvailableAt: later },
    );
  });

  it("returns a verified post-pause slot even when it falls inside the primary horizon", () => {
    assert.deepEqual(
      deriveBookability({
        now,
        countryBookingEnabled: true,
        approvedDoctorIds: ["doctor-1"],
        doctorPauses: {
          "doctor-1": {
            bookingPausedFrom: new Date("2026-09-01T00:00:00.000Z"),
            bookingPausedUntil: new Date("2026-09-03T00:00:00.000Z"),
          },
        },
        primarySlots: [{ doctorId: "doctor-1", startAt: thursday }],
        lookaheadSlots: [],
      }),
      { state: "RETURNING", reasonCode: "DOCTOR_PAUSED", nextAvailableAt: thursday },
    );
  });

  it("does not invent a return date for an indefinite doctor pause", () => {
    assert.deepEqual(
      deriveBookability({
        now,
        countryBookingEnabled: true,
        approvedDoctorIds: ["doctor-1"],
        doctorPauses: {
          "doctor-1": {
            bookingPausedFrom: new Date("2026-09-01T00:00:00.000Z"),
            bookingPausedUntil: null,
          },
        },
        primarySlots: [],
        lookaheadSlots: [],
      }),
      { state: "UNAVAILABLE", reasonCode: "DOCTOR_PAUSED", nextAvailableAt: null },
    );
  });

  it("gives the country booking switch highest precedence", () => {
    assert.deepEqual(
      deriveBookability({
        now,
        countryBookingEnabled: false,
        approvedDoctorIds: ["doctor-1"],
        primarySlots: [{ doctorId: "doctor-1", startAt: thursday }],
        lookaheadSlots: [],
      }),
      { state: "UNAVAILABLE", reasonCode: "COUNTRY_PAUSED", nextAvailableAt: null },
    );
  });

  it("requires an approved active service-doctor assignment", () => {
    assert.deepEqual(
      deriveBookability({
        now,
        countryBookingEnabled: true,
        approvedDoctorIds: [],
        primarySlots: [{ doctorId: "doctor-1", startAt: thursday }],
        lookaheadSlots: [],
      }),
      {
        state: "UNAVAILABLE",
        reasonCode: "NO_APPROVED_DOCTOR",
        nextAvailableAt: null,
      },
    );
  });
});

describe("resolveBookabilityFailClosed", () => {
  it("preserves a successfully computed public summary", async () => {
    const summary = {
      state: "BOOKABLE" as const,
      reasonCode: null,
      nextAvailableAt: thursday,
    };

    assert.deepEqual(
      await resolveBookabilityFailClosed(async () => summary),
      summary,
    );
  });

  it("returns a controlled unavailable summary when computation fails", async () => {
    assert.deepEqual(
      await resolveBookabilityFailClosed(async () => {
        throw new Error("slot provider offline");
      }),
      {
        state: "UNAVAILABLE",
        reasonCode: "NO_OPEN_SLOT",
        nextAvailableAt: null,
      },
    );
  });
});

describe("pause interval policy", () => {
  const pause = {
    bookingPausedFrom: new Date("2026-09-10T09:00:00.000Z"),
    bookingPausedUntil: new Date("2026-09-10T17:00:00.000Z"),
  };

  it("uses half-open boundaries for active pauses", () => {
    assert.equal(isPauseActiveAt(pause, new Date("2026-09-10T09:00:00.000Z")), true);
    assert.equal(isPauseActiveAt(pause, new Date("2026-09-10T17:00:00.000Z")), false);
  });

  it("filters a compatible slot that crosses into a pause", () => {
    assert.equal(
      slotOverlapsPause(
        {
          startAt: new Date("2026-09-10T08:45:00.000Z"),
          endAt: new Date("2026-09-10T09:15:00.000Z"),
        },
        pause,
      ),
      true,
    );
  });

  it("does not filter a slot ending exactly when the pause begins", () => {
    assert.equal(
      slotOverlapsPause(
        {
          startAt: new Date("2026-09-10T08:30:00.000Z"),
          endAt: new Date("2026-09-10T09:00:00.000Z"),
        },
        pause,
      ),
      false,
    );
  });
});
