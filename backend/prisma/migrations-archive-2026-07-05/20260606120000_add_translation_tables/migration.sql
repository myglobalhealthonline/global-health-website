-- Multilingual CMS: per-locale translation tables for Service, Specialty,
-- HealthTest. The base tables keep their display columns as the
-- default-locale copy + final fallback (phased, non-breaking). A
-- translation row overrides the display fields for a given locale.
-- Operational fields (id, price, currency, slug, stock, doctors, booking
-- settings) are NOT duplicated here. Run `prisma migrate deploy` on prod;
-- on a dev/staging DB already advanced via `prisma db push`, run
-- `prisma migrate resolve --applied 20260606120000_add_translation_tables`.

-- CreateTable
CREATE TABLE "ServiceTranslation" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "heroTitle" TEXT,
    "heroDescription" TEXT,
    "detailBody" TEXT,
    "ctaLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecialtyTranslation" (
    "id" TEXT NOT NULL,
    "specialtyId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "name" TEXT NOT NULL,
    "cardSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecialtyTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthTestTranslation" (
    "id" TEXT NOT NULL,
    "healthTestId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "title" TEXT NOT NULL,
    "shortDescription" TEXT,
    "sampleType" TEXT,
    "resultsTimeline" TEXT,
    "heroButtonLabel" TEXT,
    "detailIntro" TEXT,
    "whatThisTestCovers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "whyGetTested" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "extraSections" JSONB,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthTestTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceTranslation_serviceId_idx" ON "ServiceTranslation"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceTranslation_serviceId_locale_key" ON "ServiceTranslation"("serviceId", "locale");

-- CreateIndex
CREATE INDEX "SpecialtyTranslation_specialtyId_idx" ON "SpecialtyTranslation"("specialtyId");

-- CreateIndex
CREATE UNIQUE INDEX "SpecialtyTranslation_specialtyId_locale_key" ON "SpecialtyTranslation"("specialtyId", "locale");

-- CreateIndex
CREATE INDEX "HealthTestTranslation_healthTestId_idx" ON "HealthTestTranslation"("healthTestId");

-- CreateIndex
CREATE UNIQUE INDEX "HealthTestTranslation_healthTestId_locale_key" ON "HealthTestTranslation"("healthTestId", "locale");

-- AddForeignKey
ALTER TABLE "ServiceTranslation" ADD CONSTRAINT "ServiceTranslation_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecialtyTranslation" ADD CONSTRAINT "SpecialtyTranslation_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthTestTranslation" ADD CONSTRAINT "HealthTestTranslation_healthTestId_fkey" FOREIGN KEY ("healthTestId") REFERENCES "HealthTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
