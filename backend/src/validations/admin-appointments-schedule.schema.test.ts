import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scheduleAppointmentBodySchema } from "./admin-appointments.schema.js";

describe("schedule appointment validation", () => {
  it("accepts a valid Google Meet schedule", () => {
    const r = scheduleAppointmentBodySchema.safeParse({
      scheduledAt: "2026-06-01T14:30:00.000Z",
      meetingUrl: "https://meet.google.com/abc-defg-hij",
    });
    assert.equal(r.success, true);
  });

  it("accepts a Zoom URL", () => {
    const r = scheduleAppointmentBodySchema.safeParse({
      scheduledAt: "2026-06-01T14:30:00.000Z",
      meetingUrl: "https://us02web.zoom.us/j/1234567890",
    });
    assert.equal(r.success, true);
  });

  it("accepts a Teams URL", () => {
    const r = scheduleAppointmentBodySchema.safeParse({
      scheduledAt: "2026-06-01T14:30:00.000Z",
      meetingUrl: "https://teams.microsoft.com/l/meetup-join/abc",
    });
    assert.equal(r.success, true);
  });

  it("accepts a Whereby URL", () => {
    const r = scheduleAppointmentBodySchema.safeParse({
      scheduledAt: "2026-06-01T14:30:00.000Z",
      meetingUrl: "https://global-health.whereby.com/dr-room",
    });
    assert.equal(r.success, true);
  });

  it("rejects an arbitrary URL", () => {
    const r = scheduleAppointmentBodySchema.safeParse({
      scheduledAt: "2026-06-01T14:30:00.000Z",
      meetingUrl: "https://evil.example.com/phish",
    });
    assert.equal(r.success, false);
  });

  it("rejects a non-URL string", () => {
    const r = scheduleAppointmentBodySchema.safeParse({
      meetingUrl: "not-a-url",
    });
    assert.equal(r.success, false);
  });

  it("rejects a non-ISO scheduledAt", () => {
    const r = scheduleAppointmentBodySchema.safeParse({
      scheduledAt: "2026/06/01 14:30",
    });
    assert.equal(r.success, false);
  });

  it("accepts clearing scheduledAt via null", () => {
    const r = scheduleAppointmentBodySchema.safeParse({ scheduledAt: null });
    assert.equal(r.success, true);
  });

  it("accepts clearing meetingUrl via empty string", () => {
    const r = scheduleAppointmentBodySchema.safeParse({ meetingUrl: "" });
    assert.equal(r.success, true);
  });

  it("accepts clearing meetingUrl via null", () => {
    const r = scheduleAppointmentBodySchema.safeParse({ meetingUrl: null });
    assert.equal(r.success, true);
  });

  it("rejects an empty body (must touch at least one field)", () => {
    const r = scheduleAppointmentBodySchema.safeParse({});
    assert.equal(r.success, false);
  });

  it("accepts setting only the slot (no URL yet)", () => {
    const r = scheduleAppointmentBodySchema.safeParse({
      scheduledAt: "2026-06-01T14:30:00.000Z",
    });
    assert.equal(r.success, true);
  });
});
