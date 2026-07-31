-- One-off admin-created slots.
--
-- An admin can now add a slot for a single date/time without touching the
-- doctor's recurring weekly windows. Such a slot has nothing to derive it from,
-- so it must survive the "window changed → drop stale future OPEN slots" sweeps
-- in the availability routes; those now filter on "isAdHoc" = false.
--
-- Default false => every existing slot keeps today's behaviour exactly.
--
-- Written idempotently: this DB is live and drifted, so every statement is
-- IF NOT EXISTS / guarded and the migration is applied with `migrate deploy`.

ALTER TABLE "DoctorTimeSlot"
  ADD COLUMN IF NOT EXISTS "isAdHoc" BOOLEAN NOT NULL DEFAULT false;
