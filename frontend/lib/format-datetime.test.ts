import { describe, expect, it } from "vitest";
import {
  clinicTodayTomorrowKeys,
  dayKeyInTz,
  formatAppDate,
  formatAppDateTime,
  formatAppTime,
} from "./format-datetime";

describe("format-datetime", () => {
  it("preserves the established localized output while reusing formatters", () => {
    const instant = "2026-10-25T00:30:00.000Z";
    const zone = "Europe/Dublin";
    const value = new Date(instant);

    expect(formatAppDate(instant, zone)).toBe(
      new Intl.DateTimeFormat("en-IE", { dateStyle: "medium", timeZone: zone }).format(value),
    );
    expect(formatAppTime(instant, zone)).toBe(
      new Intl.DateTimeFormat("en-IE", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: zone,
      }).format(value),
    );
    expect(formatAppDateTime(instant, zone)).toBe(
      new Intl.DateTimeFormat("en-IE", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: zone,
      }).format(value),
    );
  });

  it("uses consecutive clinic calendar days across a DST transition", () => {
    // In New York, this instant is late on the day before the spring-forward.
    const zone = "America/New_York";
    const [today, tomorrow] = clinicTodayTomorrowKeys(
      new Date("2026-03-08T04:30:00.000Z"),
      zone,
    );

    expect(today).toBe("2026-03-07");
    expect(tomorrow).toBe("2026-03-08");
    expect(dayKeyInTz(new Date("2026-03-09T03:30:00.000Z"), zone)).toBe("2026-03-08");
  });
});
