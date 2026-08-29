import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { prisma } from "../../db/prisma.js";

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

  it("is applied to the test database with columns, checks, indexes, and audit values", async (t) => {
    let columns: Array<{ table_name: string; column_name: string }>;
    try {
      columns = await prisma.$queryRaw`
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('Doctor', 'Service')
          AND column_name IN ('bookingPausedFrom', 'bookingPausedUntil', 'bookingPauseReason')
      `;
    } catch {
      return t.skip("test PostgreSQL is offline");
    }

    assert.equal(columns.length, 6, "all booking-pause columns are deployed");

    const checks = await prisma.$queryRaw<Array<{ constraint_name: string }>>`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND constraint_type = 'CHECK'
        AND constraint_name IN ('Doctor_booking_pause_valid', 'Service_booking_pause_valid')
    `;
    assert.deepEqual(
      new Set(checks.map((row) => row.constraint_name)),
      new Set(["Doctor_booking_pause_valid", "Service_booking_pause_valid"]),
    );

    const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname IN (
          'Doctor_bookingPausedFrom_bookingPausedUntil_idx',
          'Service_bookingPausedFrom_bookingPausedUntil_idx'
        )
    `;
    assert.equal(indexes.length, 2, "both pause lookup indexes are deployed");

    const auditValues = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
      SELECT enumlabel
      FROM pg_enum
      JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
      WHERE pg_type.typname = 'AuditAction'
        AND enumlabel IN ('BOOKING_PAUSE_SET', 'BOOKING_PAUSE_CLEARED')
    `;
    assert.equal(auditValues.length, 2, "pause audit actions are deployed");
  });
});
