-- Medical disclaimers on CountryLegalProfile.
-- Two reusable, single-locale copies edited per country in the admin legal
-- profile: `shortDisclaimer` (condensed, for service pages / GP listing /
-- booking consent / doctor profiles) and `fullDisclaimer` (long-form, for the
-- standalone /legal page and the footer link). Additive + nullable, so existing
-- rows stay valid.
ALTER TABLE "CountryLegalProfile" ADD COLUMN "shortDisclaimer" TEXT;
ALTER TABLE "CountryLegalProfile" ADD COLUMN "fullDisclaimer" TEXT;

-- Per-locale overrides of the two disclaimer fields. Base columns above hold
-- the default-locale copy + fallback; one row here per (legal profile, locale)
-- for non-default locales. Mirrors ServiceTranslation.
CREATE TABLE "CountryDisclaimerTranslation" (
    "id" TEXT NOT NULL,
    "legalProfileId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "shortDisclaimer" TEXT,
    "fullDisclaimer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CountryDisclaimerTranslation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CountryDisclaimerTranslation_legalProfileId_locale_key"
    ON "CountryDisclaimerTranslation"("legalProfileId", "locale");

CREATE INDEX "CountryDisclaimerTranslation_legalProfileId_idx"
    ON "CountryDisclaimerTranslation"("legalProfileId");

ALTER TABLE "CountryDisclaimerTranslation"
    ADD CONSTRAINT "CountryDisclaimerTranslation_legalProfileId_fkey"
    FOREIGN KEY ("legalProfileId") REFERENCES "CountryLegalProfile"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
