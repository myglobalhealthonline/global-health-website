-- SC-1: convert two free-string status columns to Postgres enums.
--
-- Hand-written, not generated: `prisma migrate dev` cannot run in this repo
-- (the shadow database replays every migration and migration
-- 20260520000000_cart_first_booking_patient_fields references CartItem before
-- it exists — P3006). See docs/guides + the migration-shadow-db note.
--
-- Value sets are the exact literals the application writes, checked against
-- production on 2026-09-07 with a read-only query:
--   DoctorProfileChangeRequest.status  approved=8, rejected=2  (no other value)
--   MemedBooking.status                no rows
-- Both are subsets of the enums below, so the USING cast cannot fail on data.
--
-- Every statement is idempotent and converts in place: re-running the file is
-- a no-op, and no data is copied through a temporary column.

DO $$ BEGIN
  CREATE TYPE "DoctorProfileChangeRequestStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "MemedBookingStatus" AS ENUM ('PENDING', 'SKIPPED', 'SUCCESS', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Two things have to move out of the way before the type change and go back
-- afterwards:
--   * the DEFAULT — Postgres will not cast an existing text default to the
--     new enum type;
--   * `DoctorProfileChangeRequest_pending_key`, the raw-SQL partial unique
--     index that enforces one pending request per (doctor, field, country).
--     ALTER COLUMN ... TYPE rebuilds every index on the column, and its
--     predicate `status = 'pending'::text` has no `enum = text` operator, so
--     the rebuild fails. It is dropped and recreated byte-identically except
--     for the predicate's cast — the constraint is never absent outside this
--     statement, which runs as one transaction.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_name = 'DoctorProfileChangeRequest'
       AND column_name = 'status'
       AND data_type <> 'USER-DEFINED'
  ) THEN
    DROP INDEX IF EXISTS "DoctorProfileChangeRequest_pending_key";
    ALTER TABLE "DoctorProfileChangeRequest" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "DoctorProfileChangeRequest"
      ALTER COLUMN "status" TYPE "DoctorProfileChangeRequestStatus"
      USING "status"::"DoctorProfileChangeRequestStatus";
    ALTER TABLE "DoctorProfileChangeRequest"
      ALTER COLUMN "status" SET DEFAULT 'pending'::"DoctorProfileChangeRequestStatus";
    CREATE UNIQUE INDEX "DoctorProfileChangeRequest_pending_key"
      ON "DoctorProfileChangeRequest" ("doctorId", field, COALESCE("countryId", ''::text))
      WHERE (status = 'pending'::"DoctorProfileChangeRequestStatus");
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_name = 'MemedBooking'
       AND column_name = 'status'
       AND data_type <> 'USER-DEFINED'
  ) THEN
    ALTER TABLE "MemedBooking" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "MemedBooking"
      ALTER COLUMN "status" TYPE "MemedBookingStatus"
      USING "status"::"MemedBookingStatus";
    ALTER TABLE "MemedBooking"
      ALTER COLUMN "status" SET DEFAULT 'PENDING'::"MemedBookingStatus";
  END IF;
END $$;
