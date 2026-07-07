-- Add usual medication list + arterial (blood) pressure to PatientProfile.
ALTER TABLE "PatientProfile"
  ADD COLUMN "usualMedication" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "bloodPressureSystolic" INTEGER,
  ADD COLUMN "bloodPressureDiastolic" INTEGER;
