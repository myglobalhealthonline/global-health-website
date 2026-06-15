import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { updateAppointmentBodySchema } from "./admin-appointments.schema.js";

describe("updateAppointmentBodySchema", () => {
  it("requires changeReason with at least 10 characters", () => {
    const short = updateAppointmentBodySchema.safeParse({
      scheduledAt: "2026-06-01T14:30:00.000Z",
      changeReason: "too short",
    });
    assert.equal(short.success, false);

    const ok = updateAppointmentBodySchema.safeParse({
      scheduledAt: "2026-06-01T14:30:00.000Z",
      changeReason: "Patient requested a later slot",
    });
    assert.equal(ok.success, true);
  });

  it("requires at least scheduledAt or doctorId", () => {
    const empty = updateAppointmentBodySchema.safeParse({
      changeReason: "Valid reason text here",
    });
    assert.equal(empty.success, false);

    const doctorOnly = updateAppointmentBodySchema.safeParse({
      doctorId: "doc_12345678",
      changeReason: "Doctor unavailable on original date",
    });
    assert.equal(doctorOnly.success, true);
  });

  it("accepts clearing doctor or schedule", () => {
    const clearDoctor = updateAppointmentBodySchema.safeParse({
      doctorId: null,
      changeReason: "Removing doctor assignment for now",
    });
    assert.equal(clearDoctor.success, true);

    const clearSlot = updateAppointmentBodySchema.safeParse({
      scheduledAt: null,
      changeReason: "Clearing slot pending reschedule",
    });
    assert.equal(clearSlot.success, true);
  });
});
