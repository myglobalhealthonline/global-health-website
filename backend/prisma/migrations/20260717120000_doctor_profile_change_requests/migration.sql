-- Doctor-initiated edits to admin-locked profile fields (full name,
-- qualifications, per-market bio + registration, profile photo) park here until
-- an admin approves them. The live profile keeps serving the public site in the
-- meantime; approval copies the proposal onto Doctor / DoctorCountry / Asset.
--
-- Idempotent DDL: this database carries drift, so every statement must be safe
-- to re-run under `prisma migrate deploy`.

-- AlterEnum: audit actions for the request lifecycle. Safe inside the migration
-- transaction on PG12+ because nothing below uses the new values.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DOCTOR_PROFILE_CHANGE_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DOCTOR_PROFILE_CHANGE_CANCELLED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DOCTOR_PROFILE_CHANGE_REVIEWED';

-- CreateTable
CREATE TABLE IF NOT EXISTS "DoctorProfileChangeRequest" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "countryId" TEXT,
    "field" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "proposedValue" JSONB NOT NULL,
    "previousValue" JSONB,
    "doctorNote" TEXT,
    "reviewNote" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorProfileChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DoctorProfileChangeRequest_doctorId_status_idx"
  ON "DoctorProfileChangeRequest"("doctorId", "status");

CREATE INDEX IF NOT EXISTS "DoctorProfileChangeRequest_status_createdAt_idx"
  ON "DoctorProfileChangeRequest"("status", "createdAt");

CREATE INDEX IF NOT EXISTS "DoctorProfileChangeRequest_countryId_status_idx"
  ON "DoctorProfileChangeRequest"("countryId", "status");

-- CreateIndex: at most one *pending* request per doctor + field + market.
-- Partial uniques can't be expressed in schema.prisma, so this exists only
-- here. The service layer supersedes an existing pending row rather than
-- relying on the P2002 this raises — the index is the backstop for a
-- concurrent double-submit.
--
-- COALESCE is what makes the global fields (countryId IS NULL — fullName,
-- qualifications, photo) covered at all: a plain multi-column unique treats
-- every NULL as distinct, so it would happily accept unlimited duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS "DoctorProfileChangeRequest_pending_key"
  ON "DoctorProfileChangeRequest"("doctorId", "field", COALESCE("countryId", ''))
  WHERE "status" = 'pending';

-- AddForeignKey
ALTER TABLE "DoctorProfileChangeRequest"
  DROP CONSTRAINT IF EXISTS "DoctorProfileChangeRequest_doctorId_fkey";
ALTER TABLE "DoctorProfileChangeRequest"
  ADD CONSTRAINT "DoctorProfileChangeRequest_doctorId_fkey"
  FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DoctorProfileChangeRequest"
  DROP CONSTRAINT IF EXISTS "DoctorProfileChangeRequest_countryId_fkey";
ALTER TABLE "DoctorProfileChangeRequest"
  ADD CONSTRAINT "DoctorProfileChangeRequest_countryId_fkey"
  FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DoctorProfileChangeRequest"
  DROP CONSTRAINT IF EXISTS "DoctorProfileChangeRequest_reviewedByUserId_fkey";
ALTER TABLE "DoctorProfileChangeRequest"
  ADD CONSTRAINT "DoctorProfileChangeRequest_reviewedByUserId_fkey"
  FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
