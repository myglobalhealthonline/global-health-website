import assert from "node:assert";
import { describe, it } from "node:test";
import { expandWindowCandidates } from "../scheduling/slot-grid.js";
import { filterSlotsWithContiguousRun } from "./test-center-availability.service.js";

/**
 * Pure-logic tests for the test-center booking grid. No DB — these pin the
 * arithmetic that decides what a center offers, which is where a wrong answer
 * silently becomes a double-booking or a day of lost inventory.
 */

const MON = 1;
const TUE = 2;
const NINE_AM = 9 * 60;
const FIVE_PM = 17 * 60;

function win(over: Partial<Parameters<typeof expandWindowCandidates>[0][number]> = {}) {
  return {
    weekday: MON,
    startMinute: NINE_AM,
    endMinute: FIVE_PM,
    slotDurationMinutes: 30,
    effectiveFrom: null,
    effectiveUntil: null,
    ...over,
  };
}

function slot(startIso: string, endIso: string) {
  return { startAt: new Date(startIso), endAt: new Date(endIso) };
}

describe("expandWindowCandidates — test center windows", () => {
  it("generates the whole window on the base step", () => {
    // Mon 2026-03-02, Lisbon is UTC+0 in early March (WET).
    const out = expandWindowCandidates(
      [win()],
      [],
      "Europe/Lisbon",
      new Date("2026-03-02T00:00:00.000Z"),
      new Date("2026-03-03T00:00:00.000Z"),
    );
    // 09:00 -> 17:00 on a 30-min step = 16 slots.
    assert.equal(out.length, 16);
    assert.equal(out[0].startAt.toISOString(), "2026-03-02T09:00:00.000Z");
    assert.equal(out[0].endAt.toISOString(), "2026-03-02T09:30:00.000Z");
    assert.equal(out[15].endAt.toISOString(), "2026-03-02T17:00:00.000Z");
  });

  it("holds the center's wall clock across a DST transition", () => {
    // Lisbon springs forward on 2026-03-29. A center that opens at 09:00 local
    // opens at 09:00 local on BOTH sides — the UTC instant is what moves.
    // If this ever regresses, every booking in the affected week is off by an
    // hour and patients arrive to a closed door.
    const before = expandWindowCandidates(
      [win({ weekday: MON })],
      [],
      "Europe/Lisbon",
      new Date("2026-03-23T00:00:00.000Z"),
      new Date("2026-03-24T00:00:00.000Z"),
    );
    const after = expandWindowCandidates(
      [win({ weekday: MON })],
      [],
      "Europe/Lisbon",
      new Date("2026-03-30T00:00:00.000Z"),
      new Date("2026-03-31T00:00:00.000Z"),
    );
    // WET (UTC+0) before, WEST (UTC+1) after.
    assert.equal(before[0].startAt.toISOString(), "2026-03-23T09:00:00.000Z");
    assert.equal(after[0].startAt.toISOString(), "2026-03-30T08:00:00.000Z");
    // Same number of slots either side — a DST day must not lose or gain any.
    assert.equal(before.length, after.length);
  });

  it("drops candidates overlapping an admin exception (the removal is permanent)", () => {
    const out = expandWindowCandidates(
      [win()],
      [slot("2026-03-02T09:00:00.000Z", "2026-03-02T10:00:00.000Z")],
      "Europe/Lisbon",
      new Date("2026-03-02T00:00:00.000Z"),
      new Date("2026-03-03T00:00:00.000Z"),
    );
    assert.equal(out.length, 14); // 16 minus the two 30-min slots in that hour
    assert.equal(out[0].startAt.toISOString(), "2026-03-02T10:00:00.000Z");
  });

  it("honours effectiveFrom / effectiveUntil as calendar dates", () => {
    const notYet = expandWindowCandidates(
      [win({ effectiveFrom: new Date("2026-03-09T00:00:00.000Z") })],
      [],
      "Europe/Lisbon",
      new Date("2026-03-02T00:00:00.000Z"),
      new Date("2026-03-03T00:00:00.000Z"),
    );
    assert.equal(notYet.length, 0);

    const expired = expandWindowCandidates(
      [win({ effectiveUntil: new Date("2026-02-23T00:00:00.000Z") })],
      [],
      "Europe/Lisbon",
      new Date("2026-03-02T00:00:00.000Z"),
      new Date("2026-03-03T00:00:00.000Z"),
    );
    assert.equal(expired.length, 0);
  });

  it("only generates on the window's own weekday", () => {
    const out = expandWindowCandidates(
      [win({ weekday: TUE })],
      [],
      "Europe/Lisbon",
      new Date("2026-03-02T00:00:00.000Z"), // a Monday
      new Date("2026-03-03T00:00:00.000Z"),
    );
    assert.equal(out.length, 0);
  });

  it("returns nothing for an inverted or empty range", () => {
    assert.deepEqual(
      expandWindowCandidates(
        [win()],
        [],
        "Europe/Lisbon",
        new Date("2026-03-03T00:00:00.000Z"),
        new Date("2026-03-02T00:00:00.000Z"),
      ),
      [],
    );
    assert.deepEqual(
      expandWindowCandidates(
        [],
        [],
        "Europe/Lisbon",
        new Date("2026-03-02T00:00:00.000Z"),
        new Date("2026-03-03T00:00:00.000Z"),
      ),
      [],
    );
  });

  it("does not emit a trailing partial slot that overruns the window", () => {
    // 09:00-10:10 on a 30-min step fits two slots, not three: the third would
    // end at 10:30, past closing.
    const out = expandWindowCandidates(
      [win({ startMinute: NINE_AM, endMinute: 10 * 60 + 10 })],
      [],
      "UTC",
      new Date("2026-03-02T00:00:00.000Z"),
      new Date("2026-03-03T00:00:00.000Z"),
    );
    assert.equal(out.length, 2);
    assert.equal(out[1].endAt.toISOString(), "2026-03-02T10:00:00.000Z");
  });
});

