-- Same-day GP quick-book: timeslot-first homepage flow with auto-assigned GP.
-- All changes are additive (new enum value, one nullable column, one new
-- table), so existing rows + bookings stay valid.

-- New audit action for the admin GP-settings form (same-day service +
-- priority doctor, both stored in the Setting key/value table).
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'GP_SETTINGS_UPDATED';

-- Why a doctor was auto-assigned by the same-day flow: PRIORITY_24H, ROTATION,
-- or ONLY_AVAILABLE. Null for manual / doctor-first bookings.
ALTER TABLE "Appointment" ADD COLUMN "assignmentReason" TEXT;

-- Audit trail for the auto-assignment, keyed by the resolved slot so the
-- post-payment Appointment can back-fill language + reason.
CREATE TABLE "GpAssignmentLog" (
    "id" TEXT NOT NULL,
    "timeSlotId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GpAssignmentLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GpAssignmentLog_timeSlotId_key" ON "GpAssignmentLog"("timeSlotId");
CREATE INDEX "GpAssignmentLog_countryCode_createdAt_idx" ON "GpAssignmentLog"("countryCode", "createdAt");
CREATE INDEX "GpAssignmentLog_doctorId_createdAt_idx" ON "GpAssignmentLog"("doctorId", "createdAt");
