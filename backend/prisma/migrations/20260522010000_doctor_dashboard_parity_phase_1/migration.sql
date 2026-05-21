-- Doctor Dashboard parity phase 1: closes Mongo→Prisma gaps for
-- doctor registrations, patient identity / address / alerts / plan,
-- in-person clinic links, booking-form ID toggle, login audit and
-- the OTHER generated document type. All changes are additive — no
-- DROP COLUMN, no NOT NULL retrofits on existing rows.

-- AlterEnum: AuditAction — login lifecycle + clinical-alert mutations
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LOGIN';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LOGOUT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LOGIN_FAILED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PATIENT_ALERT_UPDATED';

-- AlterEnum: GeneratedDocumentType — open-ended OTHER type with customLabel
ALTER TYPE "GeneratedDocumentType" ADD VALUE IF NOT EXISTS 'OTHER';

-- AlterTable: Doctor — per-doctor manual-entry permission
ALTER TABLE "Doctor"
  ADD COLUMN "canCreateManualAppointments" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: DoctorCountry — per-market medical registration on the existing M:N link
ALTER TABLE "DoctorCountry"
  ADD COLUMN "chamberEntity"      TEXT,
  ADD COLUMN "registrationNumber" TEXT,
  ADD COLUMN "isVerified"         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "verifiedAt"         TIMESTAMP(3);

CREATE INDEX "DoctorCountry_countryId_isVerified_idx"
  ON "DoctorCountry"("countryId", "isVerified");

-- AlterTable: PatientProfile — identity, address, alerts, plan, pharmacy
ALTER TABLE "PatientProfile"
  ADD COLUMN "nationalIdNumber"   TEXT,
  ADD COLUMN "taxIdNumber"        TEXT,
  ADD COLUMN "passportNumber"     TEXT,
  ADD COLUMN "addressLine1"       TEXT,
  ADD COLUMN "addressLine2"       TEXT,
  ADD COLUMN "addressCity"        TEXT,
  ADD COLUMN "addressPostalCode"  TEXT,
  ADD COLUMN "addressCountryCode" TEXT,
  ADD COLUMN "preferredPharmacy"  TEXT,
  ADD COLUMN "statusAlert"        TEXT,
  ADD COLUMN "clinicAlert"        TEXT,
  ADD COLUMN "pricingPlanId"      TEXT;

ALTER TABLE "PatientProfile"
  ADD CONSTRAINT "PatientProfile_pricingPlanId_fkey"
  FOREIGN KEY ("pricingPlanId") REFERENCES "PricingPlan"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "PatientProfile_pricingPlanId_idx"
  ON "PatientProfile"("pricingPlanId");

-- AlterTable: Appointment — soft FK to Clinic + free-text override for IN_PERSON
ALTER TABLE "Appointment"
  ADD COLUMN "clinicId"        TEXT,
  ADD COLUMN "locationAddress" TEXT;

ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Appointment_clinicId_idx"
  ON "Appointment"("clinicId");

-- AlterTable: BookingSetting — per-country toggle to require national ID at booking
ALTER TABLE "BookingSetting"
  ADD COLUMN "requireNationalId" BOOLEAN NOT NULL DEFAULT false;
