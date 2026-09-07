-- "Book a Test" — test-center booking spine.
--
-- Adds (a) the three-layer availability model for TestCenter, mirroring the
-- doctor one (weekly template -> generated concrete slots -> date tombstones),
-- (b) public-facing content + per-locale translations on the global ExamType
-- catalogue, and (c) the nullable linkage columns that let an existing
-- Appointment / CartItem / OrderItem carry a test booking.
--
-- Idempotent DDL: safe to re-run against the live Railway DB (see CLAUDE.md /
-- db-migration-workflow — `migrate deploy`, never `migrate dev`).
--
-- Reuses the existing "DoctorSlotStatus" enum for TestCenterTimeSlot.status:
-- the whole admin calendar UI is typed on its literals and a parallel enum
-- would fork every one of those components for no semantic gain.

-- ---------------------------------------------------------------------------
-- 1. CartItemKind: the new public booking kind.
--
-- Deliberately NOT a reuse of LAB_EXAM — that kind drives
-- markRequisitionsReadyOnOrderPaid(), so a public test booking carrying it
-- would advance a Synlab requisition that does not exist.
--
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction block on PG < 12,
-- and Prisma wraps each migration in one. IF NOT EXISTS makes the re-run safe;
-- the value is appended at the end of the enum (ordering is not semantic here).
-- ---------------------------------------------------------------------------
ALTER TYPE "CartItemKind" ADD VALUE IF NOT EXISTS 'TEST_BOOKING';

