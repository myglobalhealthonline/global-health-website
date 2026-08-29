-- Provenance for appointment documents. Nullable and additive: existing rows
-- keep reading as DOCTOR uploads, which is exactly how they already surface in
-- both portals. New writes stamp DOCTOR / ADMIN / PATIENT so the patient
-- portal can bucket clinic uploads separately and keep the patient's own
-- uploads out of their new-document badge.
ALTER TABLE "AppointmentDocument"
  ADD COLUMN IF NOT EXISTS "uploadedByRole" TEXT,
  ADD COLUMN IF NOT EXISTS "uploadedByUserId" TEXT;

-- Badge cursor for the patient portal's Medical Files nav item: documents
-- created after this instant are "new" to the patient. Null = never opened,
-- which counts everything, matching a fresh unread state.
ALTER TABLE "PatientProfile"
  ADD COLUMN IF NOT EXISTS "medicalFilesSeenAt" TIMESTAMP(3);
