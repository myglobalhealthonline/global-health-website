-- Clinical review date on Service, for the public service page E-E-A-T byline
-- ("Last reviewed <date>"). Nullable, no backfill — admins set it going forward.
-- IF NOT EXISTS: patch scripts may add the column before this migration runs.
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "lastReviewedAt" TIMESTAMP(3);
