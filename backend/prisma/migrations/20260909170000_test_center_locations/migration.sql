-- Test centres get multiple physical locations.
--
-- A TestCenter is now the PROVIDER (a chain, a lab company) and a
-- TestCenterLocation is the site a patient travels to. The calendar moves down
-- to the location: two branches cannot share one slot grid, because a 09:00
-- slot can only be at one building.
--
-- Pricing deliberately stays on the provider (TestCenterExam is untouched) — a
-- chain charges the same for an exam at every branch, so an admin prices it
-- once.
--
-- Every existing centre is auto-migrated to exactly one location carrying its
-- current address, so single-site centres keep behaving exactly as before and
-- no admin has to re-enter anything.
--
-- Idempotent DDL: safe to re-run against the live Railway DB (see CLAUDE.md /
-- db-migration-workflow — `migrate deploy`, never `migrate dev`).

-- ---------------------------------------------------------------------------
-- 1. The location table.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "TestCenterLocation" (
    "id" TEXT NOT NULL,
    "testCenterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "addressLine" TEXT,
    "city" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestCenterLocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TestCenterLocation_testCenterId_slug_key"
  ON "TestCenterLocation"("testCenterId", "slug");
CREATE INDEX IF NOT EXISTS "TestCenterLocation_testCenterId_isActive_idx"
  ON "TestCenterLocation"("testCenterId", "isActive");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TestCenterLocation_testCenterId_fkey') THEN
    ALTER TABLE "TestCenterLocation" ADD CONSTRAINT "TestCenterLocation_testCenterId_fkey"
      FOREIGN KEY ("testCenterId") REFERENCES "TestCenter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 2. Backfill: one location per existing centre, carrying its address.
--
-- Slug "main" is reserved for this row so the unique (testCenterId, slug) never
-- collides with a branch an admin adds later. Name falls back to the centre's
-- own name when it has no city, so the picker never renders a blank option.
-- ---------------------------------------------------------------------------
INSERT INTO "TestCenterLocation" (
  "id", "testCenterId", "name", "slug", "addressLine", "city", "phone",
  "isActive", "sortOrder", "createdAt", "updatedAt"
)
SELECT
  md5(random()::text || clock_timestamp()::text || tc."id"),
  tc."id",
  COALESCE(NULLIF(tc."city", ''), tc."name"),
  'main',
  tc."addressLine",
  tc."city",
  tc."phone",
  tc."isActive",
  0,
  NOW(),
  NOW()
FROM "TestCenter" tc
WHERE NOT EXISTS (
  SELECT 1 FROM "TestCenterLocation" loc WHERE loc."testCenterId" = tc."id"
);

-- ---------------------------------------------------------------------------
-- 3. Move the calendar from the centre to the location.
--
-- The three availability tables were created by 20260908120000 keyed on
-- "testCenterId". Add the location column, backfill it through the centre's
-- "main" location, then enforce and drop the old key. Nothing has booked
-- against them yet in production, but the backfill is written to be correct
-- either way.
-- ---------------------------------------------------------------------------
ALTER TABLE "TestCenterAvailability"
  ADD COLUMN IF NOT EXISTS "testCenterLocationId" TEXT;
ALTER TABLE "TestCenterTimeSlot"
  ADD COLUMN IF NOT EXISTS "testCenterLocationId" TEXT;
ALTER TABLE "TestCenterAvailabilityException"
  ADD COLUMN IF NOT EXISTS "testCenterLocationId" TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'TestCenterAvailability' AND column_name = 'testCenterId'
  ) THEN
    UPDATE "TestCenterAvailability" a
      SET "testCenterLocationId" = loc."id"
      FROM "TestCenterLocation" loc
      WHERE loc."testCenterId" = a."testCenterId"
        AND loc."slug" = 'main'
        AND a."testCenterLocationId" IS NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'TestCenterTimeSlot' AND column_name = 'testCenterId'
  ) THEN
    UPDATE "TestCenterTimeSlot" s
      SET "testCenterLocationId" = loc."id"
      FROM "TestCenterLocation" loc
      WHERE loc."testCenterId" = s."testCenterId"
        AND loc."slug" = 'main'
        AND s."testCenterLocationId" IS NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'TestCenterAvailabilityException' AND column_name = 'testCenterId'
  ) THEN
    UPDATE "TestCenterAvailabilityException" e
      SET "testCenterLocationId" = loc."id"
      FROM "TestCenterLocation" loc
      WHERE loc."testCenterId" = e."testCenterId"
        AND loc."slug" = 'main'
        AND e."testCenterLocationId" IS NULL;
  END IF;
END
$$;

-- Any row the backfill could not place (a centre deleted mid-flight) would
-- block the NOT NULL below. There is no valid location for it, so drop it —
-- it is derived inventory that regenerates from the windows.
DELETE FROM "TestCenterAvailability" WHERE "testCenterLocationId" IS NULL;
DELETE FROM "TestCenterTimeSlot" WHERE "testCenterLocationId" IS NULL;
DELETE FROM "TestCenterAvailabilityException" WHERE "testCenterLocationId" IS NULL;

