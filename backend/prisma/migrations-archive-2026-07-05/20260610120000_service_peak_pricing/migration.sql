-- CreateTable
CREATE TABLE "ServicePeakPricing" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "peakStartMinute" INTEGER NOT NULL,
    "peakEndMinute" INTEGER NOT NULL,
    "peakPriceCents" INTEGER NOT NULL,
    "offPeakPriceCents" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicePeakPricing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServicePeakPricing_serviceId_key" ON "ServicePeakPricing"("serviceId");

-- AddForeignKey
ALTER TABLE "ServicePeakPricing" ADD CONSTRAINT "ServicePeakPricing_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
