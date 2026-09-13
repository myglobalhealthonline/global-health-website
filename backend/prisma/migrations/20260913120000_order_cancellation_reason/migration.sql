-- Free-text reason an admin gives when manually cancelling an order via the
-- Cancel button. Echoed into the patient + doctor cancellation notifications.
-- Null on orders cancelled by the unpaid-order sweep or any other automated
-- path — those keep their own fixed non-payment copy.
--
-- Idempotent: safe to re-apply via `prisma migrate deploy`.

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;
