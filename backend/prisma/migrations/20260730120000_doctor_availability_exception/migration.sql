-- Single-date availability exceptions — the tombstone behind admin "remove slot".
--
-- DoctorTimeSlot rows are DERIVED from the recurring DoctorAvailability windows
-- and re-materialised on every availability read (ensureSlotsForRange), so a
-- plain DELETE of a slot row is undone by the next read. An exception row marks
-- a UTC span the generators must never fill again, which removes the slot for
-- that ONE date while the weekly window keeps generating every other week.
--
-- Written idempotently: this DB is live and drifted, so every statement is
-- IF NOT EXISTS / guarded and the migration is applied with `migrate deploy`.

CREATE TABLE IF NOT EXISTS "DoctorAvailabilityException" (
  "id"        TEXT         NOT NULL,
  "doctorId"  TEXT         NOT NULL,
  "startAt"   TIMESTAMP(3) NOT NULL,
  "endAt"     TIMESTAMP(3) NOT NULL,
  "reason"    TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DoctorAvailabilityException_pkey" PRIMARY KEY ("id")
);

-- Removing the same slot twice is a no-op (the service upserts on this key).
CREATE UNIQUE INDEX IF NOT EXISTS "DoctorAvailabilityException_doctorId_startAt_key"
  ON "DoctorAvailabilityException" ("doctorId", "startAt");

-- Backs the per-doctor range lookup both generators run before inserting.
CREATE INDEX IF NOT EXISTS "DoctorAvailabilityException_doctorId_startAt_idx"
  ON "DoctorAvailabilityException" ("doctorId", "startAt");

-- ADD CONSTRAINT has no IF NOT EXISTS in PostgreSQL, so guard it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'DoctorAvailabilityException_doctorId_fkey'
  ) THEN
    ALTER TABLE "DoctorAvailabilityException"
      ADD CONSTRAINT "DoctorAvailabilityException_doctorId_fkey"
      FOREIGN KEY ("doctorId") REFERENCES "Doctor" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
