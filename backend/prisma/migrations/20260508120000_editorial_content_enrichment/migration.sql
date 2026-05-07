ALTER TABLE "Doctor"
ADD COLUMN "seoTitle" TEXT,
ADD COLUMN "seoDescription" TEXT,
ADD COLUMN "editorialChecklist" JSONB;

ALTER TABLE "Service"
ADD COLUMN "seoTitle" TEXT,
ADD COLUMN "seoDescription" TEXT,
ADD COLUMN "editorialChecklist" JSONB;

ALTER TABLE "BlogPost"
ADD COLUMN "reviewerDisplayName" TEXT,
ADD COLUMN "lastReviewedAt" TIMESTAMP(3),
ADD COLUMN "editorialChecklist" JSONB;

ALTER TABLE "ContentPage"
ADD COLUMN "editorialChecklist" JSONB;
