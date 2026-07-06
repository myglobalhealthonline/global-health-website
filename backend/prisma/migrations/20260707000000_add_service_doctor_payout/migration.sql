-- Per-doctor payout amount on a service assignment. Additive + nullable, so
-- safe to apply to an existing table with data (no backfill, no lock beyond
-- the ADD COLUMN). Currency follows the parent Service.currencyCode.
ALTER TABLE "ServiceDoctor" ADD COLUMN "doctorAmountCents" INTEGER;
