-- Doctor market profiles. DoctorCountry is the canonical doctor-market row.

-- Asset image SEO fields.
ALTER TABLE "Asset" ADD COLUMN "title" TEXT;
ALTER TABLE "Asset" ADD COLUMN "caption" TEXT;
ALTER TABLE "Asset" ADD COLUMN "description" TEXT;

-- Market-level doctor translations.
CREATE TABLE "DoctorMarketTranslation" (
    "id" TEXT NOT NULL,
    "doctorCountryId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "bio" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoKeywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorMarketTranslation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DoctorMarketTranslation_doctorCountryId_locale_key"
    ON "DoctorMarketTranslation"("doctorCountryId", "locale");

CREATE INDEX "DoctorMarketTranslation_doctorCountryId_idx"
    ON "DoctorMarketTranslation"("doctorCountryId");

ALTER TABLE "DoctorMarketTranslation"
    ADD CONSTRAINT "DoctorMarketTranslation_doctorCountryId_fkey"
    FOREIGN KEY ("doctorCountryId") REFERENCES "DoctorCountry"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Market-level doctor FAQs.
CREATE TABLE "DoctorMarketFaq" (
    "id" TEXT NOT NULL,
    "doctorCountryId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorMarketFaq_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DoctorMarketFaq_doctorCountryId_locale_isActive_idx"
    ON "DoctorMarketFaq"("doctorCountryId", "locale", "isActive");

ALTER TABLE "DoctorMarketFaq"
    ADD CONSTRAINT "DoctorMarketFaq_doctorCountryId_fkey"
    FOREIGN KEY ("doctorCountryId") REFERENCES "DoctorCountry"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Market-level doctor payout account.
CREATE TABLE "DoctorMarketBankAccount" (
    "id" TEXT NOT NULL,
    "doctorCountryId" TEXT NOT NULL,
    "accountHolder" TEXT,
    "ibanEncrypted" TEXT,
    "ibanLast4" TEXT,
    "bic" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorMarketBankAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DoctorMarketBankAccount_doctorCountryId_key"
    ON "DoctorMarketBankAccount"("doctorCountryId");

ALTER TABLE "DoctorMarketBankAccount"
    ADD CONSTRAINT "DoctorMarketBankAccount_doctorCountryId_fkey"
    FOREIGN KEY ("doctorCountryId") REFERENCES "DoctorCountry"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Ensure the primary country also has a DoctorCountry row. Existing code
-- already writes some primary registration rows, so this only fills gaps.
INSERT INTO "DoctorCountry" ("id", "doctorId", "countryId", "active", "sortOrder", "createdAt")
SELECT
    concat('dc_', substr(md5(d."id" || d."countryId" || clock_timestamp()::text || random()::text), 1, 22)),
    d."id",
    d."countryId",
    true,
    0,
    CURRENT_TIMESTAMP
FROM "Doctor" d
LEFT JOIN "DoctorCountry" dc
    ON dc."doctorId" = d."id" AND dc."countryId" = d."countryId"
WHERE dc."id" IS NULL;

UPDATE "DoctorCountry" dc
SET "active" = true
WHERE EXISTS (
    SELECT 1
    FROM "Doctor" d
    WHERE d."id" = dc."doctorId"
      AND d."countryId" = dc."countryId"
);

-- Seed market translations from existing global doctor translations.
INSERT INTO "DoctorMarketTranslation" (
    "id",
    "doctorCountryId",
    "locale",
    "bio",
    "seoTitle",
    "seoDescription",
    "seoKeywords",
    "createdAt",
    "updatedAt"
)
SELECT
    concat('dcmt_', substr(md5(dc."id" || dt."locale"::text || clock_timestamp()::text || random()::text), 1, 20)),
    dc."id",
    dt."locale",
    dt."bio",
    dt."seoTitle",
    dt."seoDescription",
    ARRAY[]::TEXT[],
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "DoctorCountry" dc
JOIN "DoctorTranslation" dt ON dt."doctorId" = dc."doctorId"
WHERE dc."active" = true
ON CONFLICT ("doctorCountryId", "locale") DO NOTHING;

-- Seed default-locale market translations from the base Doctor row when
-- no DoctorTranslation exists for that locale.
INSERT INTO "DoctorMarketTranslation" (
    "id",
    "doctorCountryId",
    "locale",
    "bio",
    "seoTitle",
    "seoDescription",
    "seoKeywords",
    "createdAt",
    "updatedAt"
)
SELECT
    concat('dcmt_', substr(md5(dc."id" || c."defaultLocale"::text || clock_timestamp()::text || random()::text), 1, 20)),
    dc."id",
    c."defaultLocale",
    d."bio",
    d."seoTitle",
    d."seoDescription",
    ARRAY[]::TEXT[],
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "DoctorCountry" dc
JOIN "Doctor" d ON d."id" = dc."doctorId"
JOIN "Country" c ON c."id" = dc."countryId"
WHERE dc."active" = true
ON CONFLICT ("doctorCountryId", "locale") DO NOTHING;

-- Copy legacy global bank details into the doctor's primary market bank row.
INSERT INTO "DoctorMarketBankAccount" (
    "id",
    "doctorCountryId",
    "accountHolder",
    "ibanEncrypted",
    "ibanLast4",
    "bic",
    "createdAt",
    "updatedAt"
)
SELECT
    concat('dcmb_', substr(md5(dc."id" || dba."id" || clock_timestamp()::text || random()::text), 1, 20)),
    dc."id",
    dba."accountHolder",
    dba."ibanEncrypted",
    dba."ibanLast4",
    dba."bic",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "DoctorBankAccount" dba
JOIN "Doctor" d ON d."id" = dba."doctorId"
JOIN "DoctorCountry" dc
    ON dc."doctorId" = d."id" AND dc."countryId" = d."countryId"
ON CONFLICT ("doctorCountryId") DO NOTHING;
