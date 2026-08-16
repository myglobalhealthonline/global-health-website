-- Ireland controlled-medication identity verification.
--
-- Hand-written and fully idempotent: this repo deploys with `migrate deploy`
-- against a live database that carries drift, so every statement here has to be
-- safe to re-run and must never assume the object is absent.

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'IDENTITY_VERIFICATION_SELFIE_SUBMITTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'IDENTITY_VERIFICATION_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'IDENTITY_VERIFICATION_REVIEWED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'IDENTITY_VERIFICATION_LINKED_TO_PRESCRIPTION';

-- AlterTable: PatientProfile — selfie + doctor-raised verification request
ALTER TABLE "PatientProfile" ADD COLUMN IF NOT EXISTS "selfieImageKey" TEXT;
ALTER TABLE "PatientProfile" ADD COLUMN IF NOT EXISTS "selfieUploadedAt" TIMESTAMP(3);
ALTER TABLE "PatientProfile" ADD COLUMN IF NOT EXISTS "idVerifyRequestedAt" TIMESTAMP(3);
ALTER TABLE "PatientProfile" ADD COLUMN IF NOT EXISTS "idVerifyRequestedBy" TEXT;

-- CreateTable: append-only verification cycle log
CREATE TABLE IF NOT EXISTS "IdentityVerificationEvent" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "patientProfileId" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "method" TEXT NOT NULL,
    "idDocumentKeySnapshot" TEXT,
    "selfieImageKeySnapshot" TEXT,
    "faceMatchScore" DOUBLE PRECISION,
    "faceMatchProvider" TEXT,
    "faceMatchRawResult" JSONB,
    "faceMatchRanAt" TIMESTAMP(3),
    "requestedByDoctorId" TEXT,
    "requestedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "reviewedByRole" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdentityVerificationEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "IdentityVerificationEvent_referenceId_key"
    ON "IdentityVerificationEvent"("referenceId");
CREATE INDEX IF NOT EXISTS "IdentityVerificationEvent_patientProfileId_createdAt_idx"
    ON "IdentityVerificationEvent"("patientProfileId", "createdAt");
CREATE INDEX IF NOT EXISTS "IdentityVerificationEvent_status_idx"
    ON "IdentityVerificationEvent"("status");

-- AlterTable: GeneratedDocument — pin an issued prescription to the exact
-- verification cycle that backed it (null = the document claims nothing).
ALTER TABLE "GeneratedDocument" ADD COLUMN IF NOT EXISTS "idVerifyEventId" TEXT;
ALTER TABLE "GeneratedDocument" ADD COLUMN IF NOT EXISTS "idVerifiedAt" TIMESTAMP(3);

-- AddForeignKey (guarded — ADD CONSTRAINT has no IF NOT EXISTS in Postgres)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'IdentityVerificationEvent_patientProfileId_fkey'
    ) THEN
        ALTER TABLE "IdentityVerificationEvent"
            ADD CONSTRAINT "IdentityVerificationEvent_patientProfileId_fkey"
            FOREIGN KEY ("patientProfileId") REFERENCES "PatientProfile"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'GeneratedDocument_idVerifyEventId_fkey'
    ) THEN
        ALTER TABLE "GeneratedDocument"
            ADD CONSTRAINT "GeneratedDocument_idVerifyEventId_fkey"
            FOREIGN KEY ("idVerifyEventId") REFERENCES "IdentityVerificationEvent"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
