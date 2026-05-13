CREATE TABLE "HealthTest" (
  "id" TEXT NOT NULL,
  "countryId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "shortDescription" TEXT,
  "priceCents" INTEGER NOT NULL,
  "currencyCode" TEXT NOT NULL,
  "productImagePath" TEXT NOT NULL,
  "galleryImagePaths" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "sampleType" TEXT,
  "resultsTimeline" TEXT,
  "heroButtonLabel" TEXT,
  "detailIntro" TEXT,
  "whatThisTestCovers" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "whyGetTested" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "extraSections" JSONB,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "legacyPath" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "HealthTest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HealthTest_countryId_slug_key" ON "HealthTest"("countryId", "slug");

ALTER TABLE "HealthTest"
ADD CONSTRAINT "HealthTest_countryId_fkey"
FOREIGN KEY ("countryId") REFERENCES "Country"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
