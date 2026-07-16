import { describe, expect, it } from "vitest";
import type { CalendarItem } from "./calendar-types";
import { dropSlotsUnderConsultations } from "./calendar-utils";

const iso = (hhmm: string) => `2026-07-20T${hhmm}:00.000Z`;

function consult(
  id: string,
  doctorId: string | null,
  start: string,
  end: string | null,
): CalendarItem {
  return {
    id,
    kind: "consultation",
    startAt: iso(start),
    endAt: end ? iso(end) : null,
    status: "SCHEDULED",
    title: "Patient",
    meta: { doctorId, patientName: "Patient" },
  };
}

function slot(
  id: string,
  doctorId: string | null,
  start: string,
  end: string,
  status = "OPEN",
): CalendarItem {
  return {
    id,
    kind: "slot",
    startAt: iso(start),
    endAt: iso(end),
    status,
    title: status,
    meta: { doctorId },
  };
}

const ids = (items: CalendarItem[]) => items.map((i) => i.id).sort();

describe("dropSlotsUnderConsultations", () => {
  it("drops the booked doctor's own slot sitting under their consultation", () => {
    const items = [
      consult("c1", "dr-a", "09:00", "09:30"),
      slot("s1", "dr-a", "09:00", "09:15"),
      slot("s2", "dr-a", "09:15", "09:30"),
    ];
    expect(ids(dropSlotsUnderConsultations(items))).toEqual(["c1"]);
  });

  it("keeps OTHER doctors' open slots at the same time", () => {
    // The all-doctors calendar regression: dr-a being booked at 09:00 says
    // nothing about dr-b and dr-c, and hiding them read as "nobody is free".
    const items = [
      consult("c1", "dr-a", "09:00", "09:30"),
      slot("s-a", "dr-a", "09:00", "09:30"),
      slot("s-b", "dr-b", "09:00", "09:30"),
      slot("s-c", "dr-c", "09:00", "09:30"),
    ];
    expect(ids(dropSlotsUnderConsultations(items))).toEqual([
      "c1",
      "s-b",
      "s-c",
    ]);
  });

  it("keeps the same doctor's slots outside the consultation span", () => {
    const items = [
      consult("c1", "dr-a", "09:00", "09:30"),
      slot("before", "dr-a", "08:45", "09:00"),
      slot("after", "dr-a", "09:30", "09:45"),
    ];
    expect(ids(dropSlotsUnderConsultations(items))).toEqual([
      "after",
      "before",
      "c1",
    ]);
  });

  it("covers the whole span of a long consultation, not just its first slot", () => {
    const items = [
      consult("c1", "dr-a", "09:00", "10:00"),
      slot("s1", "dr-a", "09:00", "09:30"),
      slot("s2", "dr-a", "09:30", "10:00"),
      slot("s3", "dr-a", "10:00", "10:30"),
    ];
    expect(ids(dropSlotsUnderConsultations(items))).toEqual(["c1", "s3"]);
  });

  it("falls back to a 30-minute span when the consultation has no end", () => {
    const items = [
      consult("c1", "dr-a", "09:00", null),
      slot("inside", "dr-a", "09:15", "09:30"),
      slot("outside", "dr-a", "09:30", "09:45"),
    ];
    expect(ids(dropSlotsUnderConsultations(items))).toEqual(["c1", "outside"]);
  });

  it("dedupes unscoped items against each other (doctor's own portal)", () => {
    // The doctor portal stamps no doctorId — there's one doctor by definition.
    // Everything unscoped shares a bucket and dedupes on time as it always has.
    const items = [
      consult("c1", null, "09:00", "09:30"),
      slot("inside", null, "09:00", "09:30"),
      slot("outside", null, "09:30", "09:45"),
    ];
    expect(ids(dropSlotsUnderConsultations(items))).toEqual(["c1", "outside"]);
  });

  it("does not let an unscoped consultation hide a named doctor's slot", () => {
    const items = [
      consult("c1", null, "09:00", "09:30"),
      slot("s1", "dr-a", "09:00", "09:30"),
    ];
    expect(ids(dropSlotsUnderConsultations(items))).toEqual(["c1", "s1"]);
  });

  it("returns items untouched when there are no consultations", () => {
    const items = [slot("s1", "dr-a", "09:00", "09:30")];
    expect(dropSlotsUnderConsultations(items)).toBe(items);
  });
});
