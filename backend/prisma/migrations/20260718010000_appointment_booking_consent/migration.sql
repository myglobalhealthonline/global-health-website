-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "crossBorderConsentAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "medicalAccessConsentScope" TEXT;

-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "patientCrossBorderConsentAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "patientMedicalAccessConsentScope" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "patientCrossBorderConsentAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "patientMedicalAccessConsentScope" TEXT;
