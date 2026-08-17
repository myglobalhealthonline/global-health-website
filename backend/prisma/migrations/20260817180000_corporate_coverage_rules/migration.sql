-- Corporate plan coverage rules: included / co-pay / discount, annual limits,
-- and the plan-matrix display fields. Additive only — every existing rule keeps
-- its DISCOUNT behaviour because that is the enum default.

-- CreateEnum
CREATE TYPE "CorporateCoverage" AS ENUM ('INCLUDED', 'COPAY', 'DISCOUNT');

-- AlterTable
ALTER TABLE "CorporatePlan"
  ADD COLUMN "tier" TEXT,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "priceNote" TEXT;

-- AlterTable
ALTER TABLE "CorporateBenefitRule"
  ADD COLUMN "coverage" "CorporateCoverage" NOT NULL DEFAULT 'DISCOUNT',
  ADD COLUMN "copayCents" INTEGER,
  ADD COLUMN "annualLimit" INTEGER,
  ADD COLUMN "limitGroup" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "corporateBenefitRuleId" TEXT;

-- CreateIndex
CREATE INDEX "OrderItem_corporateBenefitRuleId_idx" ON "OrderItem"("corporateBenefitRuleId");
