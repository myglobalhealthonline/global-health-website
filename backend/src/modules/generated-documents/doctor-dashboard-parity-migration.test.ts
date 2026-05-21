import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

/**
 * Structural / safety test for the doctor-dashboard parity migration.
 * Doesn't touch the database — just parses the raw SQL and asserts:
 *   1. No destructive ops slipped in (DROP COLUMN, DROP TYPE,
 *      DROP TABLE, DROP CONSTRAINT).
 *   2. New columns the codebase relies on are present.
 *   3. Enum adds use IF NOT EXISTS so retries are safe.
 *   4. New FKs use ON DELETE SET NULL.
 */

const MIGRATION_SQL_PATH = path.resolve(
  __dirname,
  "../../../prisma/migrations/20260522010000_doctor_dashboard_parity_phase_1/migration.sql",
);

function readMigration(): string {
  return readFileSync(MIGRATION_SQL_PATH, "utf8");
}

/** Drop SQL comments so structural checks don't trip on prose. */
function stripSqlComments(input: string): string {
  return input.replace(/^\s*--.*$/gm, "");
}

function squashWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

describe("doctor dashboard parity migration SQL", () => {
  const rawWithComments = readMigration();
  const rawNoComments = stripSqlComments(rawWithComments);
  const upper = rawNoComments.toUpperCase();
  const squashed = squashWhitespace(rawNoComments).toUpperCase();

  it("is purely additive — no DROP COLUMN", () => {
    assert.equal(upper.includes("DROP COLUMN"), false);
  });

  it("does not DROP TYPE", () => {
    assert.equal(upper.includes("DROP TYPE"), false);
  });

  it("does not DROP TABLE", () => {
    assert.equal(upper.includes("DROP TABLE"), false);
  });

  it("does not DROP CONSTRAINT", () => {
    assert.equal(upper.includes("DROP CONSTRAINT"), false);
  });

  it("adds new AuditAction enum values with IF NOT EXISTS", () => {
    const auditValues = ["LOGIN", "LOGOUT", "LOGIN_FAILED", "PATIENT_ALERT_UPDATED"];
    for (const value of auditValues) {
      const needle = "ADD VALUE IF NOT EXISTS '" + value + "'";
      assert.ok(
        rawNoComments.includes(needle),
        "Expected idempotent enum add for " + value,
      );
    }
  });

  it("adds OTHER to GeneratedDocumentType with IF NOT EXISTS", () => {
    assert.ok(rawNoComments.includes("ADD VALUE IF NOT EXISTS 'OTHER'"));
  });

  it("adds canCreateManualAppointments to Doctor with default false", () => {
    assert.ok(
      squashed.includes(
        'ALTER TABLE "DOCTOR" ADD COLUMN "CANCREATEMANUALAPPOINTMENTS" BOOLEAN NOT NULL DEFAULT FALSE',
      ),
      "Expected Doctor.canCreateManualAppointments column with default false",
    );
  });

  it("adds chamberEntity, registrationNumber, isVerified, verifiedAt to DoctorCountry", () => {
    const cols = ['"chamberEntity"', '"registrationNumber"', '"isVerified"', '"verifiedAt"'];
    for (const col of cols) {
      assert.ok(
        rawNoComments.includes(col),
        "Expected new DoctorCountry column " + col,
      );
    }
  });

  it("adds identity, address, alert, plan columns to PatientProfile", () => {
    const cols = [
      '"nationalIdNumber"',
      '"taxIdNumber"',
      '"passportNumber"',
      '"addressLine1"',
      '"addressLine2"',
      '"addressCity"',
      '"addressPostalCode"',
      '"addressCountryCode"',
      '"preferredPharmacy"',
      '"statusAlert"',
      '"clinicAlert"',
      '"pricingPlanId"',
    ];
    for (const col of cols) {
      assert.ok(
        rawNoComments.includes(col),
        "Expected new PatientProfile column " + col,
      );
    }
  });

  it("wires PatientProfile.pricingPlanId as ON DELETE SET NULL", () => {
    assert.ok(
      squashed.includes("PATIENTPROFILE_PRICINGPLANID_FKEY"),
      "FK constraint name should appear",
    );
    assert.ok(
      squashed.includes('FOREIGN KEY ("PRICINGPLANID") REFERENCES "PRICINGPLAN"'),
      "FK should reference PricingPlan(id)",
    );
    assert.ok(
      squashed.includes('REFERENCES "PRICINGPLAN"("ID") ON DELETE SET NULL'),
      "FK should ON DELETE SET NULL",
    );
  });

  it("adds clinicId + locationAddress to Appointment with SET NULL FK", () => {
    assert.ok(rawNoComments.includes('"clinicId"'));
    assert.ok(rawNoComments.includes('"locationAddress"'));
    assert.ok(
      squashed.includes("APPOINTMENT_CLINICID_FKEY"),
      "Appointment.clinicId FK should be named",
    );
    assert.ok(
      squashed.includes('REFERENCES "CLINIC"("ID") ON DELETE SET NULL'),
      "Clinic FK should ON DELETE SET NULL",
    );
  });

  it("adds requireNationalId to BookingSetting with default false", () => {
    assert.ok(
      squashed.includes(
        'ALTER TABLE "BOOKINGSETTING" ADD COLUMN "REQUIRENATIONALID" BOOLEAN NOT NULL DEFAULT FALSE',
      ),
      "Expected BookingSetting.requireNationalId column with default false",
    );
  });
});
