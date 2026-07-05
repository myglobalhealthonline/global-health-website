-- CreateTable
CREATE TABLE "BlogTranslation" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT,
    "seoTitle" TEXT,
    "seoDesc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPostCountry" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogPostCountry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BlogTranslation_postId_idx" ON "BlogTranslation"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "BlogTranslation_postId_locale_key" ON "BlogTranslation"("postId", "locale");

-- CreateIndex
CREATE INDEX "BlogPostCountry_postId_idx" ON "BlogPostCountry"("postId");

-- CreateIndex
CREATE INDEX "BlogPostCountry_countryId_idx" ON "BlogPostCountry"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPostCountry_postId_countryId_key" ON "BlogPostCountry"("postId", "countryId");

-- AddForeignKey
ALTER TABLE "BlogTranslation" ADD CONSTRAINT "BlogTranslation_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPostCountry" ADD CONSTRAINT "BlogPostCountry_postId_fkey" FOREIGN KEY ("postId") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPostCountry" ADD CONSTRAINT "BlogPostCountry_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;
