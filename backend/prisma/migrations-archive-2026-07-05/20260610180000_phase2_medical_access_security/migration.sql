-- Phase 2: Medical Access & Security
-- Migration: 20260610180000_phase2_medical_access_security
--
-- NOTE: ALTER TYPE ... ADD VALUE cannot run inside a transaction block.
-- Each DO $$ ... END $$ block is intentionally outside any explicit
-- transaction so Postgres can commit the enum value before the DDL below uses it.

-- ─── 1. Add values to existing enums ─────────────────────────────────────────

DO $$ BEGIN
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'LOCAL_ADMIN';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'TWO_FACTOR_ENABLED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'TWO_FACTOR_DISABLED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'TWO_FACTOR_VERIFIED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'TWO_FACTOR_FAILED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ACCOUNT_LOCKED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CONSENT_UPDATED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MEDICAL_ACCESS_CONSENT_CHANGED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ID_VERIFICATION_SUBMITTED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ID_VERIFICATION_UPDATED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MEDICAL_ACCESS_REQUEST_CREATED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MEDICAL_ACCESS_REQUEST_APPROVED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MEDICAL_ACCESS_REQUEST_DENIED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MEDICAL_ACCESS_GRANT_EXPIRED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CONFIDENTIALITY_AGREEMENT_ACCEPTED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SECURITY_ALERT_CREATED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SECURITY_ALERT_RESOLVED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DATA_DELETION_REQUESTED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DATA_DELETION_REVIEWED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PATIENT_MERGED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PATIENT_ANONYMIZED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CONTACT_CHANGE_REQUESTED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CONTACT_CHANGE_CONFIRMED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2. Create new enum types ─────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "CountryAccessModel" AS ENUM ('CLINIC', 'PLATFORM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AdminScope" AS ENUM ('LOCAL', 'GLOBAL', 'SUPER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "MedicalAccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'EXPIRED', 'REVOKED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SecurityAlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SecurityAlertStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'FALSE_POSITIVE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DataDeletionStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'PARTIALLY_COMPLETED', 'COMPLETED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 3. Alter existing tables — add new columns ───────────────────────────────

-- Country
ALTER TABLE "Country"
  ADD COLUMN IF NOT EXISTS "accessModel" "CountryAccessModel" NOT NULL DEFAULT 'PLATFORM';

-- User
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "adminScope"            "AdminScope",
  ADD COLUMN IF NOT EXISTS "allowedCountryFolders" TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "twoFactorEnabled"      BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "twoFactorSecret"       TEXT,
  ADD COLUMN IF NOT EXISTS "twoFactorBackupCodes"  TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "twoFactorVerifiedAt"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "twoFactorEnabledAt"    TIMESTAMP(3);

-- PatientProfile
ALTER TABLE "PatientProfile"
  ADD COLUMN IF NOT EXISTS "originCountryCode"         TEXT,
  ADD COLUMN IF NOT EXISTS "countryFolderCode"         TEXT,
  ADD COLUMN IF NOT EXISTS "currentCountryCode"        TEXT,
  ADD COLUMN IF NOT EXISTS "medicalAccessConsentLevel" TEXT,
  ADD COLUMN IF NOT EXISTS "emailHash"                 TEXT,
  ADD COLUMN IF NOT EXISTS "phoneHash"                 TEXT,
  ADD COLUMN IF NOT EXISTS "nameDobHash"               TEXT,
  ADD COLUMN IF NOT EXISTS "idVerificationProvider"    TEXT,
  ADD COLUMN IF NOT EXISTS "idVerificationProviderRef" TEXT,
  ADD COLUMN IF NOT EXISTS "idVerificationConfidence"  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "idVerificationRawResult"   JSONB,
  ADD COLUMN IF NOT EXISTS "idVerificationWebhookAt"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "isMerged"                  BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "mergedIntoPatientId"       TEXT,
  ADD COLUMN IF NOT EXISTS "mergedAt"                  TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "mergedByAdminId"           TEXT,
  ADD COLUMN IF NOT EXISTS "anonymizedAt"              TIMESTAMP(3);

-- MedicalAccessLog
ALTER TABLE "MedicalAccessLog"
  ADD COLUMN IF NOT EXISTS "patientCountryFolder" TEXT,
  ADD COLUMN IF NOT EXISTS "actorCountry"         TEXT,
  ADD COLUMN IF NOT EXISTS "consentLevelUsed"     TEXT,
  ADD COLUMN IF NOT EXISTS "isAbnormal"           BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "abnormalReason"       TEXT,
  ADD COLUMN IF NOT EXISTS "loginSessionId"       TEXT;

-- AuditLog
ALTER TABLE "AuditLog"
  ADD COLUMN IF NOT EXISTS "userAgent"       TEXT,
  ADD COLUMN IF NOT EXISTS "countryDetected" TEXT,
  ADD COLUMN IF NOT EXISTS "loginSessionId"  TEXT;

-- ─── 4. Create new tables ─────────────────────────────────────────────────────

-- ConsentDocument
CREATE TABLE IF NOT EXISTS "ConsentDocument" (
  "id"            TEXT         NOT NULL,
  "consentKey"    TEXT         NOT NULL,
  "version"       TEXT         NOT NULL,
  "locale"        "LocaleCode" NOT NULL DEFAULT 'EN',
  "bodyText"      TEXT         NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isActive"      BOOLEAN      NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConsentDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ConsentDocument_consentKey_version_locale_key"
  ON "ConsentDocument"("consentKey", "version", "locale");

CREATE INDEX IF NOT EXISTS "ConsentDocument_consentKey_isActive_idx"
  ON "ConsentDocument"("consentKey", "isActive");

-- DoctorConfidentialityAgreement
CREATE TABLE IF NOT EXISTS "DoctorConfidentialityAgreement" (
  "id"               TEXT         NOT NULL,
  "doctorId"         TEXT         NOT NULL,
  "agreementVersion" TEXT         NOT NULL,
  "accepted"         BOOLEAN      NOT NULL DEFAULT false,
  "acceptedAt"       TIMESTAMP(3),
  "ipAddress"        TEXT,
  "userAgent"        TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DoctorConfidentialityAgreement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DoctorConfidentialityAgreement_doctorId_fkey"
    FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "DoctorConfidentialityAgreement_doctorId_accepted_idx"
  ON "DoctorConfidentialityAgreement"("doctorId", "accepted");

-- MedicalAccessRequest
CREATE TABLE IF NOT EXISTS "MedicalAccessRequest" (
  "id"                      TEXT                         NOT NULL,
  "patientProfileId"        TEXT                         NOT NULL,
  "globalHealthNumber"      TEXT,
  "requestingDoctorId"      TEXT,
  "requestingUserId"        TEXT,
  "requestingDoctorCountry" TEXT,
  "patientOriginCountry"    TEXT,
  "requestedAccessScope"    TEXT                         NOT NULL,
  "reason"                  TEXT                         NOT NULL,
  "status"                  "MedicalAccessRequestStatus" NOT NULL DEFAULT 'PENDING',
  "requestedAt"             TIMESTAMP(3)                 NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt"              TIMESTAMP(3),
  "deniedAt"                TIMESTAMP(3),
  "expiresAt"               TIMESTAMP(3),
  "patientResponseIp"       TEXT,
  "reviewedByUserId"        TEXT,
  "createdAt"               TIMESTAMP(3)                 NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"               TIMESTAMP(3)                 NOT NULL,
  CONSTRAINT "MedicalAccessRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicalAccessRequest_patientProfileId_fkey"
    FOREIGN KEY ("patientProfileId") REFERENCES "PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MedicalAccessRequest_reviewedByUserId_fkey"
    FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MedicalAccessRequest_patientProfileId_status_idx"
  ON "MedicalAccessRequest"("patientProfileId", "status");

CREATE INDEX IF NOT EXISTS "MedicalAccessRequest_requestingDoctorId_status_idx"
  ON "MedicalAccessRequest"("requestingDoctorId", "status");

-- MedicalAccessGrant
CREATE TABLE IF NOT EXISTS "MedicalAccessGrant" (
  "id"              TEXT         NOT NULL,
  "accessRequestId" TEXT         NOT NULL,
  "patientProfileId" TEXT        NOT NULL,
  "grantedToUserId" TEXT         NOT NULL,
  "grantedToRole"   TEXT         NOT NULL,
  "scope"           TEXT         NOT NULL,
  "expiresAt"       TIMESTAMP(3) NOT NULL,
  "revokedAt"       TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MedicalAccessGrant_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MedicalAccessGrant_accessRequestId_fkey"
    FOREIGN KEY ("accessRequestId") REFERENCES "MedicalAccessRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MedicalAccessGrant_patientProfileId_grantedToUserId_expiresAt_idx"
  ON "MedicalAccessGrant"("patientProfileId", "grantedToUserId", "expiresAt");

CREATE INDEX IF NOT EXISTS "MedicalAccessGrant_grantedToUserId_expiresAt_idx"
  ON "MedicalAccessGrant"("grantedToUserId", "expiresAt");

-- SecurityAlert
CREATE TABLE IF NOT EXISTS "SecurityAlert" (
  "id"                 TEXT                  NOT NULL,
  "severity"           "SecurityAlertSeverity" NOT NULL,
  "alertType"          TEXT                  NOT NULL,
  "patientId"          TEXT,
  "globalHealthNumber" TEXT,
  "actorId"            TEXT,
  "actorRole"          TEXT,
  "countryFolder"      TEXT,
  "description"        TEXT                  NOT NULL,
  "details"            JSONB,
  "dedupeKey"          TEXT,
  "status"             "SecurityAlertStatus" NOT NULL DEFAULT 'OPEN',
  "resolvedAt"         TIMESTAMP(3),
  "resolvedByAdminId"  TEXT,
  "relatedAccessLogId" TEXT,
  "createdAt"          TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3)          NOT NULL,
  CONSTRAINT "SecurityAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SecurityAlert_status_severity_createdAt_idx"
  ON "SecurityAlert"("status", "severity", "createdAt");

CREATE INDEX IF NOT EXISTS "SecurityAlert_patientId_createdAt_idx"
  ON "SecurityAlert"("patientId", "createdAt");

CREATE INDEX IF NOT EXISTS "SecurityAlert_actorId_createdAt_idx"
  ON "SecurityAlert"("actorId", "createdAt");

CREATE INDEX IF NOT EXISTS "SecurityAlert_dedupeKey_idx"
  ON "SecurityAlert"("dedupeKey");

-- PatientContactChangeLog
CREATE TABLE IF NOT EXISTS "PatientContactChangeLog" (
  "id"                 TEXT         NOT NULL,
  "patientProfileId"   TEXT         NOT NULL,
  "globalHealthNumber" TEXT,
  "changedById"        TEXT,
  "changedByRole"      TEXT         NOT NULL,
  "fieldChanged"       TEXT         NOT NULL,
  "oldValue"           TEXT,
  "newValue"           TEXT,
  "reason"             TEXT,
  "ipAddress"          TEXT,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientContactChangeLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PatientContactChangeLog_patientProfileId_fkey"
    FOREIGN KEY ("patientProfileId") REFERENCES "PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PatientContactChangeLog_patientProfileId_createdAt_idx"
  ON "PatientContactChangeLog"("patientProfileId", "createdAt");

-- PatientMergeLog
CREATE TABLE IF NOT EXISTS "PatientMergeLog" (
  "id"                          TEXT         NOT NULL,
  "primaryPatientId"            TEXT         NOT NULL,
  "duplicatePatientId"          TEXT         NOT NULL,
  "globalHealthNumberPrimary"   TEXT,
  "globalHealthNumberDuplicate" TEXT,
  "mergedByAdminId"             TEXT,
  "reason"                      TEXT,
  "primarySnapshot"             JSONB,
  "duplicateSnapshot"           JSONB,
  "patientInformed"             BOOLEAN      NOT NULL DEFAULT false,
  "createdAt"                   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientMergeLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PatientMergeLog_primaryPatientId_fkey"
    FOREIGN KEY ("primaryPatientId") REFERENCES "PatientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PatientMergeLog_primaryPatientId_idx"
  ON "PatientMergeLog"("primaryPatientId");

CREATE INDEX IF NOT EXISTS "PatientMergeLog_duplicatePatientId_idx"
  ON "PatientMergeLog"("duplicatePatientId");

-- CountryDataPolicy
CREATE TABLE IF NOT EXISTS "CountryDataPolicy" (
  "id"                   TEXT         NOT NULL,
  "countryId"            TEXT         NOT NULL,
  "countryCode"          TEXT         NOT NULL,
  "retentionYears"       INTEGER      NOT NULL DEFAULT 10,
  "storageRegion"        TEXT         NOT NULL DEFAULT 'EU',
  "requiresLocalStorage" BOOLEAN      NOT NULL DEFAULT false,
  "legalNotes"           TEXT,
  "isActive"             BOOLEAN      NOT NULL DEFAULT true,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CountryDataPolicy_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CountryDataPolicy_countryId_key" UNIQUE ("countryId"),
  CONSTRAINT "CountryDataPolicy_countryCode_key" UNIQUE ("countryCode"),
  CONSTRAINT "CountryDataPolicy_countryId_fkey"
    FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- DataDeletionRequest
CREATE TABLE IF NOT EXISTS "DataDeletionRequest" (
  "id"                      TEXT               NOT NULL,
  "patientProfileId"        TEXT               NOT NULL,
  "globalHealthNumber"      TEXT,
  "requestStatus"           "DataDeletionStatus" NOT NULL DEFAULT 'SUBMITTED',
  "requestedAt"             TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedByAdminId"       TEXT,
  "reviewedAt"              TIMESTAMP(3),
  "legalReasonForRetention" TEXT,
  "completedAt"             TIMESTAMP(3),
  "patientNotificationSent" BOOLEAN            NOT NULL DEFAULT false,
  "notes"                   TEXT,
  "createdAt"               TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"               TIMESTAMP(3)       NOT NULL,
  CONSTRAINT "DataDeletionRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DataDeletionRequest_patientProfileId_fkey"
    FOREIGN KEY ("patientProfileId") REFERENCES "PatientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "DataDeletionRequest_patientProfileId_requestStatus_idx"
  ON "DataDeletionRequest"("patientProfileId", "requestStatus");

CREATE INDEX IF NOT EXISTS "DataDeletionRequest_requestStatus_createdAt_idx"
  ON "DataDeletionRequest"("requestStatus", "createdAt");
