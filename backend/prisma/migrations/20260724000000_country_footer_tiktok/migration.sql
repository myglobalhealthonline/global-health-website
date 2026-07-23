-- Add TikTok URL to the per-country footer social ribbon.
-- IF NOT EXISTS: patch scripts may add the column before this migration runs.
ALTER TABLE "CountryFooter" ADD COLUMN IF NOT EXISTS "tiktokUrl" TEXT;
