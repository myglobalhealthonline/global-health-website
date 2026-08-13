-- Dedup guard for the consultation-start+5min doctor no-show check, same
-- shape as reminderSentAt/doctorReminderSentAt. Null means "not checked yet".
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "doctorNoShowNotifiedAt" TIMESTAMP(3);
