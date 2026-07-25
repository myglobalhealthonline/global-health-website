-- Cross-jurisdiction prescription — SOAP disclosure consent gate (columns).
--
-- Adds the source-consultation SOAP snapshot (disclosed to the prescribing
-- doctor only after the patient consents), the patient consent token (hashed,
-- same pattern as ShareLink / MedicalAccessRequest), the consent timestamp,
-- and moves the request's default state to PENDING_CONSENT.
--
-- Runs AFTER …_cross_border_rx_consent_enum committed the new enum values, so
-- SET DEFAULT 'PENDING_CONSENT' is legal here.
--
-- Idempotent: safe to re-apply via `prisma migrate deploy`.

ALTER TABLE "CrossBorderPrescriptionRequest"
  ADD COLUMN IF NOT EXISTS "sourceChiefComplaint"  TEXT,
  ADD COLUMN IF NOT EXISTS "sourceSubjective"      TEXT,
  ADD COLUMN IF NOT EXISTS "sourceObjective"       TEXT,
  ADD COLUMN IF NOT EXISTS "sourceAssessment"      TEXT,
  ADD COLUMN IF NOT EXISTS "sourcePlan"            TEXT,
  ADD COLUMN IF NOT EXISTS "consentTokenHash"      TEXT,
  ADD COLUMN IF NOT EXISTS "consentTokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "soapConsentAt"         TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "CrossBorderPrescriptionRequest_consentTokenHash_key"
  ON "CrossBorderPrescriptionRequest" ("consentTokenHash");

ALTER TABLE "CrossBorderPrescriptionRequest"
  ALTER COLUMN "status" SET DEFAULT 'PENDING_CONSENT';
