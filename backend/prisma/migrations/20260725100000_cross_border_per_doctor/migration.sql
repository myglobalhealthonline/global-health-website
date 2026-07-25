-- Move cross-border prescription config off an inner ASYNC_PRESCRIPTION Service
-- and onto the prescribing doctor: per-doctor enable + price + payout. The
-- request snapshots the payout so the payout statement can value the async
-- consult without a ServiceDoctor row.
--
-- Additive + idempotent: safe to re-apply via `prisma migrate deploy`.

ALTER TABLE "Doctor"
  ADD COLUMN IF NOT EXISTS "crossBorderRxEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Doctor"
  ADD COLUMN IF NOT EXISTS "crossBorderRxPriceCents" INTEGER;
ALTER TABLE "Doctor"
  ADD COLUMN IF NOT EXISTS "crossBorderRxPayoutCents" INTEGER;

-- targetServiceId is no longer required (fee + payout live on the doctor).
-- DROP NOT NULL is idempotent — re-running on an already-nullable column is a
-- no-op that does not error.
ALTER TABLE "CrossBorderPrescriptionRequest"
  ALTER COLUMN "targetServiceId" DROP NOT NULL;
ALTER TABLE "CrossBorderPrescriptionRequest"
  ADD COLUMN IF NOT EXISTS "payoutCents" INTEGER;
