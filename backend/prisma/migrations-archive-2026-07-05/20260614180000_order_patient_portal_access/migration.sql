ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "patientPortalSetPasswordUrl" TEXT,
ADD COLUMN IF NOT EXISTS "patientPortalTempPassword" TEXT,
ADD COLUMN IF NOT EXISTS "patientPortalTempPasswordSent" BOOLEAN NOT NULL DEFAULT false;
