CREATE TYPE "BirthdayOfferStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'UNKNOWN', 'SKIPPED');
ALTER TYPE "AuditAction" ADD VALUE 'BIRTHDAY_SETTINGS_UPDATED';

CREATE TABLE "BirthdayOffer" (
  "id" TEXT NOT NULL,
  "patientProfileId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "annualAddressKey" TEXT NOT NULL,
  "couponId" TEXT NOT NULL,
  "countryCode" TEXT NOT NULL,
  "timezone" TEXT NOT NULL,
  "status" "BirthdayOfferStatus" NOT NULL DEFAULT 'PENDING',
  "attemptedAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BirthdayOffer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BirthdayOffer_patientProfileId_fkey" FOREIGN KEY ("patientProfileId") REFERENCES "PatientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BirthdayOffer_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "BirthdayOffer_couponId_key" ON "BirthdayOffer"("couponId");
CREATE UNIQUE INDEX "BirthdayOffer_annualAddressKey_key" ON "BirthdayOffer"("annualAddressKey");
CREATE UNIQUE INDEX "BirthdayOffer_patientProfileId_year_key" ON "BirthdayOffer"("patientProfileId", "year");
CREATE INDEX "BirthdayOffer_status_createdAt_idx" ON "BirthdayOffer"("status", "createdAt");
