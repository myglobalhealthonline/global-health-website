-- Country director — cross-doctor consultation visibility.
--
-- Each country has a director: a doctor who also oversees the market and needs
-- to see every consultation booked there, not just their own. This is a
-- per-doctor RBAC flag, NOT a new user role.
--
-- Adds:
--   Doctor.isCountryDirector          → master gate (mirrors crossBorderRxEnabled).
--   DoctorCountry.directorAccess      → which of the doctor's markets are granted.
--   AuditAction.COUNTRY_CONSULTATIONS_VIEWED
--                                     → the read is audited, like DOCTOR_BANK_VIEWED,
--                                       because it exposes other doctors' patients.
--
-- Idempotent: this DB carries drift, so the migration must be safe to re-apply
-- via `prisma migrate deploy` (never `migrate dev`).

-- ─── Enums ────────────────────────────────────────────────────────────────────

-- Postgres 12+ permits ADD VALUE inside a transaction as long as the new value
-- is not USED in the same transaction. Nothing below writes it, so this is safe
-- under `migrate deploy`'s per-file transaction.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COUNTRY_CONSULTATIONS_VIEWED';

-- ─── Master gate ──────────────────────────────────────────────────────────────

ALTER TABLE "Doctor"
  ADD COLUMN IF NOT EXISTS "isCountryDirector" BOOLEAN NOT NULL DEFAULT false;

-- ─── Per-market grant ─────────────────────────────────────────────────────────
-- DoctorCountry is the canonical market row (it includes the primary country),
-- so the grant lives here rather than in a new join table.

ALTER TABLE "DoctorCountry"
  ADD COLUMN IF NOT EXISTS "directorAccess" BOOLEAN NOT NULL DEFAULT false;

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "DoctorCountry_countryId_directorAccess_idx"
  ON "DoctorCountry" ("countryId", "directorAccess");
