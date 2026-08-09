-- Clinical review date on Doctor, for the public doctor profile E-E-A-T byline
-- ("Last reviewed <date>"), mirroring Service.lastReviewedAt. Nullable, no
-- backfill — admins set it going forward.
ALTER TABLE "Doctor" ADD COLUMN IF NOT EXISTS "lastReviewedAt" TIMESTAMP(3);
