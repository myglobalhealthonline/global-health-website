import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  AlertRemovalRequiresNoteError,
  normalizeAlert,
  removePatientAlert,
} from "./patient-alert-log.service.js";

const here = dirname(fileURLToPath(import.meta.url));
const migrationSql = readFileSync(
  join(here, "../../../prisma/migrations/20260819120000_patient_alert_log/migration.sql"),
  "utf8",
);

describe("patient alert log — removal note", () => {
  it("treats empty and whitespace-only alerts as no alert", () => {
    assert.equal(normalizeAlert(null), null);
    assert.equal(normalizeAlert(""), null);
    assert.equal(normalizeAlert("   "), null);
    assert.equal(normalizeAlert("  Penicillin allergy "), "Penicillin allergy");
  });

  it("rejects a removal with a blank or too-short note before touching the DB", async () => {
    for (const note of ["", "   ", "x", "ab"]) {
      await assert.rejects(
        () =>
          removePatientAlert({
            email: "patient@example.com",
            alertType: "STATUS",
            note,
            actor: { userId: null, role: "DOCTOR" },
          }),
        AlertRemovalRequiresNoteError,
      );
    }
  });
});

describe("patient alert log migration SQL", () => {
  it("creates the table, both enums, the index and the cascade FK", () => {
    for (const fragment of [
      '"PatientAlertType" AS ENUM',
      '"PatientAlertAction" AS ENUM',
      'CREATE TABLE IF NOT EXISTS "PatientAlertLog"',
      'CREATE INDEX IF NOT EXISTS "PatientAlertLog_patientProfileId_createdAt_idx"',
      'REFERENCES "PatientProfile"("id")',
      "ON DELETE CASCADE",
    ]) {
      assert.ok(migrationSql.includes(fragment), `missing: ${fragment}`);
    }
  });

  it("is re-runnable — every statement is guarded", () => {
    // The live DB has drifted from the migration history, so this is applied
    // with `migrate deploy` and may meet objects that already exist.
    assert.ok(migrationSql.includes("EXCEPTION WHEN duplicate_object THEN NULL"));
    assert.ok(!/CREATE TABLE (?!IF NOT EXISTS)/.test(migrationSql));
    assert.ok(!/CREATE INDEX (?!IF NOT EXISTS)/.test(migrationSql));
  });
});
