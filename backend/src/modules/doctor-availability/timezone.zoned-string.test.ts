import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { zonedDateTimeStringToUtc } from "./timezone.js";

/**
 * `zonedDateTimeStringToUtc` is the manual-booking scheduling bridge: an
 * admin enters a naive wall-clock ("2026-07-15T14:00") and it must land on
 * the correct UTC instant for the clinic's country — DST-aware — while still
 * honoring legacy ISO-with-offset strings as absolute instants.
 */
describe("zonedDateTimeStringToUtc", () => {
  it("interprets a naive string in the clinic zone — Dublin summer (IST = UTC+1)", () => {
    const utc = zonedDateTimeStringToUtc("2026-07-15T14:00", "Europe/Dublin");
    assert.equal(utc?.toISOString(), "2026-07-15T13:00:00.000Z");
  });

  it("interprets a naive string in the clinic zone — Dublin winter (UTC+0)", () => {
    const utc = zonedDateTimeStringToUtc("2026-01-15T14:00", "Europe/Dublin");
    assert.equal(utc?.toISOString(), "2026-01-15T14:00:00.000Z");
  });

  it("handles Central European Summer Time — Prague (CEST = UTC+2)", () => {
    const utc = zonedDateTimeStringToUtc("2026-07-15T09:00", "Europe/Prague");
    assert.equal(utc?.toISOString(), "2026-07-15T07:00:00.000Z");
  });

  it("handles São Paulo (no DST since 2019; UTC-3)", () => {
    const utc = zonedDateTimeStringToUtc("2026-07-15T09:00", "America/Sao_Paulo");
    assert.equal(utc?.toISOString(), "2026-07-15T12:00:00.000Z");
  });

  it("honors an ISO-with-offset string as an absolute instant (legacy contract)", () => {
    // The Z makes the instant unambiguous; the clinic zone only changes the
    // representation, so toUTC() returns the same moment.
    const utc = zonedDateTimeStringToUtc("2026-07-15T14:00:00Z", "Europe/Dublin");
    assert.equal(utc?.toISOString(), "2026-07-15T14:00:00.000Z");
  });

  it("falls back to UTC for an unknown zone rather than throwing", () => {
    const utc = zonedDateTimeStringToUtc("2026-07-15T14:00", "Not/AZone");
    assert.equal(utc?.toISOString(), "2026-07-15T14:00:00.000Z");
  });

  it("returns null for empty / nullish input", () => {
    assert.equal(zonedDateTimeStringToUtc("", "Europe/Dublin"), null);
    assert.equal(zonedDateTimeStringToUtc(null, "Europe/Dublin"), null);
    assert.equal(zonedDateTimeStringToUtc(undefined, "Europe/Dublin"), null);
  });

  it("returns null for an unparseable string", () => {
    assert.equal(zonedDateTimeStringToUtc("not-a-date", "Europe/Dublin"), null);
  });
});
