-- Cross-border prescription: track when Doctor B finalised the prescription
-- document, so the patient + Doctor A "prescription sent" notifications fire
-- exactly once.
--
-- Idempotent: safe to re-apply via `prisma migrate deploy`.

ALTER TABLE "CrossBorderPrescriptionRequest"
  ADD COLUMN IF NOT EXISTS "finalisedAt" TIMESTAMP(3);
