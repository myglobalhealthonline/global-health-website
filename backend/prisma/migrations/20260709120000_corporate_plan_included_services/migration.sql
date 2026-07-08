-- CreateEnum
CREATE TYPE "CorporatePlanServiceRole" AS ENUM ('INCLUDED', 'PRE_ASSESSMENT', 'ILLNESS_BENEFIT', 'FIT_FOR_WORK');

-- CreateTable
CREATE TABLE "CorporatePlanService" (
    "id" TEXT NOT NULL,
    "corporatePlanId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "role" "CorporatePlanServiceRole" NOT NULL DEFAULT 'INCLUDED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorporatePlanService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CorporatePlanService_corporatePlanId_serviceId_key" ON "CorporatePlanService"("corporatePlanId", "serviceId");

-- CreateIndex
CREATE INDEX "CorporatePlanService_corporatePlanId_idx" ON "CorporatePlanService"("corporatePlanId");

-- AddForeignKey
ALTER TABLE "CorporatePlanService" ADD CONSTRAINT "CorporatePlanService_corporatePlanId_fkey" FOREIGN KEY ("corporatePlanId") REFERENCES "CorporatePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporatePlanService" ADD CONSTRAINT "CorporatePlanService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
