-- Doctor dashboard Postgres replication (legacy parity)

-- CreateEnum
CREATE TYPE "GeneratedDocumentType" AS ENUM ('ABSENCE_CERTIFICATE', 'EXAMS_PRESCRIPTION', 'PRESCRIPTION');
CREATE TYPE "BrazilConsentPaymentStatus" AS ENUM ('PENDING', 'PAID');

-- AlterEnum
ALTER TYPE "ShareLinkScope" ADD VALUE 'PATIENT_UPLOAD';

-- AlterTable Appointment
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "finalized" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "notesUploaded" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "filesUploaded" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "manualEntry" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "pharmacy" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "symptoms" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "formResponses" JSONB;

-- CreateTable PatientProfile
CREATE TABLE IF NOT EXISTS "PatientProfile" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "fullName" TEXT,
    "phone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "weightKg" DOUBLE PRECISION,
    "heightM" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "bloodType" TEXT,
    "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "chronicDiseases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "familyHistory" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "socialHabits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "surgeries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "medicalNotes" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PatientProfile_email_key" ON "PatientProfile"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "PatientProfile_userId_key" ON "PatientProfile"("userId");

ALTER TABLE "PatientProfile" DROP CONSTRAINT IF EXISTS "PatientProfile_userId_fkey";
ALTER TABLE "PatientProfile" ADD CONSTRAINT "PatientProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable GeneratedDocument
CREATE TABLE IF NOT EXISTS "GeneratedDocument" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "patientEmail" TEXT NOT NULL,
    "documentType" "GeneratedDocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sentToPatient" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "GeneratedDocument_appointmentId_documentType_idx" ON "GeneratedDocument"("appointmentId", "documentType");
CREATE INDEX IF NOT EXISTS "GeneratedDocument_appointmentId_sentToPatient_idx" ON "GeneratedDocument"("appointmentId", "sentToPatient");

ALTER TABLE "GeneratedDocument" DROP CONSTRAINT IF EXISTS "GeneratedDocument_appointmentId_fkey";
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GeneratedDocument" DROP CONSTRAINT IF EXISTS "GeneratedDocument_doctorId_fkey";
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable BrazilConsentSubmission
CREATE TABLE IF NOT EXISTS "BrazilConsentSubmission" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "fullName" TEXT,
    "dob" TEXT,
    "address" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "pharmacy" TEXT,
    "message" TEXT NOT NULL DEFAULT '',
    "gdprConsent" BOOLEAN NOT NULL DEFAULT true,
    "stripeSessionId" TEXT,
    "paymentStatus" "BrazilConsentPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrazilConsentSubmission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BrazilConsentSubmission_appointmentId_idx" ON "BrazilConsentSubmission"("appointmentId");

ALTER TABLE "BrazilConsentSubmission" DROP CONSTRAINT IF EXISTS "BrazilConsentSubmission_appointmentId_fkey";
ALTER TABLE "BrazilConsentSubmission" ADD CONSTRAINT "BrazilConsentSubmission_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable ReviewInvite
CREATE TABLE IF NOT EXISTS "ReviewInvite" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "appointmentId" TEXT,
    "orderNumber" TEXT,
    "customerName" TEXT,
    "serviceName" TEXT,
    "doctorName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "localeCode" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "overallSatisfaction" INTEGER,
    "doctorProfessionalism" INTEGER,
    "communicationClarity" INTEGER,
    "timelinessOfService" INTEGER,
    "valueForMoney" INTEGER,
    "likeliness" INTEGER,
    "bookingExperience" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReviewInvite_token_key" ON "ReviewInvite"("token");
CREATE INDEX IF NOT EXISTS "ReviewInvite_appointmentId_idx" ON "ReviewInvite"("appointmentId");

ALTER TABLE "ReviewInvite" DROP CONSTRAINT IF EXISTS "ReviewInvite_appointmentId_fkey";
ALTER TABLE "ReviewInvite" ADD CONSTRAINT "ReviewInvite_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
