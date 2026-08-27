-- Explicit admin opt-in gate for Memed e-prescription signing.
--
-- Having a complete CRM+CPF+DOB was not enough by itself — any BR doctor
-- with a filled-in profile could otherwise use the widget. This adds a
-- default-off switch admins flip per doctor, checked on every
-- ensurePrescriber call (see modules/memed/prescription-widget.service.ts),
-- not just at registration time.

ALTER TABLE "DoctorCountry" ADD COLUMN IF NOT EXISTS "memedPrescriptionEnabled" BOOLEAN NOT NULL DEFAULT false;
