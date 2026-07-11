-- Per-(insurance company, service, doctor) doctor payout override.
-- Idempotent DDL (live Railway DB — migrate deploy, never migrate dev).

CREATE TABLE IF NOT EXISTS "ServiceDoctorInsurancePayout" (
    "id" TEXT NOT NULL,
    "insuranceCompanyId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "doctorAmountCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceDoctorInsurancePayout_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ServiceDoctorInsurancePayout_insuranceCompanyId_serviceId_doctorId_key"
  ON "ServiceDoctorInsurancePayout"("insuranceCompanyId", "serviceId", "doctorId");
CREATE INDEX IF NOT EXISTS "ServiceDoctorInsurancePayout_serviceId_doctorId_idx"
  ON "ServiceDoctorInsurancePayout"("serviceId", "doctorId");
CREATE INDEX IF NOT EXISTS "ServiceDoctorInsurancePayout_insuranceCompanyId_idx"
  ON "ServiceDoctorInsurancePayout"("insuranceCompanyId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ServiceDoctorInsurancePayout_insuranceCompanyId_fkey') THEN
    ALTER TABLE "ServiceDoctorInsurancePayout" ADD CONSTRAINT "ServiceDoctorInsurancePayout_insuranceCompanyId_fkey"
      FOREIGN KEY ("insuranceCompanyId") REFERENCES "InsuranceCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ServiceDoctorInsurancePayout_serviceId_fkey') THEN
    ALTER TABLE "ServiceDoctorInsurancePayout" ADD CONSTRAINT "ServiceDoctorInsurancePayout_serviceId_fkey"
      FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ServiceDoctorInsurancePayout_doctorId_fkey') THEN
    ALTER TABLE "ServiceDoctorInsurancePayout" ADD CONSTRAINT "ServiceDoctorInsurancePayout_doctorId_fkey"
      FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
