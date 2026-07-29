-- Patient delivery details captured at the payment step (pharmacy + confirmed
-- address). Applied to the async appointment when it is minted.
--
-- Idempotent: safe to re-apply via `prisma migrate deploy`.

ALTER TABLE "CrossBorderPrescriptionRequest"
  ADD COLUMN IF NOT EXISTS "pharmacyName"              TEXT,
  ADD COLUMN IF NOT EXISTS "patientAddressLine1"       TEXT,
  ADD COLUMN IF NOT EXISTS "patientAddressLine2"       TEXT,
  ADD COLUMN IF NOT EXISTS "patientAddressCity"        TEXT,
  ADD COLUMN IF NOT EXISTS "patientAddressPostalCode"  TEXT,
  ADD COLUMN IF NOT EXISTS "patientAddressCountryCode" TEXT;
