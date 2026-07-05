-- AlterTable
ALTER TABLE "ServicePeakPricing" ALTER COLUMN "peakStartMinute" DROP NOT NULL,
ALTER COLUMN "peakEndMinute" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ServicePeakWindow" (
    "id" TEXT NOT NULL,
    "pricingId" TEXT NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServicePeakWindow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServicePeakWindow_pricingId_idx" ON "ServicePeakWindow"("pricingId");

-- AddForeignKey
ALTER TABLE "ServicePeakWindow" ADD CONSTRAINT "ServicePeakWindow_pricingId_fkey" FOREIGN KEY ("pricingId") REFERENCES "ServicePeakPricing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: migrate each existing single window into a ServicePeakWindow row.
INSERT INTO "ServicePeakWindow" ("id", "pricingId", "startMinute", "endMinute", "sortOrder")
SELECT gen_random_uuid()::text, "id", "peakStartMinute", "peakEndMinute", 0
FROM "ServicePeakPricing"
WHERE "peakStartMinute" IS NOT NULL AND "peakEndMinute" IS NOT NULL;
