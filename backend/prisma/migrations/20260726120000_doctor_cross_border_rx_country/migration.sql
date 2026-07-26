-- Per-(doctor, country) cross-border prescriber config. A prescriber who works
-- in more than one country now sets a price + payout per country; the picker
-- only offers them for a country whose row has both set.
--
-- Migrates the old single Doctor.crossBorderRx{Price,Payout}Cents into a row for
-- the doctor's PRIMARY country so existing setups keep working.
--
-- Idempotent: safe to re-apply via `prisma migrate deploy`.

CREATE TABLE IF NOT EXISTS "DoctorCrossBorderRxCountry" (
  "id"          TEXT NOT NULL,
  "doctorId"    TEXT NOT NULL,
  "countryId"   TEXT NOT NULL,
  "priceCents"  INTEGER,
  "payoutCents" INTEGER,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DoctorCrossBorderRxCountry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DoctorCrossBorderRxCountry_doctorId_countryId_key"
  ON "DoctorCrossBorderRxCountry" ("doctorId", "countryId");
CREATE INDEX IF NOT EXISTS "DoctorCrossBorderRxCountry_countryId_idx"
  ON "DoctorCrossBorderRxCountry" ("countryId");
CREATE INDEX IF NOT EXISTS "DoctorCrossBorderRxCountry_doctorId_idx"
  ON "DoctorCrossBorderRxCountry" ("doctorId");

-- Back-fill from the legacy single-market columns into the primary country.
-- gen_random_uuid() needs pgcrypto; it's already available on this DB (used by
-- other tables), but guard just in case.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO "DoctorCrossBorderRxCountry" ("id", "doctorId", "countryId", "priceCents", "payoutCents", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  d."id",
  d."countryId",
  d."crossBorderRxPriceCents",
  d."crossBorderRxPayoutCents",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Doctor" d
WHERE d."crossBorderRxEnabled" = true
  AND (d."crossBorderRxPriceCents" IS NOT NULL OR d."crossBorderRxPayoutCents" IS NOT NULL)
ON CONFLICT ("doctorId", "countryId") DO NOTHING;
