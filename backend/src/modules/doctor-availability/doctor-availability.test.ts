import assert from "node:assert";
import { describe, it } from "node:test";
import { intervalsOverlap } from "./doctor-availability.service.js";

describe("intervalsOverlap", () => {
  // Helper — build a slot from an HH:mm pair on a fixed reference day.
  // The function only cares about Date math, the day choice is arbitrary.
  function slot(startHHmm: string, endHHmm: string) {
    const [sh, sm] = startHHmm.split(":").map(Number);
    const [eh, em] = endHHmm.split(":").map(Number);
    return {
      startAt: new Date(Date.UTC(2026, 4, 18, sh, sm, 0)),
      endAt: new Date(Date.UTC(2026, 4, 18, eh, em, 0)),
    };
  }

  it("returns false when intervals are touching but not overlapping", () => {
    // 09:00-09:30 and 09:30-10:00 share an endpoint but no minutes.
    assert.equal(intervalsOverlap(slot("09:00", "09:30"), slot("09:30", "10:00")), false);
    assert.equal(intervalsOverlap(slot("09:30", "10:00"), slot("09:00", "09:30")), false);
  });

  it("returns true for partial overlap on either side", () => {
    assert.equal(intervalsOverlap(slot("09:00", "09:45"), slot("09:30", "10:00")), true);
    assert.equal(intervalsOverlap(slot("09:30", "10:00"), slot("09:00", "09:45")), true);
  });

  it("returns true when one interval fully contains the other", () => {
    // 09:00-10:00 covers a 09:15-09:30 candidate.
    assert.equal(intervalsOverlap(slot("09:00", "10:00"), slot("09:15", "09:30")), true);
    assert.equal(intervalsOverlap(slot("09:15", "09:30"), slot("09:00", "10:00")), true);
  });

  it("returns true for identical intervals", () => {
    assert.equal(intervalsOverlap(slot("09:00", "09:30"), slot("09:00", "09:30")), true);
  });

  it("returns false for non-overlapping intervals far apart", () => {
    assert.equal(intervalsOverlap(slot("09:00", "09:30"), slot("14:00", "14:30")), false);
  });

  it("returns false for zero-length intervals at the boundary", () => {
    // Degenerate but the math still holds — endAt == startAt of the next.
    assert.equal(intervalsOverlap(slot("09:00", "09:00"), slot("09:00", "09:30")), false);
  });
});
