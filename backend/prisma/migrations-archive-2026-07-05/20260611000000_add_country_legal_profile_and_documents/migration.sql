-- CreateEnum
CREATE TYPE "LegalDocumentType" AS ENUM ('TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'COOKIE_POLICY', 'GDPR_NOTICE', 'DATA_PROCESSING_AGREEMENT', 'REFUND_POLICY', 'MEDICAL_DISCLAIMER', 'ACCESSIBILITY_STATEMENT');

-- CreateTable
CREATE TABLE "CountryLegalProfile" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "legalCompanyName" TEXT,
    "legalAddress" TEXT,
    "publicPhones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "publicEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "supportEmail" TEXT,
    "billingEmail" TEXT,
    "companyRegistrationNumber" TEXT,
    "taxVatNumber" TEXT,
    "medicalRegistrationNumber" TEXT,
    "healthcareLicenseDetails" TEXT,
    "regulatorName" TEXT,
    "regulatorWebsite" TEXT,
    "companyRegistryUrl" TEXT,
    "medicalRegulatorUrl" TEXT,
    "healthcareAuthorityUrl" TEXT,
    "dataProtectionAuthorityUrl" TEXT,
    "disputeResolutionUrl" TEXT,
    "consumerProtectionUrl" TEXT,
    "dataProtectionLawName" TEXT DEFAULT 'GDPR',
    "dataProtectionPolicyTitle" TEXT,
    "dpoName" TEXT,
    "dpoEmail" TEXT,
    "disputeBodyName" TEXT,
    "disputeEmail" TEXT,
    "disputePhone" TEXT,
    "disputeProcessText" TEXT,
    "legalJurisdictionText" TEXT,
    "consumerRightsText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountryLegalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountryLegalDocument" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "type" "LegalDocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "pdfPath" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "locale" TEXT NOT NULL DEFAULT 'en',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountryLegalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CountryLegalProfile_countryId_key" ON "CountryLegalProfile"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "CountryLegalDocument_countryId_type_locale_key" ON "CountryLegalDocument"("countryId", "type", "locale");

-- AddForeignKey
ALTER TABLE "CountryLegalProfile" ADD CONSTRAINT "CountryLegalProfile_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryLegalDocument" ADD CONSTRAINT "CountryLegalDocument_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "MedicalAccessGrant_patientProfileId_grantedToUserId_expiresAt_i" RENAME TO "MedicalAccessGrant_patientProfileId_grantedToUserId_expires_idx";
