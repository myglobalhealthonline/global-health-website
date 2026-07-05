-- Remove the Service <-> Specialty link.
-- Services are now categorised solely by `Service.kind` (GP vs Specialist);
-- the Specialty table stays but only tags doctors (DoctorSpecialty) and drives
-- the public doctor specialty filter. Drops the two cross-table FKs + columns.

-- DropForeignKey (Service -> Specialty)
ALTER TABLE "Service" DROP CONSTRAINT IF EXISTS "Service_specialtyId_fkey";

-- DropForeignKey (Specialty.primaryService -> Service)
ALTER TABLE "Specialty" DROP CONSTRAINT IF EXISTS "Specialty_primaryServiceId_fkey";

-- DropColumn
ALTER TABLE "Service" DROP COLUMN IF EXISTS "specialtyId";

-- DropColumn
ALTER TABLE "Specialty" DROP COLUMN IF EXISTS "primaryServiceId";
