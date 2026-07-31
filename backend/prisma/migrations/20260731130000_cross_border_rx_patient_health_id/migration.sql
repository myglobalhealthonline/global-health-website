-- Cross-border prescriptions: the patient's health/tax identifier for the
-- COUNTRY THE PRESCRIPTION IS ISSUED IN (PPS in IE, NIF in PT, CPF in BR, ...).
-- Collected on the consent/payment step, snapshotted onto the async Appointment
-- when it is minted. The chart's `PatientProfile.taxIdNumber` is the patient's
-- home-country id and must never be printed under a foreign label.
--
-- Idempotent: safe to re-apply via `prisma migrate deploy`.

ALTER TABLE "CrossBorderPrescriptionRequest"
  ADD COLUMN IF NOT EXISTS "patientHealthIdNumber" TEXT;

ALTER TABLE "Appointment"
  ADD COLUMN IF NOT EXISTS "patientHealthIdNumber" TEXT;
