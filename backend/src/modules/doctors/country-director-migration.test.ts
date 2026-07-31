import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

/**
 * Structural / safety test for the country-director migration. Doesn't touch
 * the database — parses the raw SQL and asserts it is additive and safe to
 * re-apply, since this DB carries drift and is deployed with `migrate deploy`
 * (never `migrate dev`).
 */

const MIGRATION_SQL_PATH = path.resolve(
  __dirname,
  "../../../prisma/migrations/20260731000000_country_director_access/migration.sql",
);

/** Drop SQL comments so structural checks don't trip on prose. */
function stripSqlComments(input: string): string {
  return input.replace(/^\s*--.*$/gm, "");
}

function squashWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

describe("country director migration SQL", () => {
  const raw = stripSqlComments(readFileSync(MIGRATION_SQL_PATH, "utf8"));
  const upper = raw.toUpperCase();
  const squashed = squashWhitespace(raw).toUpperCase();

  it("is purely additive", () => {
    for (const destructive of [
      "DROP COLUMN",
      "DROP TABLE",
      "DROP TYPE",
      "DROP CONSTRAINT",
      "DROP INDEX",
    ]) {
      assert.equal(upper.includes(destructive), false, `unexpected ${destructive}`);
    }
  });

  it("adds Doctor.isCountryDirector defaulting to false", () => {
    assert.ok(
      squashed.includes(
        'ALTER TABLE "DOCTOR" ADD COLUMN IF NOT EXISTS "ISCOUNTRYDIRECTOR" BOOLEAN NOT NULL DEFAULT FALSE',
      ),
      "Expected idempotent Doctor.isCountryDirector column, default false",
    );
  });

  it("adds DoctorCountry.directorAccess defaulting to false", () => {
    assert.ok(
      squashed.includes(
        'ALTER TABLE "DOCTORCOUNTRY" ADD COLUMN IF NOT EXISTS "DIRECTORACCESS" BOOLEAN NOT NULL DEFAULT FALSE',
      ),
      "Expected idempotent DoctorCountry.directorAccess column, default false",
    );
  });

  it("defaults both grants to OFF so no existing doctor gains access", () => {
    // The whole point of DEFAULT false: applying this migration must not hand
    // country-wide visibility to anyone until an admin explicitly grants it.
    assert.equal((squashed.match(/DEFAULT FALSE/g) ?? []).length, 2);
    assert.equal(squashed.includes("DEFAULT TRUE"), false);
  });

  it("adds the AuditAction value idempotently", () => {
    assert.ok(
      raw.includes("ADD VALUE IF NOT EXISTS 'COUNTRY_CONSULTATIONS_VIEWED'"),
      "Expected idempotent AuditAction enum add",
    );
  });

  it("creates the lookup index idempotently", () => {
    assert.ok(squashed.includes("CREATE INDEX IF NOT EXISTS"));
    assert.ok(squashed.includes('ON "DOCTORCOUNTRY" ("COUNTRYID", "DIRECTORACCESS")'));
  });

  it("is safe to re-apply — every statement is guarded", () => {
    // One guard per DDL statement: 2 ALTER TABLE, 1 ALTER TYPE, 1 CREATE INDEX.
    assert.equal((squashed.match(/IF NOT EXISTS/g) ?? []).length, 4);
  });
});
