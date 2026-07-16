-- CreateTable
CREATE TABLE "CountryFooterTranslation" (
    "id" TEXT NOT NULL,
    "countryFooterId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "tagline" TEXT,
    "contactHours" TEXT,
    "customColumns" JSONB,
    "copyrightLine" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountryFooterTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CountryFooterTranslation_countryFooterId_idx" ON "CountryFooterTranslation"("countryFooterId");

-- CreateIndex
CREATE UNIQUE INDEX "CountryFooterTranslation_countryFooterId_locale_key" ON "CountryFooterTranslation"("countryFooterId", "locale");

-- AddForeignKey
ALTER TABLE "CountryFooterTranslation" ADD CONSTRAINT "CountryFooterTranslation_countryFooterId_fkey" FOREIGN KEY ("countryFooterId") REFERENCES "CountryFooter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "CountryAuthorityLinkTranslation" (
    "id" TEXT NOT NULL,
    "countryAuthorityLinkId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountryAuthorityLinkTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CountryAuthorityLinkTranslation_countryAuthorityLinkId_idx" ON "CountryAuthorityLinkTranslation"("countryAuthorityLinkId");

-- CreateIndex
CREATE UNIQUE INDEX "CountryAuthorityLinkTranslation_countryAuthorityLinkId_locale_key" ON "CountryAuthorityLinkTranslation"("countryAuthorityLinkId", "locale");

-- AddForeignKey
ALTER TABLE "CountryAuthorityLinkTranslation" ADD CONSTRAINT "CountryAuthorityLinkTranslation_countryAuthorityLinkId_fkey" FOREIGN KEY ("countryAuthorityLinkId") REFERENCES "CountryAuthorityLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "CountryLegalProfileTrustTranslation" (
    "id" TEXT NOT NULL,
    "legalProfileId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "regulatorName" TEXT,
    "providerRegistrationLabel" TEXT,
    "emergencyNotice" TEXT,
    "dataProtectionLawName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountryLegalProfileTrustTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CountryLegalProfileTrustTranslation_legalProfileId_idx" ON "CountryLegalProfileTrustTranslation"("legalProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "CountryLegalProfileTrustTranslation_legalProfileId_locale_key" ON "CountryLegalProfileTrustTranslation"("legalProfileId", "locale");

-- AddForeignKey
ALTER TABLE "CountryLegalProfileTrustTranslation" ADD CONSTRAINT "CountryLegalProfileTrustTranslation_legalProfileId_fkey" FOREIGN KEY ("legalProfileId") REFERENCES "CountryLegalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
