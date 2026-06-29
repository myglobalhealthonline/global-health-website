-- Per-country professional title + doctor-level FAQ.
-- Written idempotently: statements can re-run safely if a prior partial
-- apply committed some of them (Postgres DDL here is not transactional).

-- 1. Per-country title on the market translation.
ALTER TABLE "DoctorMarketTranslation" ADD COLUMN IF NOT EXISTS "title" TEXT;

-- 2a. Backfill market title from the doctor-level translation (same locale).
UPDATE "DoctorMarketTranslation" dmt
SET "title" = dt."title"
FROM "DoctorCountry" dc
JOIN "DoctorTranslation" dt ON dt."doctorId" = dc."doctorId"
WHERE dmt."doctorCountryId" = dc."id"
  AND dt."locale" = dmt."locale"
  AND dmt."title" IS NULL;

-- 2b. For a market's default-locale row still missing a title, fall back to
--     the base Doctor.title.
UPDATE "DoctorMarketTranslation" dmt
SET "title" = d."title"
FROM "DoctorCountry" dc
JOIN "Doctor" d ON d."id" = dc."doctorId"
JOIN "Country" c ON c."id" = dc."countryId"
WHERE dmt."doctorCountryId" = dc."id"
  AND dmt."locale" = c."defaultLocale"
  AND dmt."title" IS NULL;

-- 3. Doctor-level FAQ table.
CREATE TABLE IF NOT EXISTS "DoctorFaq" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorFaq_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DoctorFaq_doctorId_locale_isActive_idx"
    ON "DoctorFaq"("doctorId", "locale", "isActive");

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'DoctorFaq_doctorId_fkey'
    ) THEN
        ALTER TABLE "DoctorFaq"
            ADD CONSTRAINT "DoctorFaq_doctorId_fkey"
            FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 4. Seed doctor-level FAQ from each doctor's PRIMARY-country market FAQ.
--    Guarded so a re-run never duplicates an already-seeded entry.
INSERT INTO "DoctorFaq" (
    "id", "doctorId", "locale", "question", "answer", "category",
    "sortOrder", "isActive", "createdAt", "updatedAt"
)
SELECT
    concat('dfaq_', substr(md5(dmf."id" || clock_timestamp()::text || random()::text), 1, 20)),
    dc."doctorId",
    dmf."locale",
    dmf."question",
    dmf."answer",
    dmf."category",
    dmf."sortOrder",
    dmf."isActive",
    dmf."createdAt",
    CURRENT_TIMESTAMP
FROM "DoctorMarketFaq" dmf
JOIN "DoctorCountry" dc ON dc."id" = dmf."doctorCountryId"
JOIN "Doctor" d ON d."id" = dc."doctorId"
WHERE dc."countryId" = d."countryId"
  AND NOT EXISTS (
      SELECT 1 FROM "DoctorFaq" existing
      WHERE existing."doctorId" = dc."doctorId"
        AND existing."locale" = dmf."locale"
        AND existing."question" = dmf."question"
  );

-- 5. Drop the per-country FAQ table.
DROP TABLE IF EXISTS "DoctorMarketFaq";
