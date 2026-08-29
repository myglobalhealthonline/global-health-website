import { describe, expect, it } from "vitest";
import {
  getDoctorServiceBookability,
  normalizeBookabilityByServiceId,
  normalizeBookabilitySummary,
} from "./get-country-collections";

describe("normalizeBookabilitySummary", () => {
  it("accepts the public backend contract", () => {
    expect(
      normalizeBookabilitySummary({
        state: "RETURNING",
        reasonCode: "DOCTOR_PAUSED",
        nextAvailableAt: "2026-09-17T09:00:00.000Z",
      }),
    ).toEqual({
      state: "RETURNING",
      reasonCode: "DOCTOR_PAUSED",
      nextAvailableAt: "2026-09-17T09:00:00.000Z",
    });
  });

  it("fails closed for a missing summary", () => {
    expect(normalizeBookabilitySummary(undefined)).toEqual({
      state: "UNAVAILABLE",
      reasonCode: "NO_OPEN_SLOT",
      nextAvailableAt: null,
    });
  });

  it.each([
    null,
    {},
    { state: "AVAILABLE", reasonCode: null, nextAvailableAt: null },
    { state: "UNAVAILABLE", reasonCode: "NOT_A_REASON", nextAvailableAt: null },
    { state: "BOOKABLE", reasonCode: null, nextAvailableAt: "not-a-date" },
  ])("fails closed for malformed summaries: %j", (summary) => {
    expect(normalizeBookabilitySummary(summary)).toEqual({
      state: "UNAVAILABLE",
      reasonCode: "NO_OPEN_SLOT",
      nextAvailableAt: null,
    });
  });
});

describe("doctor service bookability", () => {
  it("normalizes valid service summaries and drops malformed entries", () => {
    expect(
      normalizeBookabilityByServiceId({
        "service-1": { state: "BOOKABLE", reasonCode: null, nextAvailableAt: null },
        "service-2": { state: "AVAILABLE", reasonCode: null, nextAvailableAt: null },
      }),
    ).toEqual({
      "service-1": { state: "BOOKABLE", reasonCode: null, nextAvailableAt: null },
    });
  });

  it("fails closed when a service-specific doctor summary is missing", () => {
    expect(getDoctorServiceBookability({}, "service-1")).toEqual({
      state: "UNAVAILABLE",
      reasonCode: "NO_OPEN_SLOT",
      nextAvailableAt: null,
    });
  });
});
