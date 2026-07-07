-- Per-doctor payout amount on a service assignment. Additive + nullable, so
-- safe to apply to an existing table with data (no backfill, no lock beyond
-- the ADD COLUMN). Currency follows the parent Service.currencyCode.
-- IF NOT EXISTS: the column was applied out-of-band on the shared DB before
-- this migration was recorded, so `migrate deploy` must be a safe no-op here
-- (otherwise it errors "column already exists" and the server never boots).
ALTER TABLE "ServiceDoctor" ADD COLUMN IF NOT EXISTS "doctorAmountCents" INTEGER;
