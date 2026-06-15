import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeAppointmentUpdateDiff } from "./admin-update-appointment.diff.js";

describe("computeAppointmentUpdateDiff", () => {
  const before = {
    scheduledAt: new Date("2026-06-01T14:00:00.000Z"),
    doctorId: "doctor-a",
  };

  it("detects time change", () => {
    const diff = computeAppointmentUpdateDiff(before, {
      scheduledAt: new Date("2026-06-01T15:00:00.000Z"),
    });
    assert.equal(diff.timeChanged, true);
    assert.equal(diff.doctorChanged, false);
    assert.equal(diff.hasChanges, true);
  });

  it("detects doctor change", () => {
    const diff = computeAppointmentUpdateDiff(before, {
      doctorId: "doctor-b",
    });
    assert.equal(diff.timeChanged, false);
    assert.equal(diff.doctorChanged, true);
    assert.equal(diff.hasChanges, true);
  });

  it("returns no changes when values match", () => {
    const diff = computeAppointmentUpdateDiff(before, {
      scheduledAt: new Date("2026-06-01T14:00:00.000Z"),
      doctorId: "doctor-a",
    });
    assert.equal(diff.hasChanges, false);
  });
});
