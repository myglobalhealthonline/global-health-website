-- Phase 1 ContentPage rebuild.
-- This migration tracks the changes that were applied via `prisma db push`
-- during Phase 1 development. Run `prisma migrate resolve --applied
-- 20260516120000_phase1_content_pages` on dev/staging DBs that already
-- received the push; run `prisma migrate deploy` on prod for a clean apply.

-- 1. New enum for page types.
CREATE TYPE "PageKey" AS ENUM (
  'HOME',
  'GENERAL_CONSULTATION',
  'SPECIALIST_CONSULTATION',
  'DOCTORS_INDEX'
);

-- 2. Drop the old unique constraint on (pageKey, locale, countryId) before
--    we change column types and replace it.
ALTER TABLE "ContentPage"
  DROP CONSTRAINT IF EXISTS "ContentPage_pageKey_locale_countryId_key";

-- 3. Drop the old Country FK so we can re-create it with ON DELETE CASCADE.
ALTER TABLE "ContentPage"
  DROP CONSTRAINT IF EXISTS "ContentPage_countryId_fkey";

-- 4. Remove any orphan rows that have NULL countryId — the new schema
--    requires the country relationship.
DELETE FROM "ContentPage" WHERE "countryId" IS NULL;

-- 5. Convert `pageKey` from String to the new PageKey enum. All real rows
--    already use the four canonical values; any stragglers would block this.
ALTER TABLE "ContentPage"
  ALTER COLUMN "pageKey" SET DATA TYPE "PageKey" USING "pageKey"::"PageKey";

-- 6. `countryId` becomes required.
ALTER TABLE "ContentPage" ALTER COLUMN "countryId" SET NOT NULL;

-- 7. New columns for hero + CTA + OG image (path + optional Asset FK).
ALTER TABLE "ContentPage"
  ADD COLUMN IF NOT EXISTS "heroTitle"        TEXT,
  ADD COLUMN IF NOT EXISTS "heroSubtitle"     TEXT,
  ADD COLUMN IF NOT EXISTS "heroImageAssetId" TEXT,
  ADD COLUMN IF NOT EXISTS "heroImagePath"    TEXT,
  ADD COLUMN IF NOT EXISTS "ctaLabel"         TEXT,
  ADD COLUMN IF NOT EXISTS "ctaHref"          TEXT,
  ADD COLUMN IF NOT EXISTS "ogImageAssetId"   TEXT,
  ADD COLUMN IF NOT EXISTS "ogImagePath"      TEXT;

-- 8. New canonical unique constraint.
ALTER TABLE "ContentPage"
  ADD CONSTRAINT "ContentPage_countryId_pageKey_locale_key"
    UNIQUE ("countryId", "pageKey", "locale");

-- 9. Re-create the Country FK with CASCADE.
ALTER TABLE "ContentPage"
  ADD CONSTRAINT "ContentPage_countryId_fkey"
    FOREIGN KEY ("countryId") REFERENCES "Country"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 10. New FKs to Asset for hero + og image references.
ALTER TABLE "ContentPage"
  ADD CONSTRAINT "ContentPage_heroImageAssetId_fkey"
    FOREIGN KEY ("heroImageAssetId") REFERENCES "Asset"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ContentPage"
  ADD CONSTRAINT "ContentPage_ogImageAssetId_fkey"
    FOREIGN KEY ("ogImageAssetId") REFERENCES "Asset"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
