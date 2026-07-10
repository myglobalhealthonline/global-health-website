-- S-009: stop storing capability-link tokens raw at rest. Both ShareLink
-- and ReviewInvite are low-volume, short-TTL tables (share links expire in
-- <=90 days, review invites in 14). Rather than a dual-column backfill
-- window, this backfills "tokenHash" in place from the existing "token"
-- column below, so links issued before this migration keep resolving.
-- Uses Postgres's built-in sha256(bytea) (no pgcrypto extension needed) so
-- the hash matches the Node `createHash("sha256").update(token).digest("hex")`
-- used to look it up, computed here for continuity of any live rows at
-- deploy time.

-- ShareLink
ALTER TABLE "ShareLink" ADD COLUMN "tokenHash" TEXT;
UPDATE "ShareLink" SET "tokenHash" = encode(sha256(convert_to("token", 'UTF8')), 'hex');
ALTER TABLE "ShareLink" ALTER COLUMN "tokenHash" SET NOT NULL;
ALTER TABLE "ShareLink" DROP COLUMN "token";
CREATE UNIQUE INDEX "ShareLink_tokenHash_key" ON "ShareLink"("tokenHash");

-- ReviewInvite
ALTER TABLE "ReviewInvite" ADD COLUMN "tokenHash" TEXT;
UPDATE "ReviewInvite" SET "tokenHash" = encode(sha256(convert_to("token", 'UTF8')), 'hex');
ALTER TABLE "ReviewInvite" ALTER COLUMN "tokenHash" SET NOT NULL;
ALTER TABLE "ReviewInvite" DROP COLUMN "token";
CREATE UNIQUE INDEX "ReviewInvite_tokenHash_key" ON "ReviewInvite"("tokenHash");
