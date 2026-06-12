-- CreateEnum
CREATE TYPE "AuthorityCategory" AS ENUM ('MEDICAL_REGULATOR', 'DOCTOR_REGISTRY', 'HEALTH_AUTHORITY', 'DATA_PROTECTION', 'MEDICINES', 'PROFESSIONAL_BODY', 'CONSUMER_PROTECTION', 'MENTAL_HEALTH', 'COMPLAINTS', 'EMERGENCY', 'OTHER');

-- AlterTable
ALTER TABLE "BlogPost" ADD COLUMN     "authorDoctorId" TEXT,
ADD COLUMN     "reviewerDoctorId" TEXT;

-- AlterTable
ALTER TABLE "CountryLegalProfile" ADD COLUMN     "emergencyNotice" TEXT,
ADD COLUMN     "emergencyNumber" TEXT DEFAULT '112',
ADD COLUMN     "nonEmergencyHealthLine" TEXT,
ADD COLUMN     "providerRegistrationLabel" TEXT,
ADD COLUMN     "providerRegistrationNumber" TEXT,
ADD COLUMN     "providerRegistrationUrl" TEXT;

-- AlterTable
ALTER TABLE "DoctorCountry" ADD COLUMN     "division" TEXT;

-- CreateTable
CREATE TABLE "DoctorCredential" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "countryCode" TEXT,
    "label" TEXT NOT NULL,
    "bodyName" TEXT NOT NULL,
    "bodyUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountryAuthorityLink" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT,
    "url" TEXT NOT NULL,
    "category" "AuthorityCategory" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "showInFooter" BOOLEAN NOT NULL DEFAULT false,
    "showInSchema" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountryAuthorityLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DoctorCredential_doctorId_idx" ON "DoctorCredential"("doctorId");

-- CreateIndex
CREATE INDEX "CountryAuthorityLink_countryId_isActive_idx" ON "CountryAuthorityLink"("countryId", "isActive");

-- AddForeignKey
ALTER TABLE "DoctorCredential" ADD CONSTRAINT "DoctorCredential_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_authorDoctorId_fkey" FOREIGN KEY ("authorDoctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_reviewerDoctorId_fkey" FOREIGN KEY ("reviewerDoctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryAuthorityLink" ADD CONSTRAINT "CountryAuthorityLink_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;
