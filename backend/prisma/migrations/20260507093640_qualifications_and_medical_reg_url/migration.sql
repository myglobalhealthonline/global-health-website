-- AlterTable
ALTER TABLE "Doctor"
ADD COLUMN "medicalRegistrationUrl" TEXT,
ADD COLUMN "qualifications" TEXT[] DEFAULT ARRAY[]::TEXT[];
