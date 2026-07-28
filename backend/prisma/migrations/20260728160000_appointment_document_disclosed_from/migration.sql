-- Cross-jurisdiction prescription: record who a disclosed document came FROM.
--
-- When a cross-border request is paid, the referring doctor's attachments and
-- generated PDFs are re-materialised on the prescribing doctor's async
-- appointment. `AppointmentDocument.doctorId` has to be the RECEIVING doctor —
-- it is what `GET /api/doctor/documents/:id/download` authorises against — so
-- the patient chart credited the copy to the doctor who received it rather
-- than the one who wrote it.
--
-- Soft FK (no constraint, matching `Appointment.insuranceCompanyId`): a doctor
-- row being removed must not cascade into a clinical document. Null for every
-- ordinary upload, where `doctorId` is already the uploader.
--
-- Written idempotently: this DB is live and drifted, so the statement is
-- IF NOT EXISTS-guarded and the migration is applied with `migrate deploy`.

ALTER TABLE "AppointmentDocument"
  ADD COLUMN IF NOT EXISTS "disclosedFromDoctorId" TEXT;
