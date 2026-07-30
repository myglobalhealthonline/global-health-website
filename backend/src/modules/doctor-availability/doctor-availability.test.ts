import assert from "node:assert";
import { describe, it } from "node:test";
import {
  intervalsOverlap,
  selectMissingSlots,
  selectStaleSlots,
} from "./doctor-availability.service.js";
import {
  eachClinicLocalDay,
  isValidTimeZone,
  zonedWallClockToUtc,
} from "./timezone.js";

const NINE_AM = 9 * 60; // 540 minutes

describe("zonedWallClockToUtc", () => {
  it("converts clinic-local 09:00 to the correct UTC instant per zone/season", () => {
    // Bucharest: EET (UTC+2) winter, EEST (UTC+3) summer.
    assert.equal(
      zonedWallClockToUtc({ year: 2026, month: 1, day: 15 }, NINE_AM, "Europe/Bucharest").toISOString(),
      "2026-01-15T07:00:00.000Z",
    );
    assert.equal(
      zonedWallClockToUtc({ year: 2026, month: 7, day: 15 }, NINE_AM, "Europe/Bucharest").toISOString(),
      "2026-07-15T06:00:00.000Z",
    );
    // Dublin: UTC+0 winter, IST (UTC+1) summer.
    assert.equal(
      zonedWallClockToUtc({ year: 2026, month: 1, day: 15 }, NINE_AM, "Europe/Dublin").toISOString(),
      "2026-01-15T09:00:00.000Z",
    );
    assert.equal(
      zonedWallClockToUtc({ year: 2026, month: 7, day: 15 }, NINE_AM, "Europe/Dublin").toISOString(),
      "2026-07-15T08:00:00.000Z",
    );
  });

  it("treats UTC as identity", () => {
    assert.equal(
      zonedWallClockToUtc({ year: 2026, month: 7, day: 15 }, NINE_AM, "UTC").toISOString(),
      "2026-07-15T09:00:00.000Z",
    );
  });

  it("never emits an Invalid Date on a DST spring-forward gap", () => {
    // Dublin springs forward 2026-03-29 01:00→02:00; 01:30 wall time doesn't
    // exist. Must still yield a valid instant (luxon advances past the gap).
    const d = zonedWallClockToUtc({ year: 2026, month: 3, day: 29 }, 90, "Europe/Dublin");
    assert.equal(Number.isNaN(d.getTime()), false);
  });

  it("falls back to UTC for an unrecognized zone", () => {
    assert.equal(
      zonedWallClockToUtc({ year: 2026, month: 7, day: 15 }, NINE_AM, "Not/AZone").toISOString(),
      "2026-07-15T09:00:00.000Z",
    );
  });
});

describe("eachClinicLocalDay", () => {
  it("normalizes weekday to 0=Sun..6=Sat (matches Date#getUTCDay)", () => {
    const from = new Date("2026-05-18T00:00:00.000Z"); // Monday
    const to = new Date("2026-05-22T00:00:00.000Z");
    for (const d of eachClinicLocalDay(from, to, "UTC")) {
      const jsWeekday = new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay();
      assert.equal(d.weekday, jsWeekday);
    }
  });

  it("pads ±1 day so offset slots near the edges are not dropped", () => {
    const from = new Date("2026-05-18T00:00:00.000Z");
    const to = new Date("2026-05-18T00:00:00.000Z");
    const days = eachClinicLocalDay(from, to, "UTC");
    const keys = days.map((d) => `${d.year}-${d.month}-${d.day}`);
    assert.ok(keys.includes("2026-5-17"), "includes the day before");
    assert.ok(keys.includes("2026-5-18"), "includes the day itself");
    assert.ok(keys.includes("2026-5-19"), "includes the day after");
  });
});

describe("isValidTimeZone", () => {
  it("accepts real IANA zones and UTC, rejects junk", () => {
    assert.equal(isValidTimeZone("Europe/Bucharest"), true);
    assert.equal(isValidTimeZone("UTC"), true);
    assert.equal(isValidTimeZone("Not/AZone"), false);
    assert.equal(isValidTimeZone(""), false);
  });
});

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

