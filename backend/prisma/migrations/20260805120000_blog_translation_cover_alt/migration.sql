-- AlterTable
-- Per-locale alt text for a blog post's cover image. The image is shared
-- across every locale of an article (BlogPost.coverAssetId), but its
-- description is prose: a Czech reader should not get a Portuguese alt
-- string. Reads fall back to Asset.altText and then to the displayed title,
-- so existing rows keep working untouched.
--
-- Additive and nullable: no backfill, no default.
ALTER TABLE "BlogTranslation" ADD COLUMN     "coverImageAlt" TEXT;
