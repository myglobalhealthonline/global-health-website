-- Per-service SEO keyword targets (admin-set; emitted as <meta keywords>).
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "seoKeywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
