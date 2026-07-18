-- Secure email-link approve/deny for cross-country medical access requests
-- (no login required). Hash-only storage, same pattern as PatientUploadLink /
-- 20260717110000 GeneratedDocument.uploadTokenHash.

ALTER TABLE "MedicalAccessRequest" ADD COLUMN "tokenHash" TEXT;
ALTER TABLE "MedicalAccessRequest" ADD COLUMN "tokenExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "MedicalAccessRequest_tokenHash_key" ON "MedicalAccessRequest"("tokenHash");
