-- AlterTable: ServiceDoctor — doctor self-selection metadata
ALTER TABLE "ServiceDoctor" ADD COLUMN IF NOT EXISTS "selectedBy" TEXT NOT NULL DEFAULT 'admin';
ALTER TABLE "ServiceDoctor" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';

-- AlterTable: BookingSetting — optional approval gate for doctor self-selection
ALTER TABLE "BookingSetting" ADD COLUMN IF NOT EXISTS "doctorServiceSelfSelectApproval" BOOLEAN NOT NULL DEFAULT true;

-- Index for admin/doctor portal queries by status
CREATE INDEX IF NOT EXISTS "ServiceDoctor_doctorId_status_idx" ON "ServiceDoctor"("doctorId", "status");
