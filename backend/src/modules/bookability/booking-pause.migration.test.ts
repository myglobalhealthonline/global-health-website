import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const migration = readFileSync(
  join(
    __dirname,
    "../../../prisma/migrations/20260829120000_doctor_service_booking_pauses/migration.sql",
  ),
  "utf8",
);

describe("doctor/service booking-pause migration", () => {
  it("adds pause fields to both lifecycle entities", () => {
    for (const table of ["Doctor", "Service"]) {
      assert.match(migration, new RegExp(`ALTER TABLE "${table}"`));
    }
    for (const column of ["bookingPausedFrom", "bookingPausedUntil", "bookingPauseReason"]) {
      assert.match(migration, new RegExp(`"${column}"`));
    }
  });

  it("enforces valid half-open ranges and creates lookup indexes", () => {
    assert.match(migration, /bookingPausedFrom" < "bookingPausedUntil/);
    assert.match(migration, /Doctor_bookingPausedFrom_bookingPausedUntil_idx/);
    assert.match(migration, /Service_bookingPausedFrom_bookingPausedUntil_idx/);
  });

  it("adds explicit audit actions for pause set and clear", () => {
    assert.match(migration, /BOOKING_PAUSE_SET/);
    assert.match(migration, /BOOKING_PAUSE_CLEARED/);
  });
});
