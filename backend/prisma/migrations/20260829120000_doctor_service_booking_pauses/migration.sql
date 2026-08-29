ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'BOOKING_PAUSE_SET';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'BOOKING_PAUSE_CLEARED';

ALTER TABLE "Doctor"
  ADD COLUMN "bookingPausedFrom" TIMESTAMP(3),
  ADD COLUMN "bookingPausedUntil" TIMESTAMP(3),
  ADD COLUMN "bookingPauseReason" TEXT;

ALTER TABLE "Service"
  ADD COLUMN "bookingPausedFrom" TIMESTAMP(3),
  ADD COLUMN "bookingPausedUntil" TIMESTAMP(3),
  ADD COLUMN "bookingPauseReason" TEXT;

ALTER TABLE "Doctor"
  ADD CONSTRAINT "Doctor_booking_pause_valid"
  CHECK (
    ("bookingPausedFrom" IS NULL AND "bookingPausedUntil" IS NULL)
    OR
    (
      "bookingPausedFrom" IS NOT NULL
      AND (
        "bookingPausedUntil" IS NULL
        OR "bookingPausedFrom" < "bookingPausedUntil"
      )
    )
  );

ALTER TABLE "Service"
  ADD CONSTRAINT "Service_booking_pause_valid"
  CHECK (
    ("bookingPausedFrom" IS NULL AND "bookingPausedUntil" IS NULL)
    OR
    (
      "bookingPausedFrom" IS NOT NULL
      AND (
        "bookingPausedUntil" IS NULL
        OR "bookingPausedFrom" < "bookingPausedUntil"
      )
    )
  );

CREATE INDEX "Doctor_bookingPausedFrom_bookingPausedUntil_idx"
  ON "Doctor"("bookingPausedFrom", "bookingPausedUntil");

CREATE INDEX "Service_bookingPausedFrom_bookingPausedUntil_idx"
  ON "Service"("bookingPausedFrom", "bookingPausedUntil");
