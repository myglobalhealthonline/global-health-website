import { describe, expect, it } from "vitest";
import { isAvailabilityResponse, shouldIgnoreAvailabilityFailure } from "./SameDayBooking";

describe("SameDayBooking availability failures", () => {
  it("rejects HTTP and malformed successful envelopes instead of showing empty slots", () => {
    expect(isAvailabilityResponse(false, { ok: true, data: { slots: [] } })).toBe(false);
    expect(isAvailabilityResponse(true, { ok: false, data: { slots: [] } })).toBe(false);
    expect(isAvailabilityResponse(true, { ok: true, data: { slots: {} } })).toBe(false);
  });

  it("keeps a deadline failure retryable while ignoring cancelled stale requests", () => {
    expect(shouldIgnoreAvailabilityFailure(true, false)).toBe(false);
    expect(shouldIgnoreAvailabilityFailure(true, true)).toBe(true);
    expect(shouldIgnoreAvailabilityFailure(false, false)).toBe(true);
  });
});
