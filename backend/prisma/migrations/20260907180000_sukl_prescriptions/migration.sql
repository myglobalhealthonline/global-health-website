-- SÚKL eRecept prescriptions, and the prescriber fields the payload requires.
--
-- Hand-written and fully idempotent: this repo deploys with `migrate deploy`
-- against a live database that carries drift, so every statement must be safe
-- to re-run and must never assume the object is absent.

-- CreateEnum (guarded — CREATE TYPE has no IF NOT EXISTS in Postgres)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SuklPrescriptionStatus') THEN
        CREATE TYPE "SuklPrescriptionStatus" AS ENUM ('PENDING', 'ISSUED', 'CANCELLED', 'FAILED');
    END IF;
END $$;

-- AlterTable: prescriber fields SÚKL require in Predepisujici
ALTER TABLE "SuklDoctorIdentity" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "SuklDoctorIdentity" ADD COLUMN IF NOT EXISTS "icp" TEXT;
ALTER TABLE "SuklDoctorIdentity" ADD COLUMN IF NOT EXISTS "pzs" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "SuklPrescription" (
    "id" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "appointmentId" TEXT,
    "doctorUserId" TEXT NOT NULL,
    "patientUserId" TEXT,
    "submissionId" TEXT NOT NULL,
    "documentId" TEXT,
    "status" "SuklPrescriptionStatus" NOT NULL DEFAULT 'PENDING',
    "suklState" TEXT,
    "issuedAt" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuklPrescription_pkey" PRIMARY KEY ("id")
);

-- The submission id is the authorisation id for a later amendment, so a
-- duplicate would make two prescriptions indistinguishable to SÚKL.
CREATE UNIQUE INDEX IF NOT EXISTS "SuklPrescription_environment_submissionId_key"
    ON "SuklPrescription"("environment", "submissionId");
CREATE UNIQUE INDEX IF NOT EXISTS "SuklPrescription_environment_documentId_key"
    ON "SuklPrescription"("environment", "documentId");
CREATE INDEX IF NOT EXISTS "SuklPrescription_doctorUserId_createdAt_idx"
    ON "SuklPrescription"("doctorUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "SuklPrescription_appointmentId_idx"
    ON "SuklPrescription"("appointmentId");
CREATE INDEX IF NOT EXISTS "SuklPrescription_status_idx"
    ON "SuklPrescription"("status");
