import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const source = readFileSync(join(__dirname, "doctor-availability.service.ts"), "utf8");

describe("doctor availability pause enforcement", () => {
  it("filters pause overlaps before returning base and duration-compatible slots", () => {
    assert.match(source, /loadDoctorBookingPause\(doctorId\)/);
    assert.match(source, /rawRows\.filter\(\(row\) => !slotOverlapsPause\(row, pause\)\)/);
  });

  it("enforces doctor pauses inside the atomic slot claim", () => {
    assert.match(source, /UPDATE "DoctorTimeSlot" AS slot/);
    assert.match(source, /NOT EXISTS \(/);
    assert.match(source, /doctor\."bookingPausedFrom" < slot\."endAt"/);
    assert.match(source, /doctor\."bookingPausedUntil" > slot\."startAt"/);
  });
});
