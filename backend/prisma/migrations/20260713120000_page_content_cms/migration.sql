-- CreateTable
CREATE TABLE "PageContent" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "pageKey" "PageKey" NOT NULL,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "heroImagePath" TEXT,
    "ogImagePath" TEXT,
    "ctaHref" TEXT,
    "showIntro" BOOLEAN NOT NULL DEFAULT false,
    "showWhoFor" BOOLEAN NOT NULL DEFAULT false,
    "showWhyChoose" BOOLEAN NOT NULL DEFAULT false,
    "showFaq" BOOLEAN NOT NULL DEFAULT false,
    "showDisclaimer" BOOLEAN NOT NULL DEFAULT false,
    "showBody" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageContentTranslation" (
    "id" TEXT NOT NULL,
    "pageContentId" TEXT NOT NULL,
    "locale" "LocaleCode" NOT NULL,
    "heroTitle" TEXT,
    "heroSubtitle" TEXT,
    "heroTitleLead" TEXT,
    "heroTitleAccent" TEXT,
    "ctaLabel" TEXT,
    "intro" TEXT,
    "whoForTitle" TEXT,
    "whoForIntro" TEXT,
    "whoForItems" JSONB,
    "whyChooseTitle" TEXT,
    "whyChooseItems" JSONB,
    "faq" JSONB,
    "disclaimerParagraphs" JSONB,
    "disclaimerShort" TEXT,
    "body" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageContentTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PageContent_countryId_pageKey_key" ON "PageContent"("countryId", "pageKey");

-- CreateIndex
CREATE UNIQUE INDEX "PageContentTranslation_pageContentId_locale_key" ON "PageContentTranslation"("pageContentId", "locale");

-- AddForeignKey
ALTER TABLE "PageContent" ADD CONSTRAINT "PageContent_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageContentTranslation" ADD CONSTRAINT "PageContentTranslation_pageContentId_fkey" FOREIGN KEY ("pageContentId") REFERENCES "PageContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
