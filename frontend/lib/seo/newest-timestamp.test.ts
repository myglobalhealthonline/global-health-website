import { describe, expect, it } from "vitest";
import { newestTimestamp } from "./newest-timestamp";

describe("newestTimestamp", () => {
  it("returns undefined when there is nothing to date from", () => {
    expect(newestTimestamp()).toBeUndefined();
    expect(newestTimestamp(null, undefined, "")).toBeUndefined();
  });

  it("picks the latest instant", () => {
    expect(newestTimestamp("2026-07-01T00:00:00Z", "2026-07-20T00:00:00Z")).toBe(
      "2026-07-20T00:00:00Z",
    );
  });

  it("ignores nulls among real values", () => {
    expect(newestTimestamp(null, "2026-07-05T12:00:00Z", undefined)).toBe(
      "2026-07-05T12:00:00Z",
    );
  });

  it("compares by instant, not lexically — a later offset can sort earlier as a string", () => {
    // 2026-07-20T01:00:00+05:00 === 2026-07-19T20:00:00Z, so the Z value is
    // newer even though it loses a naive string comparison.
    expect(newestTimestamp("2026-07-20T01:00:00+05:00", "2026-07-19T23:00:00Z")).toBe(
      "2026-07-19T23:00:00Z",
    );
  });

  it("skips unparseable values instead of poisoning the result", () => {
    expect(newestTimestamp("not-a-date", "2026-07-02T00:00:00Z")).toBe("2026-07-02T00:00:00Z");
    expect(newestTimestamp("not-a-date")).toBeUndefined();
  });
});
