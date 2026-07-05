-- CreateTable: per-country footer content edited from /admin/footer
-- (The audit-action enum value used by the admin route was added in a
--  follow-up migration `20260528010000_country_footer_audit_action`.)
CREATE TABLE "CountryFooter" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "tagline" TEXT,
    "contactAddress" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "contactHours" TEXT,
    "instagramUrl" TEXT,
    "facebookUrl" TEXT,
    "linkedinUrl" TEXT,
    "twitterUrl" TEXT,
    "youtubeUrl" TEXT,
    "customColumns" JSONB NOT NULL DEFAULT '[]',
    "copyrightLine" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountryFooter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: one footer row per country
CREATE UNIQUE INDEX "CountryFooter_countryId_key" ON "CountryFooter"("countryId");

-- AddForeignKey
ALTER TABLE "CountryFooter"
  ADD CONSTRAINT "CountryFooter_countryId_fkey"
  FOREIGN KEY ("countryId") REFERENCES "Country"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
