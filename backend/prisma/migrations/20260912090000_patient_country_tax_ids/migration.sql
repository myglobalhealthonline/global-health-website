-- Per-country fiscal / tax identifiers for a patient.
--
-- A patient consulting in two markets holds two numbers (IE PPS + PT NIF,
-- PT NIF + BR CPF, ...). `PatientProfile.taxIdNumber` is one column and stays
-- the home-country value; rows here are the per-market ones, and the document
-- issued in a market prints the row for THAT market.
--
-- `countryCode` is normalized upstream (uppercase, SP→ES, RM→RO) so one market
-- can never split into two rows. `taxIdNumber` carries the same `phi:v1:`
-- AES-256-GCM envelope as the PatientProfile government-ID columns.
--
-- Idempotent: safe to re-apply via `prisma migrate deploy`.

CREATE TABLE IF NOT EXISTS "PatientCountryTaxId" (
  "id" TEXT NOT NULL,
  "patientProfileId" TEXT NOT NULL,
  "countryCode" TEXT NOT NULL,
  "taxIdNumber" TEXT NOT NULL,
  "updatedByDoctorId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PatientCountryTaxId_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PatientCountryTaxId_patientProfileId_countryCode_key"
  ON "PatientCountryTaxId" ("patientProfileId", "countryCode");

CREATE INDEX IF NOT EXISTS "PatientCountryTaxId_patientProfileId_idx"
  ON "PatientCountryTaxId" ("patientProfileId");

DO $$
BEGIN
  ALTER TABLE "PatientCountryTaxId"
    ADD CONSTRAINT "PatientCountryTaxId_patientProfileId_fkey"
    FOREIGN KEY ("patientProfileId") REFERENCES "PatientProfile"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
