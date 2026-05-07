ALTER TABLE "Specialty"
ADD COLUMN "cardSummary" TEXT,
ADD COLUMN "cardThemeColor" TEXT,
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "primaryServiceId" TEXT;

ALTER TABLE "Service"
ADD COLUMN "heroTitle" TEXT,
ADD COLUMN "heroDescription" TEXT,
ADD COLUMN "detailBody" TEXT,
ADD COLUMN "ctaLabel" TEXT;

ALTER TABLE "Asset"
ADD COLUMN "specialtyId" TEXT,
ADD COLUMN "serviceId" TEXT;

ALTER TABLE "Specialty"
ADD CONSTRAINT "Specialty_primaryServiceId_fkey"
FOREIGN KEY ("primaryServiceId") REFERENCES "Service"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "Asset"
ADD CONSTRAINT "Asset_specialtyId_fkey"
FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "Asset"
ADD CONSTRAINT "Asset_serviceId_fkey"
FOREIGN KEY ("serviceId") REFERENCES "Service"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
