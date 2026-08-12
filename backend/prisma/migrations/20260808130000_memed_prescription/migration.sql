-- Memed Prescrição — BR doctor e-prescription/certificate widget.
--
-- Separate feature from the earlier `MemedBooking` (health-test-kit)
-- migration — different Memed product surface, no relation to it. No
-- credentials yet; this only adds the columns the widget flow writes to.
--
-- Hand-written and fully idempotent — this project applies migrations with
-- `prisma migrate deploy` against a live Railway database with pre-existing
-- drift; `migrate dev` is never run.

-- New audit action. `ADD VALUE IF NOT EXISTS` is safe inside the transaction
-- migrate deploy wraps this file in, because the value is only declared
-- here, not used.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'MEMED_DOCUMENT_ISSUED';

-- ─── DoctorCountry ───────────────────────────────────────────────────────────
ALTER TABLE "DoctorCountry" ADD COLUMN IF NOT EXISTS "memedPrescriberId" TEXT;

-- ─── GeneratedDocument ───────────────────────────────────────────────────────
ALTER TABLE "GeneratedDocument" ADD COLUMN IF NOT EXISTS "memedDocumentId" TEXT;
ALTER TABLE "GeneratedDocument" ADD COLUMN IF NOT EXISTS "memedUrl" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "GeneratedDocument_memedDocumentId_key"
  ON "GeneratedDocument"("memedDocumentId");
