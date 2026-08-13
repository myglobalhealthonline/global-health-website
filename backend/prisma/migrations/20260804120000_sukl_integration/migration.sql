-- SÚKL (Czech ePoukaz / eRecept) integration — facility connection + doctor mappings.
--
-- Hand-written and fully idempotent on purpose. This project applies migrations
-- with `prisma migrate deploy` against a live Railway database that carries
-- pre-existing drift; `migrate dev` is never run, so every statement here must
-- be safe to re-apply and must not depend on a shadow database.
--
-- No table here stores key material, a rodné číslo, or a personal signing
-- certificate. See docs/sukl/SECURITY_MODEL.md.

-- ─── Enums ───────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SuklIntegrationStatus') THEN
    CREATE TYPE "SuklIntegrationStatus" AS ENUM (
      'NOT_CONFIGURED', 'TEST_ONLY', 'ACTIVE', 'ERROR', 'DISABLED'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SuklDoctorIdentityStatus') THEN
    CREATE TYPE "SuklDoctorIdentityStatus" AS ENUM (
      'UNVERIFIED', 'VERIFIED', 'REJECTED', 'REVOKED'
    );
  END IF;
END
$$;

-- New AuditAction values. `ADD VALUE IF NOT EXISTS` is safe inside the
-- transaction migrate deploy wraps around this file because none of the new
-- values is *used* here — only declared.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SUKL_CONNECTION_TESTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SUKL_DOCTOR_IDENTITY_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SUKL_DOCTOR_IDENTITY_REVOKED';

-- ─── SuklFacilityIntegration ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SuklFacilityIntegration" (
  "id"                     TEXT NOT NULL,
  "countryCode"            TEXT NOT NULL DEFAULT 'cz',
  "environment"            TEXT NOT NULL,
  "ico"                    TEXT NOT NULL,
  "workplaceCode"          TEXT NOT NULL,
  "workplaceType"          TEXT NOT NULL DEFAULT 'AMBULANCE',
  "certificateFingerprint" TEXT,
  "certificateSubject"     TEXT,
  "certificateIssuer"      TEXT,
  "certificateExpiresAt"   TIMESTAMP(3),
  "secretReference"        TEXT,
  "status"                 "SuklIntegrationStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
  "lastConnectionAt"       TIMESTAMP(3),
  "lastErrorCode"          TEXT,
  "lastErrorMessage"       TEXT,
  "lastErrorAt"            TIMESTAMP(3),
  "lastExpiryAlertDays"    INTEGER,
  "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SuklFacilityIntegration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SuklFacilityIntegration_environment_workplaceCode_key"
  ON "SuklFacilityIntegration" ("environment", "workplaceCode");

CREATE INDEX IF NOT EXISTS "SuklFacilityIntegration_countryCode_status_idx"
  ON "SuklFacilityIntegration" ("countryCode", "status");

-- ─── SuklDoctorIdentity ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SuklDoctorIdentity" (
  "id"                         TEXT NOT NULL,
  "doctorUserId"               TEXT NOT NULL,
  "doctorId"                   TEXT,
  "environment"                TEXT NOT NULL,
  "suklProfessionalIdentifier" TEXT NOT NULL,
  "suklUsernameOrReference"    TEXT,
  "workplaceCode"              TEXT NOT NULL,
  "specialityCode"             TEXT,
  "status"                     "SuklDoctorIdentityStatus" NOT NULL DEFAULT 'UNVERIFIED',
  "verifiedAt"                 TIMESTAMP(3),
  "updatedByUserId"            TEXT,
  "notes"                      TEXT,
  "createdAt"                  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SuklDoctorIdentity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SuklDoctorIdentity_doctorUserId_environment_key"
  ON "SuklDoctorIdentity" ("doctorUserId", "environment");

CREATE INDEX IF NOT EXISTS "SuklDoctorIdentity_environment_workplaceCode_idx"
  ON "SuklDoctorIdentity" ("environment", "workplaceCode");

CREATE INDEX IF NOT EXISTS "SuklDoctorIdentity_status_idx"
  ON "SuklDoctorIdentity" ("status");
