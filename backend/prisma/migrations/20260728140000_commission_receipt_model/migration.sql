-- Commission billing model (introduced for Brazil).
--
-- In a commission market Global Health is an intermediary, not the provider: the
-- card is charged the full service price, but the fiscal document we issue is for
-- our intermediation commission only (price - doctor payout). The treating doctor
-- documents their own fee separately.
--
-- Country."commissionReceiptEnabled" is the single switch. Default false, so every
-- existing market keeps today's full-price receipt untouched.
--
-- The Order/OrderItem columns are SNAPSHOTS taken at checkout, deliberately frozen:
-- the payout statement resolves ServiceDoctor."doctorAmountCents" live, so editing a
-- payout there re-values past statements. A fiscal document must never move once
-- issued. Null = "not applicable" (pre-feature rows, non-commission markets), which
-- is NOT the same as zero.
--
-- IF NOT EXISTS throughout: patch scripts may add columns before this migration runs.

ALTER TABLE "Country"
  ADD COLUMN IF NOT EXISTS "commissionReceiptEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Per-unit copy of ServiceDoctor."doctorAmountCents" (or the insurance override).
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "doctorPayoutCents" INTEGER;
-- lineTotalCents - doctorPayoutCents * quantity, clamped at >= 0.
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "commissionCents" INTEGER;

-- Order rollups. Invariant when set:
--   commissionTotalCents + doctorPayoutTotalCents = totalCents
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "commissionTotalCents" INTEGER;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "doctorPayoutTotalCents" INTEGER;
