-- AlterTable
ALTER TABLE "Doctor"
ADD COLUMN "imcRegistration" TEXT,
ADD COLUMN "whatsappNumber" TEXT,
ADD COLUMN "languages" TEXT[] DEFAULT ARRAY[]::TEXT[];
