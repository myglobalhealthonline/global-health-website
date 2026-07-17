-- Número de Utente (Portuguese SNS healthcare number).
-- Idempotent DDL: this database carries drift, so every statement must be
-- safe to re-run under `prisma migrate deploy`.

-- AlterTable: canonical value on the patient record (PHI-encrypted at rest).
ALTER TABLE "PatientProfile" ADD COLUMN IF NOT EXISTS "utenteNumber" TEXT;

-- AlterTable: booking snapshot columns, mirroring patientNationalIdNumber.
ALTER TABLE "CartItem" ADD COLUMN IF NOT EXISTS "patientUtenteNumber" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "patientUtenteNumber" TEXT;

-- AlterTable: per-country visibility flag. Off everywhere by default.
ALTER TABLE "BookingSetting"
  ADD COLUMN IF NOT EXISTS "collectUtenteNumber" BOOLEAN NOT NULL DEFAULT false;

-- Turn the field on for Portugal only. Scoped by join so it cannot touch
-- another market even if country ids differ per environment.
UPDATE "BookingSetting" bs
SET "collectUtenteNumber" = true
FROM "Country" c
WHERE bs."countryId" = c."id"
  AND UPPER(c."code") = 'PT';
