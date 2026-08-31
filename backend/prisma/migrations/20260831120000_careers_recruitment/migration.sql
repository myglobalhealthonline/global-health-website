-- Careers job publishing and confidential PDF-CV inbox.
-- Additive only. Apply through `prisma migrate deploy`; never against backend/.env from development.

CREATE TYPE "JobListingStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "JobWorkplaceMode" AS ENUM ('REMOTE', 'HYBRID', 'ONSITE');
CREATE TYPE "JobApplicationStatus" AS ENUM ('NEW', 'REVIEWED');

ALTER TYPE "AuditAction" ADD VALUE 'JOB_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'JOB_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'JOB_PUBLISHED';
ALTER TYPE "AuditAction" ADD VALUE 'JOB_ARCHIVED';
ALTER TYPE "AuditAction" ADD VALUE 'JOB_APPLICATION_RECEIVED';
ALTER TYPE "AuditAction" ADD VALUE 'JOB_APPLICATION_LIST_VIEWED';
ALTER TYPE "AuditAction" ADD VALUE 'JOB_APPLICATION_VIEWED';
ALTER TYPE "AuditAction" ADD VALUE 'JOB_APPLICATION_CV_DOWNLOADED';
ALTER TYPE "AuditAction" ADD VALUE 'JOB_APPLICATION_STATUS_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'JOB_APPLICATION_PURGED';

CREATE TABLE "JobListing" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "workplaceMode" "JobWorkplaceMode" NOT NULL,
    "employmentType" TEXT NOT NULL,
    "minimumExperience" TEXT,
    "descriptionHtml" TEXT NOT NULL,
    "status" "JobListingStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "JobListing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JobApplication" (
    "id" TEXT NOT NULL,
    "jobListingId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT,
    "status" "JobApplicationStatus" NOT NULL DEFAULT 'NEW',
    "privacyAcknowledgedAt" TIMESTAMP(3) NOT NULL,
    "privacyNoticeVersion" TEXT NOT NULL,
    "cvStorageKey" TEXT NOT NULL,
    "cvByteSize" INTEGER NOT NULL,
    "cvScannedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "retentionUntil" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JobListing_countryId_locale_slug_key" ON "JobListing"("countryId", "locale", "slug");
CREATE INDEX "JobListing_countryId_locale_status_closesAt_idx" ON "JobListing"("countryId", "locale", "status", "closesAt");
CREATE INDEX "JobListing_updatedAt_idx" ON "JobListing"("updatedAt");
CREATE UNIQUE INDEX "JobApplication_cvStorageKey_key" ON "JobApplication"("cvStorageKey");
CREATE INDEX "JobApplication_jobListingId_submittedAt_idx" ON "JobApplication"("jobListingId", "submittedAt");
CREATE INDEX "JobApplication_retentionUntil_idx" ON "JobApplication"("retentionUntil");

ALTER TABLE "JobListing" ADD CONSTRAINT "JobListing_countryId_fkey"
  FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_jobListingId_fkey"
  FOREIGN KEY ("jobListingId") REFERENCES "JobListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
