-- Cross-jurisdiction prescription request ("Request prescription outside
-- jurisdiction"). A treating doctor (Doctor A) asks an admin-authorised doctor
-- in another country (Doctor B) to issue a prescription asynchronously.
--
-- Adds:
--   ServiceKind.ASYNC_PRESCRIPTION          → inner per-country fee/payout service.
--   NotificationType.CROSS_BORDER_RX_*      → Doctor B / Doctor A / patient bells.
--   Doctor.canRequestCrossJurisdictionRx    → per-doctor gate for the requester.
--   CrossBorderRxStatus enum                → the request lifecycle.
--   CrossBorderPrescriptionRequest          → the workflow state row.
--
-- Idempotent: this DB carries drift, so the migration must be safe to re-apply
-- via `prisma migrate deploy` (never `migrate dev`).

-- ─── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "CrossBorderRxStatus" AS ENUM (
    'PENDING_PAYMENT',
    'AWAITING_DOCTOR',
    'MORE_INFO',
    'ACCEPTED',
    'REFUSED',
    'UPGRADED',
    'EXPIRED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Postgres 12+ permits ADD VALUE inside a transaction as long as the new value
-- is not USED in the same transaction. Nothing below writes these values, so
-- this is safe under `migrate deploy`'s per-file transaction.
ALTER TYPE "ServiceKind" ADD VALUE IF NOT EXISTS 'ASYNC_PRESCRIPTION';

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CROSS_BORDER_RX_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CROSS_BORDER_RX_UPDATED';

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CROSS_BORDER_RX_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CROSS_BORDER_RX_DECIDED';

-- ─── Doctor gate ──────────────────────────────────────────────────────────────

ALTER TABLE "Doctor"
  ADD COLUMN IF NOT EXISTS "canRequestCrossJurisdictionRx" BOOLEAN NOT NULL DEFAULT false;

-- ─── Workflow table ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "CrossBorderPrescriptionRequest" (
  "id"                   TEXT NOT NULL,
  "sourceAppointmentId"  TEXT NOT NULL,
  "sourceDoctorId"       TEXT NOT NULL,
  "patientEmail"         TEXT NOT NULL,
  "patientFullName"      TEXT NOT NULL,
  "targetCountryCode"    TEXT NOT NULL,
  "targetServiceId"      TEXT NOT NULL,
  "targetDoctorId"       TEXT NOT NULL,
  "clinicalSummary"      TEXT NOT NULL,
  "orderId"              TEXT,
  "asyncAppointmentId"   TEXT,
  "upgradeAppointmentId" TEXT,
  "status"               "CrossBorderRxStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
  "paidAt"               TIMESTAMP(3),
  "decidedAt"            TIMESTAMP(3),
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrossBorderPrescriptionRequest_pkey" PRIMARY KEY ("id")
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS "CrossBorderPrescriptionRequest_asyncAppointmentId_key"
  ON "CrossBorderPrescriptionRequest" ("asyncAppointmentId");

CREATE UNIQUE INDEX IF NOT EXISTS "CrossBorderPrescriptionRequest_upgradeAppointmentId_key"
  ON "CrossBorderPrescriptionRequest" ("upgradeAppointmentId");

CREATE INDEX IF NOT EXISTS "CrossBorderPrescriptionRequest_targetDoctorId_status_idx"
  ON "CrossBorderPrescriptionRequest" ("targetDoctorId", "status");

CREATE INDEX IF NOT EXISTS "CrossBorderPrescriptionRequest_sourceDoctorId_status_idx"
  ON "CrossBorderPrescriptionRequest" ("sourceDoctorId", "status");

CREATE INDEX IF NOT EXISTS "CrossBorderPrescriptionRequest_sourceAppointmentId_idx"
  ON "CrossBorderPrescriptionRequest" ("sourceAppointmentId");

CREATE INDEX IF NOT EXISTS "CrossBorderPrescriptionRequest_orderId_idx"
  ON "CrossBorderPrescriptionRequest" ("orderId");

CREATE INDEX IF NOT EXISTS "CrossBorderPrescriptionRequest_status_createdAt_idx"
  ON "CrossBorderPrescriptionRequest" ("status", "createdAt");
