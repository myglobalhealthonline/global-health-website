-- Legacy-migration id spine: lets the doctor-dashboard (Mongo) import upsert
-- idempotently into the existing tables and record every unresolved reference.
-- Additive + nullable only -> safe to re-run against the live Railway DB
-- (see CLAUDE.md / db-migration-workflow — `migrate deploy`, never `migrate dev`).
--
--   * 1:1 models get "legacyMongoId" TEXT UNIQUE (multiple NULLs allowed by PG,
--     so existing native rows are unaffected; the loader upserts on this key).
--   * PatientProfile gets ARRAY columns instead: one patient can exist in
--     several market collections and dedups to ONE row keyed by email, so it
--     must hold many source _ids.
--   * "MigrationUnresolved" captures anything that could not be resolved.

-- AlterTable: 1:1 legacy id + its unique index
ALTER TABLE "Doctor"                  ADD COLUMN IF NOT EXISTS "legacyMongoId" TEXT;
ALTER TABLE "Appointment"             ADD COLUMN IF NOT EXISTS "legacyMongoId" TEXT;
ALTER TABLE "MedicalDocument"         ADD COLUMN IF NOT EXISTS "legacyMongoId" TEXT;
ALTER TABLE "MedicalNote"             ADD COLUMN IF NOT EXISTS "legacyMongoId" TEXT;
ALTER TABLE "BrazilConsentSubmission" ADD COLUMN IF NOT EXISTS "legacyMongoId" TEXT;
ALTER TABLE "ReviewInvite"            ADD COLUMN IF NOT EXISTS "legacyMongoId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Doctor_legacyMongoId_key"                  ON "Doctor"("legacyMongoId");
CREATE UNIQUE INDEX IF NOT EXISTS "Appointment_legacyMongoId_key"            ON "Appointment"("legacyMongoId");
CREATE UNIQUE INDEX IF NOT EXISTS "MedicalDocument_legacyMongoId_key"        ON "MedicalDocument"("legacyMongoId");
CREATE UNIQUE INDEX IF NOT EXISTS "MedicalNote_legacyMongoId_key"            ON "MedicalNote"("legacyMongoId");
CREATE UNIQUE INDEX IF NOT EXISTS "BrazilConsentSubmission_legacyMongoId_key" ON "BrazilConsentSubmission"("legacyMongoId");
CREATE UNIQUE INDEX IF NOT EXISTS "ReviewInvite_legacyMongoId_key"           ON "ReviewInvite"("legacyMongoId");

-- AlterTable: PatientProfile multi-source legacy ids (email is the dedup key)
ALTER TABLE "PatientProfile" ADD COLUMN IF NOT EXISTS "legacyMongoIds"      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "PatientProfile" ADD COLUMN IF NOT EXISTS "legacySourceMarkets" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "PatientProfile" ADD COLUMN IF NOT EXISTS "legacyExtra"         JSONB;
ALTER TABLE "Appointment"    ADD COLUMN IF NOT EXISTS "legacyExtra"         JSONB;
-- GIN index so `legacyMongoIds @> ARRAY[$id]` (Prisma `has`) is index-backed
-- when Phase 2 resolves an appointment's legacy patientId back to a profile.
CREATE INDEX IF NOT EXISTS "PatientProfile_legacyMongoIds_idx" ON "PatientProfile" USING GIN ("legacyMongoIds");

-- CreateTable: unresolved-reference audit trail
CREATE TABLE IF NOT EXISTS "MigrationUnresolved" (
    "id"          TEXT NOT NULL,
    "stage"       TEXT NOT NULL,
    "sourceColl"  TEXT NOT NULL,
    "legacyId"    TEXT,
    "targetModel" TEXT,
    "columnName"  TEXT,
    "legacyValue" TEXT,
    "reason"      TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MigrationUnresolved_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MigrationUnresolved_stage_idx"                ON "MigrationUnresolved"("stage");
CREATE INDEX IF NOT EXISTS "MigrationUnresolved_sourceColl_legacyId_idx" ON "MigrationUnresolved"("sourceColl", "legacyId");
