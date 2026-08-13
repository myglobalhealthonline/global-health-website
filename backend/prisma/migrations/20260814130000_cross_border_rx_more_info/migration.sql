-- Cross-jurisdiction prescription — Doctor B "request more information"
-- round-trip. Same hashed-token pattern as consentTokenHash: the raw token
-- lives only in the emailed/WhatsApped link to Doctor A, the DB stores its
-- SHA-256 hash. Doctor A's answer is also written onto the source
-- appointment's MedicalNote history (application-layer, no schema change
-- needed there).
--
-- Idempotent: safe to re-apply via `prisma migrate deploy`.

ALTER TABLE "CrossBorderPrescriptionRequest"
  ADD COLUMN IF NOT EXISTS "moreInfoTokenHash"      TEXT,
  ADD COLUMN IF NOT EXISTS "moreInfoTokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "moreInfoQuestion"       TEXT,
  ADD COLUMN IF NOT EXISTS "moreInfoAnswer"         TEXT,
  ADD COLUMN IF NOT EXISTS "moreInfoAskedAt"        TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "moreInfoAnsweredAt"     TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "CrossBorderPrescriptionRequest_moreInfoTokenHash_key"
  ON "CrossBorderPrescriptionRequest" ("moreInfoTokenHash");