describe("filterSlotsWithContiguousRun", () => {
  const nineToNineFifteen = slot("2026-03-02T09:00:00.000Z", "2026-03-02T09:15:00.000Z");
  const nineFifteenToNineThirty = slot(
    "2026-03-02T09:15:00.000Z",
    "2026-03-02T09:30:00.000Z",
  );
  const tenToTenFifteen = slot("2026-03-02T10:00:00.000Z", "2026-03-02T10:15:00.000Z");

  it("keeps a start whose run is long enough", () => {
    const out = filterSlotsWithContiguousRun(
      [nineToNineFifteen, nineFifteenToNineThirty],
      30,
    );
    assert.equal(out.length, 1);
    assert.equal(out[0].startAt.toISOString(), "2026-03-02T09:00:00.000Z");
  });

  it("drops a start the exam cannot finish from", () => {
    // 09:00 is followed by a gap (the 09:15 row is booked and therefore absent),
    // so a 30-minute exam must not be offered that start.
    const out = filterSlotsWithContiguousRun([nineToNineFifteen, tenToTenFifteen], 30);
    assert.equal(out.length, 0);
  });

  it("keeps every slot when the exam fits in one base step", () => {
    const out = filterSlotsWithContiguousRun(
      [nineToNineFifteen, nineFifteenToNineThirty, tenToTenFifteen],
      15,
    );
    assert.equal(out.length, 3);
  });

  it("spans more than two rows when the exam needs it", () => {
    const nineThirtyToNineFortyFive = slot(
      "2026-03-02T09:30:00.000Z",
      "2026-03-02T09:45:00.000Z",
    );
    const out = filterSlotsWithContiguousRun(
      [nineToNineFifteen, nineFifteenToNineThirty, nineThirtyToNineFortyFive],
      45,
    );
    assert.equal(out.length, 1);
    assert.equal(out[0].startAt.toISOString(), "2026-03-02T09:00:00.000Z");
  });
});
