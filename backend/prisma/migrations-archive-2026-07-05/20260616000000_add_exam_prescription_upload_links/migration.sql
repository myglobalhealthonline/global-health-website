-- Per-exam-prescription upload links + QR codes.
-- All additive + nullable (non-destructive).

-- AlterTable
ALTER TABLE "GeneratedDocument" ADD COLUMN     "prescriptionNumber" INTEGER,
ADD COLUMN     "uploadToken" TEXT,
ADD COLUMN     "uploadTokenExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "AppointmentDocument" ADD COLUMN     "sourceGeneratedDocumentId" TEXT;
