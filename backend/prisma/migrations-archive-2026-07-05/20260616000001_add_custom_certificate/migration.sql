-- Custom certificate: new enum value + per-certificate public verification ID.
-- All additive + nullable (non-destructive).

ALTER TYPE "GeneratedDocumentType" ADD VALUE IF NOT EXISTS 'CUSTOM_CERTIFICATE';

ALTER TABLE "GeneratedDocument" ADD COLUMN IF NOT EXISTS "certificateId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "GeneratedDocument_certificateId_key" ON "GeneratedDocument"("certificateId");
