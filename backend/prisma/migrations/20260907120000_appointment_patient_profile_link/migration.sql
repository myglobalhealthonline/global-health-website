-- Durable appointment -> patient link.
--
-- `Appointment.userId` is the PURCHASER's account, not reliably the patient's:
-- a family/dependent booking carries the payer there while the consultation
-- belongs to someone else. Resolving "whose medical record is this?" through
-- `userId` can therefore return the wrong patient's chart, so the appointment
-- now carries the concrete `PatientProfile` it is for.
--
-- Additive and rollout-safe by construction:
--   * NULLABLE, no default and no backfill — old application code keeps
--     inserting rows with a null link, new code reads a null link
--     conservatively (fails closed) rather than guessing.
--   * ON DELETE RESTRICT — a retained clinical record must never disappear as
--     a side effect of deleting a patient profile, and anonymization retains
--     the profile row anyway.
--   * ADD COLUMN with no default and no table rewrite; the index build takes a
--     brief SHARE lock on Appointment and nothing longer.
--
-- Apply through `prisma migrate deploy`. Idempotent, like every migration here.

ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "patientProfileId" TEXT;

CREATE INDEX IF NOT EXISTS "Appointment_patientProfileId_idx"
  ON "Appointment"("patientProfileId");

DO $$ BEGIN
  ALTER TABLE "Appointment"
    ADD CONSTRAINT "Appointment_patientProfileId_fkey"
    FOREIGN KEY ("patientProfileId") REFERENCES "PatientProfile"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
