-- Test Centers / Exam Clinics feature: a global exam-type catalogue
-- (ExamType), country-scoped physical centers (TestCenter), and the join row
-- holding each center's offered exam + pricing (TestCenterExam).
-- Idempotent DDL: safe to re-run against the live Railway DB (see CLAUDE.md /
-- db-migration-workflow — `migrate deploy`, never `migrate dev`).
-- Reuses the existing "InsurancePricingMode" enum (FIXED | PERCENT).

-- CreateTable
CREATE TABLE IF NOT EXISTS "ExamType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TestCenter" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "addressLine" TEXT,
    "city" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestCenter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TestCenterExam" (
    "id" TEXT NOT NULL,
    "testCenterId" TEXT NOT NULL,
    "examTypeId" TEXT NOT NULL,
    "costCents" INTEGER NOT NULL,
    "markupMode" "InsurancePricingMode" NOT NULL,
    "markupValue" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestCenterExam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ExamType_slug_key" ON "ExamType"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "TestCenter_countryId_slug_key" ON "TestCenter"("countryId", "slug");
CREATE INDEX IF NOT EXISTS "TestCenter_countryId_isActive_idx" ON "TestCenter"("countryId", "isActive");
CREATE UNIQUE INDEX IF NOT EXISTS "TestCenterExam_testCenterId_examTypeId_key" ON "TestCenterExam"("testCenterId", "examTypeId");
CREATE INDEX IF NOT EXISTS "TestCenterExam_examTypeId_idx" ON "TestCenterExam"("examTypeId");

-- AddForeignKey (guarded — ADD CONSTRAINT has no IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TestCenter_countryId_fkey') THEN
    ALTER TABLE "TestCenter" ADD CONSTRAINT "TestCenter_countryId_fkey"
      FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TestCenterExam_testCenterId_fkey') THEN
    ALTER TABLE "TestCenterExam" ADD CONSTRAINT "TestCenterExam_testCenterId_fkey"
      FOREIGN KEY ("testCenterId") REFERENCES "TestCenter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TestCenterExam_examTypeId_fkey') THEN
    ALTER TABLE "TestCenterExam" ADD CONSTRAINT "TestCenterExam_examTypeId_fkey"
      FOREIGN KEY ("examTypeId") REFERENCES "ExamType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;