-- ---------------------------------------------------------------------------
-- 2. Test-center availability trio.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "TestCenterAvailability" (
    "id" TEXT NOT NULL,
    "testCenterId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "slotDurationMinutes" INTEGER NOT NULL DEFAULT 30,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestCenterAvailability_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TestCenterTimeSlot" (
    "id" TEXT NOT NULL,
    "testCenterId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "DoctorSlotStatus" NOT NULL DEFAULT 'OPEN',
    "blockReason" TEXT,
    "isAdHoc" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestCenterTimeSlot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TestCenterAvailabilityException" (
    "id" TEXT NOT NULL,
    "testCenterId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestCenterAvailabilityException_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 3. Per-locale ExamType content.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ExamTypeTranslation" (
    "id" TEXT NOT NULL,
    "examTypeId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "heroTitle" TEXT,
    "heroDescription" TEXT,
    "detailBody" TEXT,
    "preparationBody" TEXT,
    "ctaLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamTypeTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TestCenterAvailability_testCenterId_weekday_idx"
  ON "TestCenterAvailability"("testCenterId", "weekday");

CREATE UNIQUE INDEX IF NOT EXISTS "TestCenterTimeSlot_testCenterId_startAt_key"
  ON "TestCenterTimeSlot"("testCenterId", "startAt");
CREATE INDEX IF NOT EXISTS "TestCenterTimeSlot_testCenterId_startAt_status_idx"
  ON "TestCenterTimeSlot"("testCenterId", "startAt", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "TestCenterAvailabilityException_testCenterId_startAt_key"
  ON "TestCenterAvailabilityException"("testCenterId", "startAt");
CREATE INDEX IF NOT EXISTS "TestCenterAvailabilityException_testCenterId_startAt_idx"
  ON "TestCenterAvailabilityException"("testCenterId", "startAt");

CREATE UNIQUE INDEX IF NOT EXISTS "ExamTypeTranslation_examTypeId_locale_key"
  ON "ExamTypeTranslation"("examTypeId", "locale");
CREATE INDEX IF NOT EXISTS "ExamTypeTranslation_examTypeId_idx"
  ON "ExamTypeTranslation"("examTypeId");

-- ---------------------------------------------------------------------------
-- 4. Slot overlap guard — exact analogue of "no_overlapping_doctor_slots"
--    (20260705000000_doctor_slot_overlap_guard).
--
-- The per-row OPEN->BOOKED claim stops two patients taking the SAME row; it
-- does not stop concurrent lazy generation producing two DISTINCT overlapping
-- OPEN rows. This constraint is the real guard.
--
-- BLOCKED slots are admin holds, not bookable — excluded so an admin block
-- doesn't collide with a real slot in the same window.
--
-- startAt/endAt are TIMESTAMP(3) (no timezone), so tsrange() is correct here:
-- tstzrange() would need an implicit STABLE timezone() cast, which Postgres
-- rejects in an index expression.
--
-- This takes ACCESS EXCLUSIVE and builds a GiST index. It is instant only
-- because the table is created empty in this same migration — do not split it
-- into a later one.
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'no_overlapping_test_center_slots') THEN
    ALTER TABLE "TestCenterTimeSlot"
      ADD CONSTRAINT "no_overlapping_test_center_slots"
      EXCLUDE USING gist (
        "testCenterId" WITH =,
        tsrange("startAt", "endAt") WITH &&
      )
      WHERE ("status" <> 'BLOCKED');
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 5. ExamType public content columns.
--
-- "isBookable" defaults FALSE on purpose: the live catalogue already holds the
-- imported Synlab exam list, and this migration must not publish all of it to
-- the public site. Admin opts each exam in.
-- ---------------------------------------------------------------------------
ALTER TABLE "ExamType"
  ADD COLUMN IF NOT EXISTS "summary" TEXT,
  ADD COLUMN IF NOT EXISTS "imagePath" TEXT,
  ADD COLUMN IF NOT EXISTS "galleryImagePaths" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "seoTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "seoDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "heroTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "heroDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "detailBody" TEXT,
  ADD COLUMN IF NOT EXISTS "preparationBody" TEXT,
  ADD COLUMN IF NOT EXISTS "ctaLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "durationMinutes" INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS "isBookable" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "ExamType_isBookable_idx" ON "ExamType"("isBookable");

-- ---------------------------------------------------------------------------
-- 6. Booking-spine linkage columns. All nullable / defaulted, so no table
--    rewrite on the large Appointment and OrderItem tables.
--
-- Note "Appointment.testCenterTimeSlotId" is a SEPARATE column from
-- "timeSlotId": the latter is a typed FK to DoctorTimeSlot and the fulfilment
-- path runs doctorTimeSlot.updateMany() over ids drawn from it. A center-slot
-- id there would match zero rows and silently leave a paid order whose slot is
-- never committed.
-- ---------------------------------------------------------------------------
ALTER TABLE "Appointment"
  ADD COLUMN IF NOT EXISTS "examTypeId" TEXT,
  ADD COLUMN IF NOT EXISTS "testCenterId" TEXT,
  ADD COLUMN IF NOT EXISTS "testCenterTimeSlotId" TEXT;

ALTER TABLE "CartItem"
  ADD COLUMN IF NOT EXISTS "examTypeId" TEXT,
  ADD COLUMN IF NOT EXISTS "testCenterId" TEXT,
  ADD COLUMN IF NOT EXISTS "testCenterExamId" TEXT,
  ADD COLUMN IF NOT EXISTS "testCenterTimeSlotId" TEXT;

-- OrderItem already carries "testCenterExamId" (added for LAB_EXAM lines); it
-- is reused verbatim for TEST_BOOKING lines and is intentionally not re-added.
ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "examTypeId" TEXT,
  ADD COLUMN IF NOT EXISTS "testCenterId" TEXT,
  ADD COLUMN IF NOT EXISTS "testCenterTimeSlotId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Appointment_testCenterTimeSlotId_key"
  ON "Appointment"("testCenterTimeSlotId");
CREATE INDEX IF NOT EXISTS "Appointment_testCenterId_scheduledAt_idx"
  ON "Appointment"("testCenterId", "scheduledAt");

CREATE UNIQUE INDEX IF NOT EXISTS "CartItem_testCenterTimeSlotId_key"
  ON "CartItem"("testCenterTimeSlotId");

-- ---------------------------------------------------------------------------
-- 7. Foreign keys (ADD CONSTRAINT has no IF NOT EXISTS).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TestCenterAvailability_testCenterId_fkey') THEN
    ALTER TABLE "TestCenterAvailability" ADD CONSTRAINT "TestCenterAvailability_testCenterId_fkey"
      FOREIGN KEY ("testCenterId") REFERENCES "TestCenter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TestCenterTimeSlot_testCenterId_fkey') THEN
    ALTER TABLE "TestCenterTimeSlot" ADD CONSTRAINT "TestCenterTimeSlot_testCenterId_fkey"
      FOREIGN KEY ("testCenterId") REFERENCES "TestCenter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TestCenterAvailabilityException_testCenterId_fkey') THEN
    ALTER TABLE "TestCenterAvailabilityException" ADD CONSTRAINT "TestCenterAvailabilityException_testCenterId_fkey"
      FOREIGN KEY ("testCenterId") REFERENCES "TestCenter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ExamTypeTranslation_examTypeId_fkey') THEN
    ALTER TABLE "ExamTypeTranslation" ADD CONSTRAINT "ExamTypeTranslation_examTypeId_fkey"
      FOREIGN KEY ("examTypeId") REFERENCES "ExamType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  -- Appointment: SET NULL on delete. A retained clinical record must survive
  -- the removal of a catalogue row or a center.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Appointment_examTypeId_fkey') THEN
    ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_examTypeId_fkey"
      FOREIGN KEY ("examTypeId") REFERENCES "ExamType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Appointment_testCenterId_fkey') THEN
    ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_testCenterId_fkey"
      FOREIGN KEY ("testCenterId") REFERENCES "TestCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Appointment_testCenterTimeSlotId_fkey') THEN
    ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_testCenterTimeSlotId_fkey"
      FOREIGN KEY ("testCenterTimeSlotId") REFERENCES "TestCenterTimeSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
