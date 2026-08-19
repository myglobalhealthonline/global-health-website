-- Chart-visible history for the doctor-only alert banners
-- (PatientProfile.statusAlert / clinicAlert). Removing an alert now requires a
-- note, and that note lands here rather than in the audit log.
-- Idempotent DDL: this DB is applied with `prisma migrate deploy` against a
-- schema that has drifted from the migration history, so every statement has
-- to tolerate being re-run.

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "PatientAlertType" AS ENUM ('STATUS', 'CLINIC');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PatientAlertAction" AS ENUM ('SET', 'UPDATED', 'REMOVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PatientAlertLog" (
  "id"               TEXT NOT NULL,
  "patientProfileId" TEXT NOT NULL,
  "alertType"        "PatientAlertType" NOT NULL,
  "action"           "PatientAlertAction" NOT NULL,
  "previousValue"    TEXT,
  "newValue"         TEXT,
  "note"             TEXT,
  "actorUserId"      TEXT,
  "actorRole"        TEXT NOT NULL,
  "actorName"        TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PatientAlertLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PatientAlertLog_patientProfileId_createdAt_idx"
  ON "PatientAlertLog"("patientProfileId", "createdAt");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "PatientAlertLog"
    ADD CONSTRAINT "PatientAlertLog_patientProfileId_fkey"
    FOREIGN KEY ("patientProfileId") REFERENCES "PatientProfile"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
