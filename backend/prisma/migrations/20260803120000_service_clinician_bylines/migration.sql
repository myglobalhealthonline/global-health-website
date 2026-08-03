-- AlterTable
-- Service clinician bylines (SEO audit 3.3) — mirrors BlogPost's
-- authorDisplayName/reviewerDisplayName/authorDoctorId/reviewerDoctorId
-- shape (see BlogPost's 0_init migration for the precedent). Ships
-- additive/nullable-only: no backfill, no default doctor assignment.
ALTER TABLE "Service" ADD COLUMN     "authorDisplayName" TEXT,
ADD COLUMN     "reviewerDisplayName" TEXT,
ADD COLUMN     "authorDoctorId" TEXT,
ADD COLUMN     "reviewerDoctorId" TEXT;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_authorDoctorId_fkey" FOREIGN KEY ("authorDoctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_reviewerDoctorId_fkey" FOREIGN KEY ("reviewerDoctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
