-- Throttle stamps for patient→admin / patient→doctor message email+WhatsApp
-- alerts (email/WhatsApp on top of the existing in-portal bell). Hand-written
-- and idempotent — this project applies with `prisma migrate deploy` against
-- a live Railway database with pre-existing drift; `migrate dev` is never run.

ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "lastPatientMsgAdminAlertAt" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "lastPatientMsgDoctorAlertAt" TIMESTAMP(3);
