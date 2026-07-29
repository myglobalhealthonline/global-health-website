-- Clinical notes: doctor picks SOAP (4 structured fields) or a single
-- free-text note, per note. Idempotent — safe to re-apply via
-- `prisma migrate deploy`.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConsultationNoteFormat') THEN
    CREATE TYPE "ConsultationNoteFormat" AS ENUM ('SOAP', 'FREEFORM');
  END IF;
END
$$;

ALTER TABLE "Consultation"
  ADD COLUMN IF NOT EXISTS "noteFormat" "ConsultationNoteFormat" NOT NULL DEFAULT 'SOAP',
  ADD COLUMN IF NOT EXISTS "note" TEXT;

ALTER TABLE "CrossBorderPrescriptionRequest"
  ADD COLUMN IF NOT EXISTS "sourceNoteFormat" "ConsultationNoteFormat" NOT NULL DEFAULT 'SOAP',
  ADD COLUMN IF NOT EXISTS "sourceNote" TEXT;
