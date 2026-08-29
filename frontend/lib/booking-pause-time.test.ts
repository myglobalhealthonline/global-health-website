import { describe, expect, it } from "vitest";
import {
  utcInstantToZonedInput,
  zonedInputToUtcInstant,
} from "./booking-pause-time";

describe("booking pause timezone conversion", () => {
  it("renders stored UTC instants as market-local wall time", () => {
    expect(utcInstantToZonedInput("2026-07-01T08:00:00.000Z", "Europe/Dublin"))
      .toBe("2026-07-01T09:00");
    expect(utcInstantToZonedInput("2026-01-01T08:00:00.000Z", "Europe/Dublin"))
      .toBe("2026-01-01T08:00");
  });

  it("converts market-local wall time to an offset-bearing UTC instant", () => {
    expect(zonedInputToUtcInstant("2026-07-01T09:00", "Europe/Dublin"))
      .toBe("2026-07-01T08:00:00.000Z");
    expect(zonedInputToUtcInstant("2026-01-01T09:00", "Europe/Dublin"))
      .toBe("2026-01-01T09:00:00.000Z");
  });

  it("round-trips across a date boundary in a positive-offset market", () => {
    const instant = zonedInputToUtcInstant("2026-08-10T00:30", "Europe/Bucharest");
    expect(instant).toBe("2026-08-09T21:30:00.000Z");
    expect(utcInstantToZonedInput(instant, "Europe/Bucharest"))
      .toBe("2026-08-10T00:30");
  });

  it("rejects invalid zones and nonexistent DST wall times", () => {
    expect(zonedInputToUtcInstant("2026-03-29T01:30", "Europe/Dublin")).toBe("");
    expect(zonedInputToUtcInstant("2026-07-01T09:00", "Not/AZone")).toBe("");
    expect(utcInstantToZonedInput("not-a-date", "Europe/Dublin")).toBe("");
  });
});
