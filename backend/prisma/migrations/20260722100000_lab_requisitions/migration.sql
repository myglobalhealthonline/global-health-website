-- External laboratory requisitions (Synlab CZ / WebLIMS 2).
--
-- Adds:
--   LabRequisitionStatus enum   → the requisition lifecycle.
--   LabRequisition              → one "doctor prescribed exams" → "results filed" case.
--   LabRequisitionItem          → the individual exams, and whether the patient agreed.
--   LabResultFile               → an inbound result file (ingest job not built yet).
--   CartItemKind.LAB_EXAM       → the self-pay order line.
--   OrderItem.testCenterExamId  → which catalogue entry that line was priced from.
--   AuditAction LAB_*           → the audit trail for the handoff to the lab.
--
-- Their Remote API is a form-handoff, not a booking API: our staff creates the
-- requisition in WebLIMS through a pre-filled form, and results come back on a
-- separate channel. See docs/synlab/synlab-integration-questions.md.
--
-- Idempotent: this DB carries drift, so the migration must be safe to re-apply
-- via `prisma migrate deploy`.

-- ─── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "LabRequisitionStatus" AS ENUM (
    'PRESCRIBED',
    'PATIENT_CONFIRMED',
    'AWAITING_PAYMENT',
    'READY_TO_SEND',
    'SENT_TO_LAB',
    'SAMPLE_COLLECTED',
    'RESULT_RECEIVED',
    'CLOSED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Postgres 12+ permits ADD VALUE inside a transaction as long as the new value
-- is not USED in the same transaction. Nothing below writes these values, so
-- this is safe under `migrate deploy`'s per-file transaction.
ALTER TYPE "CartItemKind" ADD VALUE IF NOT EXISTS 'LAB_EXAM';

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LAB_REQUISITION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LAB_REQUISITION_ITEMS_CONFIRMED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LAB_REQUISITION_HANDED_OFF';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LAB_REQUISITION_METHODS_FETCHED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LAB_REQUISITION_STATUS_CHANGED';

-- ─── Tables ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "LabRequisition" (
  "id"                    TEXT NOT NULL,
  "countryCode"           TEXT NOT NULL,
  "provider"              TEXT NOT NULL DEFAULT 'SYNLAB_WEBLIMS',
  "patientProfileId"      TEXT NOT NULL,
  "appointmentId"         TEXT,
  "generatedDocumentId"   TEXT,
  "doctorId"              TEXT,
  "testCenterId"          TEXT,
  "orderId"               TEXT,
  "status"                "LabRequisitionStatus" NOT NULL DEFAULT 'PRESCRIBED',
  "createdByUserId"       TEXT,
  "adminNotes"            TEXT,
  "formToken"             TEXT,
  "formTokenExpiresAt"    TIMESTAMP(3),
  "formOpenedAt"          TIMESTAMP(3),
  "methodsText"           TEXT,
  "methodsFetchedAt"      TIMESTAMP(3),
  "externalRequisitionNo" TEXT,
  "patientIdBlindIndex"   TEXT,
  "collectionDate"        TIMESTAMP(3),
  "priority"              TEXT NOT NULL DEFAULT 'Rutina',
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LabRequisition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LabRequisitionItem" (
  "id"              TEXT NOT NULL,
  "requisitionId"   TEXT NOT NULL,
  "examTypeId"      TEXT,
  "examResultId"    TEXT,
  "label"           TEXT NOT NULL,
  "patientAccepted" BOOLEAN,
  "unitPriceCents"  INTEGER,
  "currencyCode"    TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LabRequisitionItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LabResultFile" (
  "id"                    TEXT NOT NULL,
  "provider"              TEXT NOT NULL DEFAULT 'SYNLAB_WEBLIMS',
  "requisitionId"         TEXT,
  "patientProfileId"      TEXT,
  "sourcePath"            TEXT NOT NULL,
  "fileKey"               TEXT NOT NULL,
  "mimetype"              TEXT NOT NULL,
  "byteSize"              INTEGER NOT NULL,
  "externalRequisitionNo" TEXT,
  "patientIdBlindIndex"   TEXT,
  "collectedAt"           TIMESTAMP(3),
  "reportedAt"            TIMESTAMP(3),
  "parsed"                JSONB,
  "matchStatus"           TEXT NOT NULL DEFAULT 'UNMATCHED',
  "matchNotes"            TEXT,
  "medicalDocumentId"     TEXT,
  "receivedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LabResultFile_pkey" PRIMARY KEY ("id")
);

-- ─── Order line cross-reference ───────────────────────────────────────────────

ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "testCenterExamId" TEXT;

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "LabRequisition_countryCode_status_createdAt_idx"
  ON "LabRequisition" ("countryCode", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "LabRequisition_patientProfileId_createdAt_idx"
  ON "LabRequisition" ("patientProfileId", "createdAt");

-- Result matching walks in on the blind index, so it must be indexed even
-- though the ingest job is not built yet.
CREATE INDEX IF NOT EXISTS "LabRequisition_patientIdBlindIndex_idx"
  ON "LabRequisition" ("patientIdBlindIndex");

CREATE INDEX IF NOT EXISTS "LabRequisition_appointmentId_idx"
  ON "LabRequisition" ("appointmentId");

CREATE INDEX IF NOT EXISTS "LabRequisition_orderId_idx"
  ON "LabRequisition" ("orderId");

CREATE INDEX IF NOT EXISTS "LabRequisitionItem_requisitionId_idx"
  ON "LabRequisitionItem" ("requisitionId");

CREATE INDEX IF NOT EXISTS "LabRequisitionItem_examTypeId_idx"
  ON "LabRequisitionItem" ("examTypeId");

-- The SFTP path is the idempotency key: re-running the poll must not import
-- the same result file twice.
CREATE UNIQUE INDEX IF NOT EXISTS "LabResultFile_sourcePath_key"
  ON "LabResultFile" ("sourcePath");

CREATE INDEX IF NOT EXISTS "LabResultFile_matchStatus_receivedAt_idx"
  ON "LabResultFile" ("matchStatus", "receivedAt");

CREATE INDEX IF NOT EXISTS "LabResultFile_requisitionId_idx"
  ON "LabResultFile" ("requisitionId");

CREATE INDEX IF NOT EXISTS "LabResultFile_patientIdBlindIndex_idx"
  ON "LabResultFile" ("patientIdBlindIndex");

-- ─── Foreign keys ─────────────────────────────────────────────────────────────
--
-- Only two relations are enforced. Appointment / order / doctor / exam-type ids
-- are deliberately plain columns: the requisition is a clinical and commercial
-- record that has to outlive the rows that spawned it.

DO $$ BEGIN
  ALTER TABLE "LabRequisition"
    ADD CONSTRAINT "LabRequisition_patientProfileId_fkey"
    FOREIGN KEY ("patientProfileId") REFERENCES "PatientProfile"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "LabRequisitionItem"
    ADD CONSTRAINT "LabRequisitionItem_requisitionId_fkey"
    FOREIGN KEY ("requisitionId") REFERENCES "LabRequisition"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "LabResultFile"
    ADD CONSTRAINT "LabResultFile_requisitionId_fkey"
    FOREIGN KEY ("requisitionId") REFERENCES "LabRequisition"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