describe("selectMissingSlots", () => {
  const at = (iso: string) => new Date(iso);
  const slot = (iso: string) => ({ startAt: at(iso), endAt: at(iso) });

  it("returns only the candidates whose start is not already on the calendar", () => {
    const generated = [
      slot("2026-07-31T09:00:00.000Z"),
      slot("2026-07-31T09:15:00.000Z"),
      slot("2026-07-31T09:30:00.000Z"),
    ];
    const missing = selectMissingSlots(generated, [at("2026-07-31T09:15:00.000Z")]);
    assert.deepEqual(
      missing.map((m) => m.startAt.toISOString()),
      ["2026-07-31T09:00:00.000Z", "2026-07-31T09:30:00.000Z"],
    );
  });

  it("returns nothing when every candidate already exists", () => {
    const generated = [slot("2026-07-31T09:00:00.000Z"), slot("2026-07-31T09:15:00.000Z")];
    const missing = selectMissingSlots(
      generated,
      generated.map((g) => g.startAt),
    );
    assert.equal(missing.length, 0);
  });

  it("still generates when unrelated slots out-number the candidates", () => {
    // The regression: a doctor whose week is full of BLOCKED slots left over
    // from a deleted window adds a new Friday window. The old count-based
    // short-circuit saw "52 existing >= 4 candidates" and skipped the insert,
    // so the new window listed in the UI but produced no slots at all.
    const leftovers = Array.from({ length: 52 }, (_, i) =>
      at(new Date(Date.UTC(2026, 6, 29, 8, i * 15)).toISOString()),
    );
    const generated = [
      slot("2026-07-31T00:30:00.000Z"),
      slot("2026-07-31T00:45:00.000Z"),
      slot("2026-07-31T01:00:00.000Z"),
      slot("2026-07-31T01:15:00.000Z"),
    ];
    const missing = selectMissingSlots(generated, leftovers);
    assert.equal(missing.length, 4);
  });
});

describe("selectStaleSlots", () => {
  const at = (iso: string) => new Date(iso);
  /** A 15-min base slot starting at `iso`. */
  const base = (iso: string, minutes = 15) => ({
    id: iso,
    startAt: at(iso),
    endAt: new Date(at(iso).getTime() + minutes * 60 * 1000),
  });

  it("keeps slots a live window still generates", () => {
    const rows = [base("2026-08-10T09:00:00.000Z"), base("2026-08-10T09:15:00.000Z")];
    assert.deepEqual(selectStaleSlots(rows, rows), []);
  });

  it("drops slots on a weekday no window covers any more", () => {
    // The bug: a Friday window was re-pointed at Monday, and the Friday slots
    // stayed behind — unreachable from the windows list, un-regeneratable, and
    // still bookable by a patient on a day the doctor no longer works.
    const monday = [base("2026-08-10T09:00:00.000Z"), base("2026-08-10T09:15:00.000Z")];
    const friday = [base("2026-08-14T09:00:00.000Z")];
    const stale = selectStaleSlots([...monday, ...friday], monday);
    assert.deepEqual(
      stale.map((s) => s.startAt.toISOString()),
      ["2026-08-14T09:00:00.000Z"],
    );
  });

  it("drops slots outside the window's new hours but keeps the rest", () => {
    // Window narrowed from 09:00–10:00 to 09:30–10:00.
    const rows = [
      base("2026-08-10T09:00:00.000Z"),
      base("2026-08-10T09:15:00.000Z"),
      base("2026-08-10T09:30:00.000Z"),
      base("2026-08-10T09:45:00.000Z"),
    ];
    const stale = selectStaleSlots(rows, rows.slice(2));
    assert.deepEqual(
      stale.map((s) => s.startAt.toISOString()),
      ["2026-08-10T09:00:00.000Z", "2026-08-10T09:15:00.000Z"],
    );
  });

  it("drops a coarse legacy slot that shares its start with a base candidate", () => {
    // Duration drift: a 30-min row at 09:00 and a 15-min candidate at 09:00
    // have the same start. Matching on start alone would keep the coarse row,
    // and the 09:15 candidate would then die on the overlap exclusion
    // constraint — the doctor's grid stays on a step no window describes.
    const legacy = base("2026-08-10T09:00:00.000Z", 30);
    const candidates = [base("2026-08-10T09:00:00.000Z"), base("2026-08-10T09:15:00.000Z")];
    assert.deepEqual(
      selectStaleSlots([legacy], candidates).map((s) => s.endAt.toISOString()),
      ["2026-08-10T09:30:00.000Z"],
    );
  });

  it("treats an empty candidate set as everything being stale", () => {
    // Last window deleted — nothing justifies any of it.
    const rows = [base("2026-08-10T09:00:00.000Z"), base("2026-08-14T09:00:00.000Z")];
    assert.equal(selectStaleSlots(rows, []).length, 2);
  });
});
