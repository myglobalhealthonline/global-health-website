-- Internal-linking callouts (ServiceLink) + SEO landing pages. Idempotent.

-- 1. ServiceLink type enum.
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ServiceLinkType') THEN
        CREATE TYPE "ServiceLinkType" AS ENUM ('UPGRADE', 'ENTRY', 'REFERRAL', 'COMPLEMENTARY');
    END IF;
END $$;

-- 2. ServiceLink.
CREATE TABLE IF NOT EXISTS "ServiceLink" (
    "id" TEXT NOT NULL,
    "sourceServiceId" TEXT NOT NULL,
    "targetServiceId" TEXT,
    "targetHref" TEXT,
    "type" "ServiceLinkType" NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "anchorSlot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceLink_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ServiceLink_sourceServiceId_isActive_priority_idx"
    ON "ServiceLink"("sourceServiceId", "isActive", "priority");

-- 3. ServiceLinkTranslation.
CREATE TABLE IF NOT EXISTS "ServiceLinkTranslation" (
    "id" TEXT NOT NULL,
    "serviceLinkId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "heading" TEXT NOT NULL,
    "body" TEXT,
    "ctaLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceLinkTranslation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ServiceLinkTranslation_serviceLinkId_locale_key"
    ON "ServiceLinkTranslation"("serviceLinkId", "locale");

-- 4. SeoLandingPage.
CREATE TABLE IF NOT EXISTS "SeoLandingPage" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoLandingPage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SeoLandingPage_countryId_slug_key"
    ON "SeoLandingPage"("countryId", "slug");
CREATE INDEX IF NOT EXISTS "SeoLandingPage_countryId_isPublished_idx"
    ON "SeoLandingPage"("countryId", "isPublished");

-- 5. SeoLandingPageTranslation.
CREATE TABLE IF NOT EXISTS "SeoLandingPageTranslation" (
    "id" TEXT NOT NULL,
    "landingPageId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "title" TEXT NOT NULL,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "bodyHtml" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoLandingPageTranslation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SeoLandingPageTranslation_landingPageId_locale_key"
    ON "SeoLandingPageTranslation"("landingPageId", "locale");

-- 6. Foreign keys (guarded).
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ServiceLink_sourceServiceId_fkey') THEN
        ALTER TABLE "ServiceLink" ADD CONSTRAINT "ServiceLink_sourceServiceId_fkey"
            FOREIGN KEY ("sourceServiceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ServiceLink_targetServiceId_fkey') THEN
        ALTER TABLE "ServiceLink" ADD CONSTRAINT "ServiceLink_targetServiceId_fkey"
            FOREIGN KEY ("targetServiceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ServiceLinkTranslation_serviceLinkId_fkey') THEN
        ALTER TABLE "ServiceLinkTranslation" ADD CONSTRAINT "ServiceLinkTranslation_serviceLinkId_fkey"
            FOREIGN KEY ("serviceLinkId") REFERENCES "ServiceLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SeoLandingPage_countryId_fkey') THEN
        ALTER TABLE "SeoLandingPage" ADD CONSTRAINT "SeoLandingPage_countryId_fkey"
            FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SeoLandingPageTranslation_landingPageId_fkey') THEN
        ALTER TABLE "SeoLandingPageTranslation" ADD CONSTRAINT "SeoLandingPageTranslation_landingPageId_fkey"
            FOREIGN KEY ("landingPageId") REFERENCES "SeoLandingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
