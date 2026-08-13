-- Cross-jurisdiction prescription — Doctor B "request more information"
-- round. Doctor A answers in-portal (already authenticated on their own
-- appointment's consultation tab), so no token/link columns are needed —
-- just the question/answer text and timestamps. The answer is also written
-- onto the source appointment's MedicalNote history (application-layer, no
-- schema change needed there).
--
-- Idempotent: safe to re-apply via `prisma migrate deploy`.

ALTER TABLE "CrossBorderPrescriptionRequest"
  ADD COLUMN IF NOT EXISTS "moreInfoQuestion"   TEXT,
  ADD COLUMN IF NOT EXISTS "moreInfoAnswer"     TEXT,
  ADD COLUMN IF NOT EXISTS "moreInfoAskedAt"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "moreInfoAnsweredAt" TIMESTAMP(3);
