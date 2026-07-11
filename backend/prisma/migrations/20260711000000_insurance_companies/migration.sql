-- Insurance Companies feature: country-scoped insurance companies + per-service
-- coverage/pricing, plus booking snapshot columns on the charge chain.
-- Idempotent DDL: safe to re-run against the live Railway DB (see CLAUDE.md /
-- db-migration-workflow — `migrate deploy`, never `migrate dev`).

-- CreateEnum (guarded — CREATE TYPE has no IF NOT EXISTS)
DO $$
BEGIN
  CREATE TYPE "InsurancePricingMode" AS ENUM ('FIXED', 'PERCENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "InsuranceCompany" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pricingMode" "InsurancePricingMode" NOT NULL,
    "discountPercent" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceCompany_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "InsuranceServiceCoverage" (
    "id" TEXT NOT NULL,
    "insuranceCompanyId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "overridePriceCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceServiceCoverage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "InsuranceCompany_countryId_name_key" ON "InsuranceCompany"("countryId", "name");
CREATE INDEX IF NOT EXISTS "InsuranceCompany_countryId_isActive_idx" ON "InsuranceCompany"("countryId", "isActive");
CREATE UNIQUE INDEX IF NOT EXISTS "InsuranceServiceCoverage_insuranceCompanyId_serviceId_key" ON "InsuranceServiceCoverage"("insuranceCompanyId", "serviceId");
CREATE INDEX IF NOT EXISTS "InsuranceServiceCoverage_serviceId_idx" ON "InsuranceServiceCoverage"("serviceId");

-- AddColumn: booking snapshot columns on the charge chain
ALTER TABLE "CartItem"    ADD COLUMN IF NOT EXISTS "insuranceCompanyId"    TEXT;
ALTER TABLE "CartItem"    ADD COLUMN IF NOT EXISTS "insurancePolicyNumber" TEXT;
ALTER TABLE "CartItem"    ADD COLUMN IF NOT EXISTS "insurancePriceCents"   INTEGER;
ALTER TABLE "OrderItem"   ADD COLUMN IF NOT EXISTS "insuranceCompanyId"    TEXT;
ALTER TABLE "OrderItem"   ADD COLUMN IF NOT EXISTS "insurancePolicyNumber" TEXT;
ALTER TABLE "OrderItem"   ADD COLUMN IF NOT EXISTS "insurancePriceCents"   INTEGER;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "insuranceCompanyId"    TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "insurancePolicyNumber" TEXT;

-- AddForeignKey (guarded — ADD CONSTRAINT has no IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InsuranceCompany_countryId_fkey') THEN
    ALTER TABLE "InsuranceCompany" ADD CONSTRAINT "InsuranceCompany_countryId_fkey"
      FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InsuranceServiceCoverage_insuranceCompanyId_fkey') THEN
    ALTER TABLE "InsuranceServiceCoverage" ADD CONSTRAINT "InsuranceServiceCoverage_insuranceCompanyId_fkey"
      FOREIGN KEY ("insuranceCompanyId") REFERENCES "InsuranceCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InsuranceServiceCoverage_serviceId_fkey') THEN
    ALTER TABLE "InsuranceServiceCoverage" ADD CONSTRAINT "InsuranceServiceCoverage_serviceId_fkey"
      FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
