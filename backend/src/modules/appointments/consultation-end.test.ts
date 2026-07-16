import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveConsultationEndAt } from "./consultation-end.js";

const at = (hhmm: string) => new Date(`2026-07-20T${hhmm}:00.000Z`);
const iso = (hhmm: string) => at(hhmm).toISOString();

describe("resolveConsultationEndAt", () => {
  it("uses the collapsed slot's end, keeping base-step rounding", () => {
    // A 20-min service on a 15-min grid really occupies 30 (consumeConsecutive
    // Slots rounds up), so the slot — not the service duration — is the truth.
    assert.equal(
      resolveConsultationEndAt({
        scheduledAt: at("09:00"),
        timeSlot: { endAt: at("09:30") },
        service: { durationMinutes: 20 },
      }),
      iso("09:30"),
    );
  });

  it("uses the service duration when the slot is still base-width", () => {
    // Booked before the collapse logic shipped: the slot row was never widened,
    // so trusting it alone painted this 60-min consult as a 30-min one and left
    // the back half of it looking bookable.
    assert.equal(
      resolveConsultationEndAt({
        scheduledAt: at("09:00"),
        timeSlot: { endAt: at("09:30") },
        service: { durationMinutes: 60 },
      }),
      iso("10:00"),
    );
  });

  it("falls back to scheduledAt + duration when no slot was claimed", () => {
    assert.equal(
      resolveConsultationEndAt({
        scheduledAt: at("14:00"),
        timeSlot: null,
        service: { durationMinutes: 45 },
      }),
      iso("14:45"),
    );
  });

  it("uses the slot when the service carries no duration", () => {
    assert.equal(
      resolveConsultationEndAt({
        scheduledAt: at("09:00"),
        timeSlot: { endAt: at("09:45") },
        service: { durationMinutes: null },
      }),
      iso("09:45"),
    );
  });

  it("ignores a non-positive duration rather than ending before it starts", () => {
    assert.equal(
      resolveConsultationEndAt({
        scheduledAt: at("09:00"),
        timeSlot: { endAt: at("09:30") },
        service: { durationMinutes: 0 },
      }),
      iso("09:30"),
    );
  });

  it("returns null when neither source knows the length", () => {
    assert.equal(
      resolveConsultationEndAt({
        scheduledAt: at("09:00"),
        timeSlot: null,
        service: { durationMinutes: null },
      }),
      null,
    );
    assert.equal(
      resolveConsultationEndAt({ scheduledAt: null, timeSlot: null }),
      null,
    );
  });
});