ALTER TABLE "TestCenterAvailability" ALTER COLUMN "testCenterLocationId" SET NOT NULL;
ALTER TABLE "TestCenterTimeSlot" ALTER COLUMN "testCenterLocationId" SET NOT NULL;
ALTER TABLE "TestCenterAvailabilityException" ALTER COLUMN "testCenterLocationId" SET NOT NULL;

-- Old keys, constraints and indexes go once nothing reads them.
ALTER TABLE "TestCenterAvailability" DROP CONSTRAINT IF EXISTS "TestCenterAvailability_testCenterId_fkey";
ALTER TABLE "TestCenterTimeSlot" DROP CONSTRAINT IF EXISTS "TestCenterTimeSlot_testCenterId_fkey";
ALTER TABLE "TestCenterAvailabilityException" DROP CONSTRAINT IF EXISTS "TestCenterAvailabilityException_testCenterId_fkey";

DROP INDEX IF EXISTS "TestCenterAvailability_testCenterId_weekday_idx";
DROP INDEX IF EXISTS "TestCenterTimeSlot_testCenterId_startAt_key";
DROP INDEX IF EXISTS "TestCenterTimeSlot_testCenterId_startAt_status_idx";
DROP INDEX IF EXISTS "TestCenterAvailabilityException_testCenterId_startAt_key";
DROP INDEX IF EXISTS "TestCenterAvailabilityException_testCenterId_startAt_idx";

ALTER TABLE "TestCenterAvailability" DROP COLUMN IF EXISTS "testCenterId";
ALTER TABLE "TestCenterTimeSlot" DROP COLUMN IF EXISTS "testCenterId";
ALTER TABLE "TestCenterAvailabilityException" DROP COLUMN IF EXISTS "testCenterId";

-- New keys.
CREATE INDEX IF NOT EXISTS "TestCenterAvailability_testCenterLocationId_weekday_idx"
  ON "TestCenterAvailability"("testCenterLocationId", "weekday");

CREATE UNIQUE INDEX IF NOT EXISTS "TestCenterTimeSlot_testCenterLocationId_startAt_key"
  ON "TestCenterTimeSlot"("testCenterLocationId", "startAt");
CREATE INDEX IF NOT EXISTS "TestCenterTimeSlot_testCenterLocationId_startAt_status_idx"
  ON "TestCenterTimeSlot"("testCenterLocationId", "startAt", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "TestCenterAvailabilityException_testCenterLocationId_startAt_key"
  ON "TestCenterAvailabilityException"("testCenterLocationId", "startAt");
CREATE INDEX IF NOT EXISTS "TestCenterAvailabilityException_testCenterLocationId_startAt_idx"
  ON "TestCenterAvailabilityException"("testCenterLocationId", "startAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TestCenterAvailability_testCenterLocationId_fkey') THEN
    ALTER TABLE "TestCenterAvailability" ADD CONSTRAINT "TestCenterAvailability_testCenterLocationId_fkey"
      FOREIGN KEY ("testCenterLocationId") REFERENCES "TestCenterLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TestCenterTimeSlot_testCenterLocationId_fkey') THEN
    ALTER TABLE "TestCenterTimeSlot" ADD CONSTRAINT "TestCenterTimeSlot_testCenterLocationId_fkey"
      FOREIGN KEY ("testCenterLocationId") REFERENCES "TestCenterLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TestCenterAvailabilityException_testCenterLocationId_fkey') THEN
    ALTER TABLE "TestCenterAvailabilityException" ADD CONSTRAINT "TestCenterAvailabilityException_testCenterLocationId_fkey"
      FOREIGN KEY ("testCenterLocationId") REFERENCES "TestCenterLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 4. The slot overlap guard follows the calendar down to the location.
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "TestCenterTimeSlot"
  DROP CONSTRAINT IF EXISTS "no_overlapping_test_center_slots";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'no_overlapping_test_center_location_slots') THEN
    ALTER TABLE "TestCenterTimeSlot"
      ADD CONSTRAINT "no_overlapping_test_center_location_slots"
      EXCLUDE USING gist (
        "testCenterLocationId" WITH =,
        tsrange("startAt", "endAt") WITH &&
      )
      WHERE ("status" <> 'BLOCKED');
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 5. The booking spine records which branch was attended.
--
-- "testCenterId" stays alongside it: that is the provider, and reporting reads
-- it. The location is the site whose address the patient was actually given.
-- ---------------------------------------------------------------------------
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "testCenterLocationId" TEXT;
ALTER TABLE "CartItem" ADD COLUMN IF NOT EXISTS "testCenterLocationId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "testCenterLocationId" TEXT;

CREATE INDEX IF NOT EXISTS "Appointment_testCenterLocationId_scheduledAt_idx"
  ON "Appointment"("testCenterLocationId", "scheduledAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Appointment_testCenterLocationId_fkey') THEN
    ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_testCenterLocationId_fkey"
      FOREIGN KEY ("testCenterLocationId") REFERENCES "TestCenterLocation"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
